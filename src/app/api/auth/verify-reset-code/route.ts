import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyResetToken, invalidateToken } from "@/lib/reset-code";
import {
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  checkIPBlock,
  recordIPViolation,
} from "@/lib/security";
import { writeAuditLog } from "@/lib/audit-log";

const verifyCodeSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  code: z.string().length(6, "Code must be 6 digits"),
});

// Track failed verification attempts per identifier
const failedAttempts = new Map<string, { count: number; firstAttempt: number }>();

// Max attempts before token is invalidated
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  // Check if IP is blocked
  const ipBlock = checkIPBlock(clientIP);
  if (ipBlock) return ipBlock;

  // Rate limiting: 5 requests per minute per IP (very strict for code verification)
  const rateLimit = checkRateLimit(`verify-code:${clientIP}`, {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  });

  if (!rateLimit.success) {
    recordIPViolation(clientIP, "Verify code rate limit exceeded");
    return rateLimitResponse(rateLimit.resetTime);
  }

  try {
    const body = await request.json();
    const validationResult = verifyCodeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { identifier, code } = validationResult.data;

    // Normalize identifier (lowercase for email)
    const normalizedIdentifier = identifier.includes("@")
      ? identifier.toLowerCase()
      : identifier;

    // Check failed attempts for this identifier
    const attemptKey = `verify:${normalizedIdentifier}`;
    const attempts = failedAttempts.get(attemptKey);
    const now = Date.now();

    if (attempts) {
      // Clear old attempts
      if (now - attempts.firstAttempt > ATTEMPT_WINDOW_MS) {
        failedAttempts.delete(attemptKey);
      } else if (attempts.count >= MAX_ATTEMPTS) {
        // Too many failed attempts - invalidate the token
        await invalidateToken(normalizedIdentifier);
        failedAttempts.delete(attemptKey);

        // Security violation - audit log (database-persisted)
        await writeAuditLog({
          action: "SECURITY_VIOLATION",
          actorEmail: normalizedIdentifier,
          ip: clientIP,
          details: { reason: "Too many failed reset code attempts", attempts: attempts.count },
        });
        recordIPViolation(clientIP, "Brute force reset code attempt");

        return NextResponse.json(
          { error: "Too many failed attempts. Please request a new code." },
          { status: 400 }
        );
      }
    }

    const isValid = await verifyResetToken(normalizedIdentifier, code);

    if (!isValid) {
      // Track failed attempt
      const currentAttempts = failedAttempts.get(attemptKey);
      if (currentAttempts) {
        currentAttempts.count += 1;
        failedAttempts.set(attemptKey, currentAttempts);
      } else {
        failedAttempts.set(attemptKey, { count: 1, firstAttempt: now });
      }

      const remainingAttempts = MAX_ATTEMPTS - (failedAttempts.get(attemptKey)?.count || 0);

      return NextResponse.json(
        {
          error: "Invalid or expired code. Please request a new one.",
          remainingAttempts: Math.max(0, remainingAttempts),
        },
        { status: 400 }
      );
    }

    // Success - clear failed attempts
    failedAttempts.delete(attemptKey);

    return NextResponse.json({
      success: true,
      message: "Code verified successfully.",
    });
  } catch (error) {
    console.error("Error verifying reset code:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
