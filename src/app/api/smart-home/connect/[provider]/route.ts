/**
 * Smart Home OAuth Initiation
 *
 * GET /api/smart-home/connect/[provider]
 *
 * Initiates OAuth flow for connecting a smart home provider.
 * Redirects user to the provider's authorization page.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSmartHomeProvider, parseProvider, isProviderSupported } from "@/lib/smart-home";
import { randomBytes } from "crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider: providerParam } = await params;

    // Parse and validate provider
    const providerType = parseProvider(providerParam);
    if (!providerType) {
      return NextResponse.json(
        { error: `Unknown smart home provider: ${providerParam}` },
        { status: 400 }
      );
    }

    if (!isProviderSupported(providerType)) {
      return NextResponse.json(
        { error: `Provider ${providerType} is not yet supported` },
        { status: 400 }
      );
    }

    // Get provider instance
    const provider = getSmartHomeProvider(providerType);
    if (!provider) {
      return NextResponse.json(
        { error: `Failed to initialize provider: ${providerType}` },
        { status: 500 }
      );
    }

    // Generate state token to prevent CSRF
    // Format: userId:randomToken
    const state = `${session.user.id}:${randomBytes(16).toString("hex")}`;

    // Build redirect URI
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/smart-home/connect/${providerParam.toLowerCase()}/callback`;

    // Get authorization URL
    const authUrl = provider.getAuthUrl(state, redirectUri);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating smart home OAuth:", error);

    // If error is about missing configuration, return a helpful message
    if (error instanceof Error && error.message.includes("not configured")) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to initiate smart home connection" },
      { status: 500 }
    );
  }
}
