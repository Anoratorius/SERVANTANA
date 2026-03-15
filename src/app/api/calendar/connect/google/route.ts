import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/calendar/google";
import { randomBytes } from "crypto";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate state token to prevent CSRF
    const state = `${session.user.id}:${randomBytes(16).toString("hex")}`;

    const authUrl = getGoogleAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Google auth:", error);
    return NextResponse.json(
      { error: "Failed to initiate Google calendar connection" },
      { status: 500 }
    );
  }
}
