import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  createResetToken,
  sendResetEmail,
} from "@/lib/reset-code";
import {
  checkRateLimit,
  getClientIP,
  rateLimiters,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  checkIPBlock,
  recordIPViolation,
  randomDelay,
} from "@/lib/security";
import { writeAuditLog } from "@/lib/audit-log";

const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  // Check if IP is blocked
  const ipBlock = checkIPBlock(clientIP);
  if (ipBlock) return ipBlock;

  // Rate limiting: 5 requests per 15 minutes per IP (strict)
  const rateLimit = checkRateLimit(`forgot-password:${clientIP}`, rateLimiters.strict);

  if (!rateLimit.success) {
    recordIPViolation(clientIP, "Password reset rate limit exceeded");
    return rateLimitResponse(rateLimit.resetTime);
  }

  try {
    const body = await request.json();
    const validationResult = forgotPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, password: true },
    });

    // Always return success to prevent user enumeration
    // But only actually send code if user exists and has a password
    if (!user) {
      // Simulate delay to prevent timing attacks
      await randomDelay(300, 600);
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a reset code has been sent.",
      });
    }

    // Check if user has a password (OAuth users can't reset password)
    if (!user.password) {
      return NextResponse.json(
        {
          error: "This account uses social login. Please sign in with your social provider.",
        },
        { status: 400 }
      );
    }

    // Create reset token
    const normalizedEmail = email.toLowerCase();
    const { code } = await createResetToken(normalizedEmail, "email");

    // Send the code via email (non-blocking - don't wait for delivery)
    sendResetEmail(normalizedEmail, code).catch((err) => {
      console.error("Failed to send reset email:", err);
    });

    // Audit log (non-blocking)
    writeAuditLog({
      action: "PASSWORD_RESET_REQUESTED",
      actorId: user.id,
      actorEmail: email,
      ip: clientIP,
      userAgent: request.headers.get("user-agent") || undefined,
      details: { type: "email" },
    });

    // Respond immediately - email sends in background
    return NextResponse.json({
      success: true,
      message: `Reset code sent to ${normalizedEmail.split("@")[0][0]}***${normalizedEmail.split("@")[0].slice(-1)}@${normalizedEmail.split("@")[1]}`,
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
