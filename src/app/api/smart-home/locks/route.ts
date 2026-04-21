/**
 * Smart Home Locks API
 *
 * GET /api/smart-home/locks
 *
 * Returns all smart locks from all connected smart home providers
 * for the authenticated user.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSmartHomeProvider, SmartLock } from "@/lib/smart-home";
import { decrypt, encrypt } from "@/lib/encryption";
import { SmartHomeProvider, SmartHomeConnectionStatus } from "@prisma/client";

interface LockWithProvider extends SmartLock {
  provider: SmartHomeProvider;
  connectionId: string;
}

interface ConnectionLocks {
  provider: SmartHomeProvider;
  connectionId: string;
  accountEmail: string | null;
  status: SmartHomeConnectionStatus;
  locks: SmartLock[];
  error?: string;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all connected smart home accounts for the user
    const connections = await prisma.smartHomeConnection.findMany({
      where: {
        userId: session.user.id,
        status: {
          in: ["CONNECTED", "ERROR"], // Include errored connections to show status
        },
      },
      select: {
        id: true,
        provider: true,
        accountEmail: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
        status: true,
        lastSyncAt: true,
        errorMessage: true,
      },
    });

    if (connections.length === 0) {
      return NextResponse.json({
        connections: [],
        locks: [],
        message: "No smart home connections found. Connect a provider to see your locks.",
      });
    }

    const allLocks: LockWithProvider[] = [];
    const connectionResults: ConnectionLocks[] = [];

    // Fetch locks from each connected provider
    for (const connection of connections) {
      const connectionResult: ConnectionLocks = {
        provider: connection.provider,
        connectionId: connection.id,
        accountEmail: connection.accountEmail,
        status: connection.status,
        locks: [],
      };

      // Skip if connection is in error state
      if (connection.status === "ERROR") {
        connectionResult.error = connection.errorMessage || "Connection error";
        connectionResults.push(connectionResult);
        continue;
      }

      // Skip if no access token
      if (!connection.accessToken) {
        connectionResult.error = "No access token";
        connectionResult.status = "DISCONNECTED";
        connectionResults.push(connectionResult);
        continue;
      }

      try {
        const provider = getSmartHomeProvider(connection.provider);
        if (!provider) {
          connectionResult.error = "Provider not supported";
          connectionResults.push(connectionResult);
          continue;
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
            console.error(`Failed to refresh token for ${connection.provider}:`, refreshError);

            // Mark connection as expired
            await prisma.smartHomeConnection.update({
              where: { id: connection.id },
              data: {
                status: "EXPIRED",
                errorMessage: "Token refresh failed. Please reconnect.",
              },
            });

            connectionResult.error = "Token expired. Please reconnect.";
            connectionResult.status = "EXPIRED";
            connectionResults.push(connectionResult);
            continue;
          }
        }

        // Fetch locks from provider
        const locks = await provider.getLocks(accessToken);

        // Update last sync time
        await prisma.smartHomeConnection.update({
          where: { id: connection.id },
          data: {
            lastSyncAt: new Date(),
            status: "CONNECTED",
            errorMessage: null,
          },
        });

        connectionResult.locks = locks;
        connectionResults.push(connectionResult);

        // Add to all locks with provider info
        for (const lock of locks) {
          allLocks.push({
            ...lock,
            provider: connection.provider,
            connectionId: connection.id,
          });
        }
      } catch (providerError) {
        console.error(`Error fetching locks from ${connection.provider}:`, providerError);

        // Update connection status
        await prisma.smartHomeConnection.update({
          where: { id: connection.id },
          data: {
            status: "ERROR",
            errorMessage:
              providerError instanceof Error
                ? providerError.message
                : "Failed to fetch locks",
          },
        });

        connectionResult.error =
          providerError instanceof Error
            ? providerError.message
            : "Failed to fetch locks";
        connectionResult.status = "ERROR";
        connectionResults.push(connectionResult);
      }
    }

    return NextResponse.json({
      connections: connectionResults,
      locks: allLocks,
      totalLocks: allLocks.length,
    });
  } catch (error) {
    console.error("Error fetching smart locks:", error);
    return NextResponse.json(
      { error: "Failed to fetch smart locks" },
      { status: 500 }
    );
  }
}
