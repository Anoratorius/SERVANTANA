import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyResetToken } from "@/lib/reset-code";

const verifyCodeSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export async function POST(request: NextRequest) {
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

    const isValid = await verifyResetToken(normalizedIdentifier, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired code. Please request a new one." },
        { status: 400 }
      );
    }

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
