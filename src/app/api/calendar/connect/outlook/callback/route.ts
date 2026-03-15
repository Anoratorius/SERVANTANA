import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOutlookTokensFromCode } from "@/lib/calendar/outlook";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("Outlook OAuth error:", error);
      return NextResponse.redirect(
        new URL("/dashboard/calendar?error=outlook_auth_failed", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/dashboard/calendar?error=no_code", request.url)
      );
    }

    // Validate state
    if (!state || !state.startsWith(session.user.id)) {
      return NextResponse.redirect(
        new URL("/dashboard/calendar?error=invalid_state", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await getOutlookTokensFromCode(code);

    // Upsert calendar connection
    await prisma.calendarConnection.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: "outlook",
        },
      },
      update: {
        email: tokens.email,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        syncEnabled: true,
      },
      create: {
        userId: session.user.id,
        provider: "outlook",
        email: tokens.email,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        syncEnabled: true,
      },
    });

    return NextResponse.redirect(
      new URL("/dashboard/calendar?success=outlook_connected", request.url)
    );
  } catch (error) {
    console.error("Error completing Outlook auth:", error);
    return NextResponse.redirect(
      new URL("/dashboard/calendar?error=outlook_auth_failed", request.url)
    );
  }
}
