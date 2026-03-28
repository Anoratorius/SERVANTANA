import NextAuth, { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { checkRateLimit, rateLimiters } from "./rate-limit";
import { recordIPViolation, randomDelay } from "./security";
import { writeAuditLog } from "./audit-log";

// Track failed login attempts per email for account lockout
const failedLoginAttempts = new Map<string, { count: number; lockedUntil: number | null }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function trackFailedLogin(email: string, ip?: string): void {
  const attempts = failedLoginAttempts.get(email);
  const now = Date.now();

  // Record IP violation for security tracking
  if (ip) {
    recordIPViolation(ip, `Failed login for ${email}`);
  }

  // Audit log failed login (non-blocking database write)
  writeAuditLog({
    action: "LOGIN_FAILED",
    actorEmail: email,
    ip,
    details: { reason: "Invalid credentials" },
  });

  if (!attempts) {
    failedLoginAttempts.set(email, { count: 1, lockedUntil: null });
    return;
  }

  // Clear lockout if it has expired
  if (attempts.lockedUntil && now > attempts.lockedUntil) {
    failedLoginAttempts.set(email, { count: 1, lockedUntil: null });
    return;
  }

  attempts.count += 1;

  // Lock account after max attempts
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = now + LOCKOUT_DURATION_MS;
    writeAuditLog({
      action: "USER_LOCKED",
      actorEmail: email,
      ip,
      details: { reason: "Too many failed login attempts", lockDuration: LOCKOUT_DURATION_MS },
    });
  }

  failedLoginAttempts.set(email, attempts);
}

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days max (remember me)
  },
  pages: {
    signIn: "/login",
    newUser: "/signup",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).toLowerCase();

        // Check rate limit per email
        const rateLimit = checkRateLimit(`login:${email}`, rateLimiters.strict);
        if (!rateLimit.success) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        // Check for account lockout
        const attempts = failedLoginAttempts.get(email);
        if (attempts?.lockedUntil && Date.now() < attempts.lockedUntil) {
          const remainingMinutes = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
          throw new Error(`Account locked. Try again in ${remainingMinutes} minutes.`);
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          // Track failed attempt
          trackFailedLogin(email);
          // Add random delay to prevent timing attacks
          await randomDelay(200, 500);
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          // Track failed attempt
          trackFailedLogin(email);
          return null;
        }

        // Clear failed attempts on successful login
        failedLoginAttempts.delete(email);

        // Audit log successful login (non-blocking database write)
        writeAuditLog({
          action: "LOGIN_SUCCESS",
          actorId: user.id,
          actorEmail: user.email,
          details: { method: "credentials", emailVerified: !!user.emailVerified },
        });

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          image: user.avatar,
          emailVerified: user.emailVerified,
          rememberMe: credentials.rememberMe === "true",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: {
            id: true,
            role: true,
            firstName: true,
            lastName: true,
            tokenVersion: true,
            emailVerified: true,
            status: true,
            suspendedUntil: true,
            locationVerifiedAt: true,
            workerProfile: {
              select: { onboardingComplete: true }
            }
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.tokenVersion = dbUser.tokenVersion;
          token.isEmailVerified = !!dbUser.emailVerified;
          token.status = dbUser.status;
          token.suspendedUntil = dbUser.suspendedUntil?.toISOString() || null;
          token.locationVerified = !!dbUser.locationVerifiedAt;
          token.onboardingComplete = dbUser.workerProfile?.onboardingComplete ?? false;
        }

        // Check remember me preference on initial sign in
        if (trigger === "signIn") {
          // @ts-expect-error rememberMe is added in authorize
          const rememberMe = user.rememberMe === true;
          // Set expiration: 30 days if remember me, otherwise 1 day
          token.exp = Math.floor(Date.now() / 1000) + (rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60);
        }
      } else if (token.id) {
        // On subsequent requests, verify tokenVersion hasn't changed (password reset) and check status
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            firstName: true,
            lastName: true,
            role: true,
            tokenVersion: true,
            status: true,
            suspendedUntil: true,
            locationVerifiedAt: true,
            workerProfile: {
              select: { onboardingComplete: true }
            }
          },
        });

        if (!dbUser || dbUser.tokenVersion !== token.tokenVersion) {
          // Token version changed (password was reset) - invalidate session
          return {} as typeof token;
        }

        // Update token with latest user data
        token.firstName = dbUser.firstName;
        token.lastName = dbUser.lastName;
        token.role = dbUser.role;
        token.status = dbUser.status;
        token.suspendedUntil = dbUser.suspendedUntil?.toISOString() || null;
        token.locationVerified = !!dbUser.locationVerifiedAt;
        token.onboardingComplete = dbUser.workerProfile?.onboardingComplete ?? false;

        // If user is banned, invalidate session
        if (dbUser.status === "BANNED") {
          return {} as typeof token;
        }

        // If user is suspended and suspension hasn't expired, invalidate session
        if (dbUser.status === "SUSPENDED" && dbUser.suspendedUntil && new Date(dbUser.suspendedUntil) > new Date()) {
          return {} as typeof token;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.isEmailVerified = token.isEmailVerified as boolean;
      }
      return session;
    },
    async signIn() {
      return true;
    },
    async redirect({ url, baseUrl }) {
      // If the URL is relative (starts with /), ensure it has a locale prefix
      if (url.startsWith("/")) {
        // Check if it already has a locale prefix
        if (/^\/(en|de)(\/|$)/.test(url)) {
          return `${baseUrl}${url}`;
        }
        // Add default locale prefix
        return `${baseUrl}/en${url}`;
      }
      // If URL is absolute and same origin, return as-is
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default fallback
      return `${baseUrl}/en`;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);

// Extend the session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: string;
      firstName: string;
      lastName: string;
      isEmailVerified: boolean;
    };
  }
}
