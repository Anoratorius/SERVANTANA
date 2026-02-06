import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { verifyResetToken, markTokenUsed } from "@/lib/reset-code";

const resetPasswordSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  code: z.string().length(6, "Code must be 6 digits"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { identifier, code, password } = validationResult.data;

    // Normalize identifier
    const normalizedIdentifier = identifier.includes("@")
      ? identifier.toLowerCase()
      : identifier;

    // Verify the token is still valid
    const isValid = await verifyResetToken(normalizedIdentifier, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired code. Please request a new one." },
        { status: 400 }
      );
    }

    // Find the user
    const isEmail = normalizedIdentifier.includes("@");
    const user = await prisma.user.findUnique({
      where: isEmail
        ? { email: normalizedIdentifier }
        : { phone: normalizedIdentifier },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update the user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Mark the token as used
    await markTokenUsed(normalizedIdentifier, code);

    // Delete all other unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: {
        identifier: normalizedIdentifier,
        used: false,
      },
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
