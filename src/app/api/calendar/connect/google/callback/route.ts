import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleTokensFromCode, getGoogleCalendarClient, listGoogleCalendars } from "@/lib/calendar/google";

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
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        new URL("/dashboard/calendar?error=google_auth_failed", request.url)
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
    const tokens = await getGoogleTokensFromCode(code);

    // Get primary calendar
    const calendar = await getGoogleCalendarClient(tokens.accessToken, tokens.refreshToken);
    const calendars = await listGoogleCalendars(calendar);
    const primaryCalendar = calendars.find((c) => c.primary);

    // Upsert calendar connection
    await prisma.calendarConnection.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: "google",
        },
      },
      update: {
        email: tokens.email,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        calendarId: primaryCalendar?.id || "primary",
        syncEnabled: true,
      },
      create: {
        userId: session.user.id,
        provider: "google",
        email: tokens.email,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        calendarId: primaryCalendar?.id || "primary",
        syncEnabled: true,
      },
    });

    return NextResponse.redirect(
      new URL("/dashboard/calendar?success=google_connected", request.url)
    );
  } catch (error) {
    console.error("Error completing Google auth:", error);
    return NextResponse.redirect(
      new URL("/dashboard/calendar?error=google_auth_failed", request.url)
    );
  }
}
