/**
 * Smart Home Integration - Types and Base Classes
 *
 * Shared types and base class for smart home providers.
 * Separated to avoid circular dependencies.
 */

import { SmartHomeProvider as SmartHomeProviderEnum } from "@prisma/client";

/**
 * Lock information returned from providers
 */
export interface SmartLock {
  id: string;
  name: string;
  deviceId: string;
  firmwareVersion?: string;
  batteryLevel?: number;
  isOnline: boolean;
  isLocked?: boolean;
  lastActivityAt?: Date;
}

/**
 * Result of an unlock operation
 */
export interface UnlockResult {
  success: boolean;
  lockId: string;
  error?: string;
  timestamp: Date;
}

/**
 * OAuth tokens from provider
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  accountEmail?: string;
}

/**
 * Smart Home Provider Interface
 * All smart home providers must implement this interface
 */
export interface SmartHomeProvider {
  /**
   * Provider identifier
   */
  readonly provider: SmartHomeProviderEnum;

  /**
   * Generate OAuth authorization URL for user to connect their account
   * @param state - CSRF protection state token
   * @param redirectUri - Callback URL after authorization
   */
  getAuthUrl(state: string, redirectUri: string): string;

  /**
   * Handle OAuth callback and exchange code for tokens
   * @param code - Authorization code from provider
   * @param redirectUri - Must match the one used in getAuthUrl
   */
  handleCallback(code: string, redirectUri: string): Promise<OAuthTokens>;

  /**
   * Refresh an expired access token
   * @param refreshToken - The refresh token to use
   */
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;

  /**
   * Get all locks associated with the connected account
   * @param accessToken - Valid access token
   */
  getLocks(accessToken: string): Promise<SmartLock[]>;

  /**
   * Get details of a specific lock
   * @param accessToken - Valid access token
   * @param lockId - The lock device ID
   */
  getLockDetails(accessToken: string, lockId: string): Promise<SmartLock | null>;

  /**
   * Trigger an unlock command
   * @param accessToken - Valid access token
   * @param lockId - The lock device ID
   */
  unlock(accessToken: string, lockId: string): Promise<UnlockResult>;

  /**
   * Trigger a lock command (optional - not all providers support remote lock)
   * @param accessToken - Valid access token
   * @param lockId - The lock device ID
   */
  lock?(accessToken: string, lockId: string): Promise<UnlockResult>;

  /**
   * Check if access token is expired and needs refresh
   * @param expiresAt - Token expiration date
   */
  isTokenExpired(expiresAt: Date): boolean;
}

/**
 * Base class with common functionality for smart home providers
 */
export abstract class BaseSmartHomeProvider implements SmartHomeProvider {
  abstract readonly provider: SmartHomeProviderEnum;

  abstract getAuthUrl(state: string, redirectUri: string): string;
  abstract handleCallback(code: string, redirectUri: string): Promise<OAuthTokens>;
  abstract refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;
  abstract getLocks(accessToken: string): Promise<SmartLock[]>;
  abstract getLockDetails(accessToken: string, lockId: string): Promise<SmartLock | null>;
  abstract unlock(accessToken: string, lockId: string): Promise<UnlockResult>;

  /**
   * Check if token is expired (with 5 minute buffer)
   */
  isTokenExpired(expiresAt: Date): boolean {
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    return new Date().getTime() >= expiresAt.getTime() - bufferMs;
  }
}
