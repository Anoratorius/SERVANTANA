import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  createResetToken,
  sendResetEmail,
  sendResetSMS,
} from "@/lib/reset-code";

const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  type: z.enum(["email", "phone"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = forgotPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { identifier, type } = validationResult.data;

    // Find user by email or phone
    let user;
    if (type === "email") {
      user = await prisma.user.findUnique({
        where: { email: identifier.toLowerCase() },
        select: { id: true, email: true, password: true },
      });
    } else {
      user = await prisma.user.findUnique({
        where: { phone: identifier },
        select: { id: true, phone: true, password: true },
      });
    }

    // Always return success to prevent user enumeration
    // But only actually send code if user exists and has a password
    if (!user) {
      // Simulate delay to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 500));
      return NextResponse.json({
        success: true,
        message:
          type === "email"
            ? "If an account exists with this email, a reset code has been sent."
            : "If an account exists with this phone number, a reset code has been sent.",
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
    const normalizedIdentifier =
      type === "email" ? identifier.toLowerCase() : identifier;
    const { code } = await createResetToken(normalizedIdentifier, type);

    // Send the code
    let result;
    if (type === "email") {
      result = await sendResetEmail(normalizedIdentifier, code);
    } else {
      result = await sendResetSMS(normalizedIdentifier, code);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to send reset code. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
