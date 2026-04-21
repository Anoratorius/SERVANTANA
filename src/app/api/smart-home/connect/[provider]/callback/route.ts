/**
 * Smart Home OAuth Callback
 *
 * GET /api/smart-home/connect/[provider]/callback
 *
 * Handles OAuth callback from smart home providers.
 * Exchanges authorization code for tokens and stores the connection.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSmartHomeProvider, parseProvider } from "@/lib/smart-home";
import { encrypt } from "@/lib/encryption";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  // Destructure params at the top level so it's accessible in catch block
  const { provider: providerParam } = await params;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const { searchParams } = new URL(request.url);

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      console.error("Smart home OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/dashboard/properties?error=smart_home_auth_failed&message=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    // Validate authorization code
    if (!code) {
      return NextResponse.redirect(
        new URL("/dashboard/properties?error=no_auth_code", request.url)
      );
    }

    // Validate state (CSRF protection)
    if (!state || !state.startsWith(session.user.id)) {
      console.error("Invalid OAuth state:", { state, userId: session.user.id });
      return NextResponse.redirect(
        new URL("/dashboard/properties?error=invalid_state", request.url)
      );
    }

    // Parse and validate provider
    const providerType = parseProvider(providerParam);
    if (!providerType) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/properties?error=unknown_provider&provider=${providerParam}`,
          request.url
        )
      );
    }

    // Get provider instance
    const provider = getSmartHomeProvider(providerType);
    if (!provider) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/properties?error=provider_not_supported&provider=${providerType}`,
          request.url
        )
      );
    }

    // Build redirect URI (must match the one used in the initial request)
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/smart-home/connect/${providerParam.toLowerCase()}/callback`;

    // Exchange code for tokens
    const tokens = await provider.handleCallback(code, redirectUri);

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.accessToken);
    const encryptedRefreshToken = tokens.refreshToken
      ? encrypt(tokens.refreshToken)
      : null;

    // Upsert smart home connection
    await prisma.smartHomeConnection.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: providerType,
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        accountEmail: tokens.accountEmail,
        status: "CONNECTED",
        lastSyncAt: new Date(),
        errorMessage: null,
      },
      create: {
        userId: session.user.id,
        provider: providerType,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        accountEmail: tokens.accountEmail,
        status: "CONNECTED",
        lastSyncAt: new Date(),
      },
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL(
        `/dashboard/properties?success=smart_home_connected&provider=${providerType}`,
        request.url
      )
    );
  } catch (error) {
    console.error("Error completing smart home OAuth:", error);

    // Update connection status to error if possible
    try {
      const session = await auth();
      const providerType = parseProvider(providerParam);

      if (session?.user?.id && providerType) {
        await prisma.smartHomeConnection.upsert({
          where: {
            userId_provider: {
              userId: session.user.id,
              provider: providerType,
            },
          },
          update: {
            status: "ERROR",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
          create: {
            userId: session.user.id,
            provider: providerType,
            status: "ERROR",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    } catch (dbError) {
      console.error("Failed to update connection error status:", dbError);
    }

    return NextResponse.redirect(
      new URL(
        `/dashboard/properties?error=smart_home_auth_failed`,
        request.url
      )
    );
  }
}
