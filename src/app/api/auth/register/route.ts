import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getClientIP,
  rateLimiters,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  checkIPBlock,
  recordIPViolation,
  checkHoneypot,
} from "@/lib/security";
import { writeAuditLog } from "@/lib/audit-log";
import { sendVerificationEmail } from "@/lib/email-verification";

export async function POST(request: Request) {
  const clientIP = getClientIP(request);

  // Check if IP is blocked
  const ipBlock = await checkIPBlock(clientIP);
  if (ipBlock) return ipBlock;

  // Rate limiting: 3 registrations per hour per IP
  const rateLimit = await checkRateLimit(`register:${clientIP}`, rateLimiters.register);

  if (!rateLimit.success) {
    await recordIPViolation(clientIP, "Registration rate limit exceeded");
    return rateLimitResponse(rateLimit.resetTime);
  }

  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone, role, website } = body;

    // Honeypot check - if filled, silently reject (likely bot)
    if (!checkHoneypot(website)) {
      await recordIPViolation(clientIP, "Honeypot triggered on registration");
      // Return fake success to not tip off bots
      return NextResponse.json(
        { user: { id: "fake", email } },
        { status: 201 }
      );
    }

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 400 }
      );
    }

    // Check if phone number is already in use (if provided)
    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        return NextResponse.json(
          { error: "Phone number already in use" },
          { status: 400 }
        );
      }
    }

    // Hash password (cost 10 = secure + fast)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role: role === "WORKER" ? "WORKER" : "CUSTOMER",
      },
    });

    // If registering as worker, create worker profile
    if (role === "WORKER") {
      await prisma.workerProfile.create({
        data: {
          userId: user.id,
          hourlyRate: 25, // Default hourly rate
        },
      });
    }

    // Send verification email - must await on serverless to prevent early termination
    try {
      await sendVerificationEmail(user.id, user.email, user.firstName);
    } catch (err) {
      console.error("Failed to send verification email:", err);
    }

    // Audit log (non-blocking - less critical)
    writeAuditLog({
      action: "USER_CREATED",
      actorId: user.id,
      actorEmail: user.email,
      targetId: user.id,
      targetType: "User",
      details: { role: user.role },
      ip: clientIP,
      userAgent: request.headers.get("user-agent") || undefined,
    }).catch(() => {});

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: false,
        },
        message: "Account created. Please check your email to verify your account.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
