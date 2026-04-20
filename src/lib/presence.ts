/**
 * Presence System
 *
 * Tracks online status and typing indicators using Redis.
 * Falls back gracefully when Redis is unavailable.
 */

import { getRedisClient } from "./rate-limit";

// Redis keys
const PRESENCE_KEY_PREFIX = "presence:";
const TYPING_KEY_PREFIX = "typing:";

// TTLs
const PRESENCE_TTL_SECONDS = 60; // User is considered offline after 60s without heartbeat
const TYPING_TTL_SECONDS = 5; // Typing indicator expires after 5s

export interface PresenceData {
  userId: string;
  online: boolean;
  lastSeen: string;
}

export interface TypingData {
  userId: string;
  conversationId: string; // partnerId or bookingId
  isTyping: boolean;
}

// ============================================
// ONLINE PRESENCE
// ============================================

/**
 * Update user's presence (heartbeat)
 */
export async function updatePresence(userId: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const key = `${PRESENCE_KEY_PREFIX}${userId}`;
    await redis.set(key, new Date().toISOString(), { ex: PRESENCE_TTL_SECONDS });
    return true;
  } catch (error) {
    console.error("[PRESENCE] Update error:", error);
    return false;
  }
}

/**
 * Check if a user is online
 */
export async function isUserOnline(userId: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const key = `${PRESENCE_KEY_PREFIX}${userId}`;
    const lastSeen = await redis.get<string>(key);
    return lastSeen !== null;
  } catch (error) {
    console.error("[PRESENCE] Check error:", error);
    return false;
  }
}

/**
 * Get presence data for multiple users
 */
export async function getPresenceForUsers(
  userIds: string[]
): Promise<Map<string, PresenceData>> {
  const redis = getRedisClient();
  const result = new Map<string, PresenceData>();

  if (!redis || userIds.length === 0) {
    // Return all offline when Redis unavailable
    userIds.forEach((id) => {
      result.set(id, { userId: id, online: false, lastSeen: "" });
    });
    return result;
  }

  try {
    // Use pipeline for efficiency
    const pipeline = redis.pipeline();
    userIds.forEach((id) => {
      pipeline.get(`${PRESENCE_KEY_PREFIX}${id}`);
    });
    const responses = await pipeline.exec<(string | null)[]>();

    userIds.forEach((id, index) => {
      const lastSeen = responses[index];
      result.set(id, {
        userId: id,
        online: lastSeen !== null,
        lastSeen: lastSeen || "",
      });
    });

    return result;
  } catch (error) {
    console.error("[PRESENCE] Batch check error:", error);
    userIds.forEach((id) => {
      result.set(id, { userId: id, online: false, lastSeen: "" });
    });
    return result;
  }
}

/**
 * Remove user presence (logout)
 */
export async function removePresence(userId: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const key = `${PRESENCE_KEY_PREFIX}${userId}`;
    await redis.del(key);
    return true;
  } catch (error) {
    console.error("[PRESENCE] Remove error:", error);
    return false;
  }
}

// ============================================
// TYPING INDICATORS
// ============================================

/**
 * Set typing indicator
 */
export async function setTyping(
  userId: string,
  conversationId: string,
  isTyping: boolean
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const key = `${TYPING_KEY_PREFIX}${conversationId}:${userId}`;

    if (isTyping) {
      await redis.set(key, "1", { ex: TYPING_TTL_SECONDS });
    } else {
      await redis.del(key);
    }

    return true;
  } catch (error) {
    console.error("[TYPING] Set error:", error);
    return false;
  }
}

/**
 * Check if a user is typing in a conversation
 */
export async function isUserTyping(
  userId: string,
  conversationId: string
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const key = `${TYPING_KEY_PREFIX}${conversationId}:${userId}`;
    const typing = await redis.get(key);
    return typing !== null;
  } catch (error) {
    console.error("[TYPING] Check error:", error);
    return false;
  }
}

/**
 * Get all users typing in a conversation
 */
export async function getTypingUsers(conversationId: string): Promise<string[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    // Scan for typing keys in this conversation
    const pattern = `${TYPING_KEY_PREFIX}${conversationId}:*`;
    const keys = await redis.keys(pattern);

    // Extract user IDs from keys
    const prefix = `${TYPING_KEY_PREFIX}${conversationId}:`;
    return keys.map((key) => key.replace(prefix, ""));
  } catch (error) {
    console.error("[TYPING] Get users error:", error);
    return [];
  }
}

/**
 * Check if presence system is available
 */
export function isPresenceAvailable(): boolean {
  return getRedisClient() !== null;
}
