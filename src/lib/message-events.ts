/**
 * Distributed Message Event System
 *
 * Uses Redis for distributed pub/sub across serverless instances.
 * Falls back to in-memory when Redis is not available.
 *
 * Events: 'new_message', 'message_read'
 */

import { getRedisClient } from "./rate-limit";

export type MessageEventType = 'new_message' | 'message_read';

export interface MessageEventData {
  type: MessageEventType;
  message: {
    id: string;
    content: string;
    createdAt: Date | string;
    senderId: string;
    receiverId: string;
    read: boolean;
    sender: {
      id: string;
      firstName: string;
      lastName: string;
      avatar: string | null;
      role?: string;
    };
    receiver: {
      id: string;
      firstName: string;
      lastName: string;
      avatar: string | null;
      role?: string;
    };
    booking?: {
      id: string;
      service: { name: string };
    } | null;
  };
  timestamp: number; // Unix timestamp for ordering
}

type EventCallback = (event: MessageEventData) => void;

// Redis key patterns
const REDIS_KEY_PREFIX = "msg_events:";
const EVENT_TTL_SECONDS = 300; // 5 minutes - events expire after this

/**
 * Get Redis key for user's event queue
 */
function getUserEventKey(userId: string): string {
  return `${REDIS_KEY_PREFIX}${userId}`;
}

/**
 * Push event to Redis for a user (distributed)
 * Events are stored in a sorted set with timestamp as score
 */
async function pushEventToRedis(
  userId: string,
  event: MessageEventData
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const key = getUserEventKey(userId);
    const eventJson = JSON.stringify(event);

    // Add to sorted set with timestamp as score
    await redis.zadd(key, {
      score: event.timestamp,
      member: eventJson,
    });

    // Set TTL on the key (refreshes on each add)
    await redis.expire(key, EVENT_TTL_SECONDS);

    return true;
  } catch (error) {
    console.error("[MESSAGE-EVENTS] Redis push error:", error);
    return false;
  }
}

/**
 * Fetch and remove events from Redis for a user since a given timestamp
 */
export async function fetchEventsFromRedis(
  userId: string,
  sinceTimestamp: number = 0
): Promise<MessageEventData[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    const key = getUserEventKey(userId);

    // Get events newer than sinceTimestamp using zrange with BYSCORE
    const events = await redis.zrange<string[]>(key, sinceTimestamp + 1, "+inf", {
      byScore: true,
    });

    if (!events || events.length === 0) return [];

    // Parse events
    const parsedEvents: MessageEventData[] = events
      .map((eventJson) => {
        try {
          return JSON.parse(eventJson) as MessageEventData;
        } catch {
          return null;
        }
      })
      .filter((e): e is MessageEventData => e !== null);

    // Clean up old events (older than 5 minutes)
    const cutoff = Date.now() - EVENT_TTL_SECONDS * 1000;
    await redis.zremrangebyscore(key, "-inf", cutoff);

    return parsedEvents;
  } catch (error) {
    console.error("[MESSAGE-EVENTS] Redis fetch error:", error);
    return [];
  }
}

// ============================================
// IN-MEMORY FALLBACK (for local development)
// ============================================

class MessageEventEmitter {
  private clients: Map<string, Set<EventCallback>>;

  constructor() {
    this.clients = new Map();
  }

  /**
   * Subscribe a client to receive message events for a specific user
   */
  subscribe(userId: string, callback: EventCallback): () => void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(callback);

    return () => {
      const callbacks = this.clients.get(userId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.clients.delete(userId);
        }
      }
    };
  }

  /**
   * Emit an event to all connected clients for a specific user (local only)
   */
  emit(userId: string, event: MessageEventData): void {
    const callbacks = this.clients.get(userId);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error('[MESSAGE-EVENTS] Callback error:', error);
        }
      });
    }
  }

  getClientCount(userId: string): number {
    return this.clients.get(userId)?.size || 0;
  }

  getTotalConnections(): number {
    let total = 0;
    this.clients.forEach((callbacks) => {
      total += callbacks.size;
    });
    return total;
  }
}

// Singleton in-memory emitter
export const messageEvents = new MessageEventEmitter();

/**
 * Emit a new message event (distributed via Redis + local fallback)
 */
export async function emitNewMessage(
  receiverId: string,
  message: MessageEventData['message']
): Promise<void> {
  const event: MessageEventData = {
    type: 'new_message',
    message,
    timestamp: Date.now(),
  };

  // Try Redis first (for distributed)
  const pushedToRedis = await pushEventToRedis(receiverId, event);

  // Also emit locally (for same-instance SSE connections)
  messageEvents.emit(receiverId, event);

  if (!pushedToRedis) {
    console.warn("[MESSAGE-EVENTS] Event only delivered locally (Redis unavailable)");
  }
}

/**
 * Emit a message read event (distributed via Redis + local fallback)
 */
export async function emitMessageRead(
  senderId: string,
  message: MessageEventData['message']
): Promise<void> {
  const event: MessageEventData = {
    type: 'message_read',
    message,
    timestamp: Date.now(),
  };

  // Try Redis first
  const pushedToRedis = await pushEventToRedis(senderId, event);

  // Also emit locally
  messageEvents.emit(senderId, event);

  if (!pushedToRedis) {
    console.warn("[MESSAGE-EVENTS] Event only delivered locally (Redis unavailable)");
  }
}

/**
 * Check if Redis-based distributed events are available
 */
export function isDistributedEventsAvailable(): boolean {
  return getRedisClient() !== null;
}
