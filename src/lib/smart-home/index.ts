/**
 * Smart Home Integration - Provider Abstraction Layer
 *
 * Provides a unified interface for various smart home providers
 * to manage smart locks and access control.
 */

import { SmartHomeProvider as SmartHomeProviderEnum } from "@prisma/client";
import { SmartHomeProvider as ISmartHomeProvider } from "./types";

// Re-export types from types.ts
export type {
  SmartLock,
  UnlockResult,
  OAuthTokens,
  SmartHomeProvider,
} from "./types";
export { BaseSmartHomeProvider } from "./types";

// Import provider implementations
import { NukiProvider } from "./nuki";
import { AugustProvider } from "./august";

/**
 * Provider instances (singletons)
 */
const providers: Partial<Record<SmartHomeProviderEnum, ISmartHomeProvider>> = {};

/**
 * Get a provider instance by type
 * @param providerType - The smart home provider type
 * @returns Provider instance or null if not supported
 */
export function getSmartHomeProvider(
  providerType: SmartHomeProviderEnum
): ISmartHomeProvider | null {
  // Return cached instance if available
  if (providers[providerType]) {
    return providers[providerType]!;
  }

  // Create new instance based on provider type
  let provider: ISmartHomeProvider | null = null;

  switch (providerType) {
    case "NUKI":
      provider = new NukiProvider();
      break;
    case "AUGUST":
      provider = new AugustProvider();
      break;
    // Add more providers as needed
    case "YALE_HOME":
    case "SCHLAGE_ENCODE":
    case "RING":
    case "NEST":
    case "SMARTTHINGS":
      // These providers are not yet implemented
      console.warn(`Smart home provider ${providerType} is not yet implemented`);
      return null;
    default:
      return null;
  }

  // Cache the instance
  if (provider) {
    providers[providerType] = provider;
  }

  return provider;
}

/**
 * Get list of supported providers
 */
export function getSupportedProviders(): SmartHomeProviderEnum[] {
  return ["NUKI", "AUGUST"];
}

/**
 * Check if a provider is supported
 */
export function isProviderSupported(providerType: SmartHomeProviderEnum): boolean {
  return getSupportedProviders().includes(providerType);
}

/**
 * Parse provider from string (case-insensitive)
 */
export function parseProvider(provider: string): SmartHomeProviderEnum | null {
  const normalized = provider.toUpperCase().replace(/-/g, "_");
  const validProviders: SmartHomeProviderEnum[] = [
    "AUGUST",
    "YALE_HOME",
    "NUKI",
    "SCHLAGE_ENCODE",
    "RING",
    "NEST",
    "SMARTTHINGS",
  ];

  if (validProviders.includes(normalized as SmartHomeProviderEnum)) {
    return normalized as SmartHomeProviderEnum;
  }

  return null;
}
