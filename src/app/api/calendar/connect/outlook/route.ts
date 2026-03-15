import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOutlookAuthUrl } from "@/lib/calendar/outlook";
import { randomBytes } from "crypto";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate state token to prevent CSRF
    const state = `${session.user.id}:${randomBytes(16).toString("hex")}`;

    const authUrl = getOutlookAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Outlook auth:", error);
    return NextResponse.json(
      { error: "Failed to initiate Outlook calendar connection" },
      { status: 500 }
    );
  }
}
