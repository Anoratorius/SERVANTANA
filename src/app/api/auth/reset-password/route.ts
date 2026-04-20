import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { verifyResetToken, markTokenUsed } from "@/lib/reset-code";
import {
  checkRateLimit,
  getClientIP,
  rateLimiters,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  checkIPBlock,
  recordIPViolation,
} from "@/lib/security";
import { writeAuditLog } from "@/lib/audit-log";

const resetPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
  code: z.string().length(3, "Code must be 3 digits"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  // Check if IP is blocked
  const ipBlock = await checkIPBlock(clientIP);
  if (ipBlock) return ipBlock;

  // Rate limiting: 5 requests per 15 minutes per IP
  const rateLimit = await checkRateLimit(`reset-password:${clientIP}`, rateLimiters.strict);

  if (!rateLimit.success) {
    await recordIPViolation(clientIP, "Password reset rate limit exceeded");
    return rateLimitResponse(rateLimit.resetTime);
  }

  try {
    const body = await request.json();
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, code, password } = validationResult.data;

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Verify the token is still valid
    const isValid = await verifyResetToken(normalizedEmail, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired code. Please request a new one." },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update the user's password and increment tokenVersion to invalidate all sessions
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        tokenVersion: { increment: 1 },
      },
    });

    // Mark the token as used
    await markTokenUsed(normalizedEmail, code);

    // Delete all other unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: {
        identifier: normalizedEmail,
        used: false,
      },
    });

    // Audit log (database-persisted)
    await writeAuditLog({
      action: "PASSWORD_RESET_COMPLETED",
      actorId: user.id,
      actorEmail: user.email,
      ip: clientIP,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
