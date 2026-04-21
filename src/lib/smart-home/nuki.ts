/**
 * Nuki Smart Lock Integration
 *
 * Nuki is a European smart lock manufacturer with a Web API
 * for remote lock management and access control.
 *
 * API Documentation: https://api.nuki.io/
 */

import { SmartHomeProvider as SmartHomeProviderEnum } from "@prisma/client";
import {
  BaseSmartHomeProvider,
  SmartLock,
  UnlockResult,
  OAuthTokens,
} from "./types";

// Nuki API endpoints
const NUKI_API_BASE = "https://api.nuki.io";
const NUKI_AUTH_BASE = "https://api.nuki.io/oauth";

// Environment variables
const NUKI_CLIENT_ID = process.env.NUKI_CLIENT_ID;
const NUKI_CLIENT_SECRET = process.env.NUKI_CLIENT_SECRET;

/**
 * Nuki API response types
 */
interface NukiSmartlock {
  smartlockId: number;
  accountId: number;
  type: number; // 0=Nuki Smart Lock, 2=Opener, 3=Smart Door, 4=Smart Lock 3.0
  authId: number;
  name: string;
  lmType: number;
  firmware: string;
  hardwareRevision: string;
  serverState: number; // 0=ok, 1=unregistered, 2=auth uuid invalid, 3=auth invalid, 4=offline
  adminPinState: number;
  virtualDevice: boolean;
  creationDate: string;
  updateDate: string;
  state?: {
    mode: number;
    state: number; // Lock state: 1=locked, 2=unlocking, 3=unlocked, 4=locking, 5=unlatched, etc.
    trigger: number;
    lastAction: number;
    batteryCritical: boolean;
    batteryCharging: boolean;
    batteryChargeState: number; // 0-100
    doorsensorState: number;
    doorsensorBatteryCritical: boolean;
  };
}

interface NukiTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface NukiUnlockResponse {
  success: boolean;
  batteryCritical: boolean;
}

/**
 * Nuki Smart Lock Provider Implementation
 */
export class NukiProvider extends BaseSmartHomeProvider {
  readonly provider: SmartHomeProviderEnum = "NUKI";

  /**
   * Generate OAuth authorization URL for Nuki
   */
  getAuthUrl(state: string, redirectUri: string): string {
    if (!NUKI_CLIENT_ID) {
      throw new Error("NUKI_CLIENT_ID environment variable is not configured");
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: NUKI_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: "account notification smartlock smartlock.readOnly smartlock.action smartlock.auth smartlock.config smartlock.log",
      state,
    });

    return `${NUKI_AUTH_BASE}/authorize?${params.toString()}`;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string, redirectUri: string): Promise<OAuthTokens> {
    if (!NUKI_CLIENT_ID || !NUKI_CLIENT_SECRET) {
      throw new Error("Nuki OAuth credentials are not configured");
    }

    const response = await fetch(`${NUKI_AUTH_BASE}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: NUKI_CLIENT_ID,
        client_secret: NUKI_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Nuki token exchange failed:", error);
      throw new Error("Failed to exchange authorization code for tokens");
    }

    const data: NukiTokenResponse = await response.json();

    // Get account email
    const accountEmail = await this.getAccountEmail(data.access_token);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      accountEmail,
    };
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    if (!NUKI_CLIENT_ID || !NUKI_CLIENT_SECRET) {
      throw new Error("Nuki OAuth credentials are not configured");
    }

    const response = await fetch(`${NUKI_AUTH_BASE}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: NUKI_CLIENT_ID,
        client_secret: NUKI_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Nuki token refresh failed:", error);
      throw new Error("Failed to refresh access token");
    }

    const data: NukiTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  /**
   * Get account email from Nuki API
   */
  private async getAccountEmail(accessToken: string): Promise<string | undefined> {
    try {
      const response = await fetch(`${NUKI_API_BASE}/account`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.email;
      }
    } catch (error) {
      console.error("Failed to get Nuki account email:", error);
    }

    return undefined;
  }

  /**
   * Get all smart locks associated with the account
   */
  async getLocks(accessToken: string): Promise<SmartLock[]> {
    const response = await fetch(`${NUKI_API_BASE}/smartlock`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to fetch Nuki smart locks:", error);
      throw new Error("Failed to fetch smart locks");
    }

    const locks: NukiSmartlock[] = await response.json();

    return locks.map((lock) => this.mapNukiLockToSmartLock(lock));
  }

  /**
   * Get details of a specific lock
   */
  async getLockDetails(accessToken: string, lockId: string): Promise<SmartLock | null> {
    const response = await fetch(`${NUKI_API_BASE}/smartlock/${lockId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.text();
      console.error("Failed to fetch Nuki lock details:", error);
      throw new Error("Failed to fetch lock details");
    }

    const lock: NukiSmartlock = await response.json();

    return this.mapNukiLockToSmartLock(lock);
  }

  /**
   * Unlock a Nuki smart lock
   */
  async unlock(accessToken: string, lockId: string): Promise<UnlockResult> {
    // Nuki action codes:
    // 1 = unlock
    // 2 = lock
    // 3 = unlatch
    // 4 = lock 'n' go
    // 5 = lock 'n' go with unlatch
    const response = await fetch(`${NUKI_API_BASE}/smartlock/${lockId}/action/unlock`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to unlock Nuki lock:", error);
      return {
        success: false,
        lockId,
        error: `Unlock failed: ${error}`,
        timestamp: new Date(),
      };
    }

    // Nuki returns 204 No Content on success
    return {
      success: true,
      lockId,
      timestamp: new Date(),
    };
  }

  /**
   * Lock a Nuki smart lock
   */
  async lock(accessToken: string, lockId: string): Promise<UnlockResult> {
    const response = await fetch(`${NUKI_API_BASE}/smartlock/${lockId}/action/lock`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to lock Nuki lock:", error);
      return {
        success: false,
        lockId,
        error: `Lock failed: ${error}`,
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      lockId,
      timestamp: new Date(),
    };
  }

  /**
   * Map Nuki API response to our SmartLock interface
   */
  private mapNukiLockToSmartLock(lock: NukiSmartlock): SmartLock {
    const isOnline = lock.serverState === 0;
    const isLocked = lock.state?.state === 1;
    const batteryLevel = lock.state?.batteryChargeState;

    return {
      id: lock.smartlockId.toString(),
      name: lock.name,
      deviceId: lock.smartlockId.toString(),
      firmwareVersion: lock.firmware,
      batteryLevel,
      isOnline,
      isLocked,
      lastActivityAt: new Date(lock.updateDate),
    };
  }
}
