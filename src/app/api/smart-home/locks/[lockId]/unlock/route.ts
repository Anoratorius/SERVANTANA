/**
 * Smart Lock Unlock API
 *
 * POST /api/smart-home/locks/[lockId]/unlock
 *
 * Triggers an unlock command for the specified smart lock.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSmartHomeProvider } from "@/lib/smart-home";
import { decrypt, encrypt } from "@/lib/encryption";
import { SmartHomeProvider } from "@prisma/client";

interface UnlockRequestBody {
  /**
   * The smart home provider for this lock
   */
  provider: SmartHomeProvider;

  /**
   * Optional: The connection ID if user has multiple connections
   */
  connectionId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lockId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lockId } = await params;

    if (!lockId) {
      return NextResponse.json(
        { error: "Lock ID is required" },
        { status: 400 }
      );
    }

    // Parse request body
    let body: UnlockRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { provider: providerType, connectionId } = body;

    if (!providerType) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    // Find the connection
    const connectionWhere = connectionId
      ? { id: connectionId, userId: session.user.id }
      : {
          userId: session.user.id,
          provider: providerType,
          status: "CONNECTED" as const,
        };

    const connection = await prisma.smartHomeConnection.findFirst({
      where: connectionWhere,
      select: {
        id: true,
        provider: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
        status: true,
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: "No connected smart home account found for this provider" },
        { status: 404 }
      );
    }

    if (connection.status !== "CONNECTED") {
      return NextResponse.json(
        {
          error: `Smart home connection is ${connection.status.toLowerCase()}. Please reconnect.`,
        },
        { status: 400 }
      );
    }

    if (!connection.accessToken) {
      return NextResponse.json(
        { error: "No access token available. Please reconnect your account." },
        { status: 400 }
      );
    }

    // Get provider instance
    const provider = getSmartHomeProvider(connection.provider);
    if (!provider) {
      return NextResponse.json(
        { error: `Provider ${connection.provider} is not supported` },
        { status: 400 }
      );
    }

    let accessToken = decrypt(connection.accessToken);

    // Check if token needs refresh
    if (
      connection.tokenExpiresAt &&
      provider.isTokenExpired(connection.tokenExpiresAt) &&
      connection.refreshToken
    ) {
      try {
        const refreshToken = decrypt(connection.refreshToken);
        const newTokens = await provider.refreshAccessToken(refreshToken);

        // Update tokens in database
        await prisma.smartHomeConnection.update({
          where: { id: connection.id },
          data: {
            accessToken: encrypt(newTokens.accessToken),
            refreshToken: newTokens.refreshToken
              ? encrypt(newTokens.refreshToken)
              : connection.refreshToken,
            tokenExpiresAt: newTokens.expiresAt,
            lastSyncAt: new Date(),
          },
        });

        accessToken = newTokens.accessToken;
      } catch (refreshError) {
        console.error("Failed to refresh token for unlock:", refreshError);

        // Mark connection as expired
        await prisma.smartHomeConnection.update({
          where: { id: connection.id },
          data: {
            status: "EXPIRED",
            errorMessage: "Token refresh failed. Please reconnect.",
          },
        });

        return NextResponse.json(
          { error: "Session expired. Please reconnect your smart home account." },
          { status: 401 }
        );
      }
    }

    // Execute unlock command
    const result = await provider.unlock(accessToken, lockId);

    // Log the unlock attempt (for audit purposes)
    console.log("Smart lock unlock attempt:", {
      userId: session.user.id,
      provider: connection.provider,
      lockId,
      success: result.success,
      timestamp: result.timestamp,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Unlock command failed",
          lockId: result.lockId,
          timestamp: result.timestamp,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      lockId: result.lockId,
      timestamp: result.timestamp,
      message: "Unlock command sent successfully",
    });
  } catch (error) {
    console.error("Error unlocking smart lock:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to unlock smart lock",
      },
      { status: 500 }
    );
  }
}
