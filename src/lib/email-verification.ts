/**
 * Email Verification Service
 * Requires users to verify their email before full account access
 */

import { prisma } from "./prisma";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import { writeAuditLog } from "./audit-log";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Servantana <noreply@servantana.com>";
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// Token expiration: 24 hours
const TOKEN_EXPIRY_HOURS = 24;

/**
 * Generate a secure verification token
 */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create and send email verification
 */
export async function sendVerificationEmail(
  userId: string,
  email: string,
  firstName: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Delete any existing unused tokens for this user
    await prisma.emailVerificationToken.deleteMany({
      where: { userId, used: false },
    });

    // Generate new token
    const token = generateToken();
    const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Save token to database
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        expires,
      },
    });

    // Build verification URL
    const verificationUrl = `${APP_URL}/en/verify-email?token=${token}`;

    // Send email
    if (!process.env.RESEND_API_KEY) {
      console.log(`[DEV] Verification email for ${email}: ${verificationUrl}`);
      return { success: true, message: "Verification email sent (dev mode)" };
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Verify your Servantana email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://servantana.com/email-logo.png" alt="SERVANTANA" width="200" style="display: block; margin: 0 auto;" />
          </div>

          <h2 style="color: #333; margin-bottom: 20px;">Welcome, ${firstName}!</h2>

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Thank you for creating an account. Please verify your email address to complete your registration and access all features.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}"
               style="background: linear-gradient(to right, #2563eb, #16a34a); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>

          <p style="color: #888; font-size: 14px;">
            Or copy and paste this link into your browser:
            <br/>
            <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
          </p>

          <p style="color: #888; font-size: 14px; margin-top: 30px;">
            This link expires in ${TOKEN_EXPIRY_HOURS} hours. If you didn't create an account, please ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #aaa; font-size: 12px; text-align: center;">
            &copy; ${new Date().getFullYear()} Servantana. All rights reserved.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Failed to send verification email:", error);
      return { success: false, message: "Failed to send verification email" };
    }

    // Audit log
    await writeAuditLog({
      action: "EMAIL_VERIFICATION_SENT",
      actorId: userId,
      actorEmail: email,
      details: { expiresAt: expires.toISOString() },
    });

    return { success: true, message: "Verification email sent" };
  } catch (error) {
    console.error("Error sending verification email:", error);
    return { success: false, message: "Failed to send verification email" };
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(
  token: string,
  ip?: string
): Promise<{ success: boolean; message: string; userId?: string }> {
  try {
    // Find the token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!verificationToken) {
      return { success: false, message: "Invalid verification link" };
    }

    if (verificationToken.used) {
      return { success: false, message: "This link has already been used" };
    }

    if (new Date() > verificationToken.expires) {
      return { success: false, message: "This link has expired. Please request a new one." };
    }

    // Mark token as used and verify user email
    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: new Date() },
      }),
    ]);

    // Audit log
    await writeAuditLog({
      action: "EMAIL_VERIFIED",
      actorId: verificationToken.userId,
      actorEmail: verificationToken.user.email,
      ip,
    });

    return {
      success: true,
      message: "Email verified successfully",
      userId: verificationToken.userId,
    };
  } catch (error) {
    console.error("Error verifying email:", error);
    return { success: false, message: "Failed to verify email" };
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(
  userId: string,
  _ip?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, emailVerified: true },
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    if (user.emailVerified) {
      return { success: false, message: "Email is already verified" };
    }

    // Check rate limit: max 3 verification emails per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTokens = await prisma.emailVerificationToken.count({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentTokens >= 3) {
      return {
        success: false,
        message: "Too many verification emails sent. Please try again later.",
      };
    }

    return sendVerificationEmail(userId, user.email, user.firstName);
  } catch (error) {
    console.error("Error resending verification email:", error);
    return { success: false, message: "Failed to resend verification email" };
  }
}

/**
 * Check if user's email is verified
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  return user?.emailVerified !== null;
}
