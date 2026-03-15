import { NextRequest, NextResponse } from "next/server";
import { verifyEmail, resendVerificationEmail } from "@/lib/email-verification";
import { auth } from "@/lib/auth";
import { getClientIP } from "@/lib/rate-limit";

// Verify email with token
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Verification token is required" },
      { status: 400 }
    );
  }

  const ip = getClientIP(request);
  const result = await verifyEmail(token, ip);

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: result.message,
  });
}

// Resend verification email
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIP(request);
  const result = await resendVerificationEmail(session.user.id, ip);

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: result.message,
  });
}
