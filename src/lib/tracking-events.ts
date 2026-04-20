/**
 * Real-Time Tracking Event System
 *
 * Uses Redis for distributed tracking events across serverless instances.
 * Falls back to in-memory when Redis is not available.
 */

import { getRedisClient } from "./rate-limit";

export interface TrackingEventData {
  type: "location_update" | "tracking_started" | "tracking_stopped" | "arrived";
  bookingId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  estimatedArrival?: string | null;
  distanceKm?: number | null;
  timestamp: number;
}

type EventCallback = (event: TrackingEventData) => void;

// Redis key patterns
const REDIS_KEY_PREFIX = "tracking_events:";
const EVENT_TTL_SECONDS = 120; // 2 minutes - tracking events expire quickly

/**
 * Get Redis key for booking's tracking event queue
 */
function getTrackingEventKey(bookingId: string): string {
  return `${REDIS_KEY_PREFIX}${bookingId}`;
}

/**
 * Push tracking event to Redis (distributed)
 */
async function pushTrackingEventToRedis(
  bookingId: string,
  event: TrackingEventData
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const key = getTrackingEventKey(bookingId);
    const eventJson = JSON.stringify(event);

    // Add to sorted set with timestamp as score
    await redis.zadd(key, {
      score: event.timestamp,
      member: eventJson,
    });

    // Set TTL on the key
    await redis.expire(key, EVENT_TTL_SECONDS);

    return true;
  } catch (error) {
    console.error("[TRACKING-EVENTS] Redis push error:", error);
    return false;
  }
}

/**
 * Fetch tracking events from Redis since a given timestamp
 */
export async function fetchTrackingEventsFromRedis(
  bookingId: string,
  sinceTimestamp: number = 0
): Promise<TrackingEventData[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    const key = getTrackingEventKey(bookingId);

    // Get events newer than sinceTimestamp
    const events = await redis.zrange<string[]>(key, sinceTimestamp + 1, "+inf", {
      byScore: true,
    });

    if (!events || events.length === 0) return [];

    // Parse events
    const parsedEvents: TrackingEventData[] = events
      .map((eventJson) => {
        try {
          return JSON.parse(eventJson) as TrackingEventData;
        } catch {
          return null;
        }
      })
      .filter((e): e is TrackingEventData => e !== null);

    // Clean up old events
    const cutoff = Date.now() - EVENT_TTL_SECONDS * 1000;
    await redis.zremrangebyscore(key, "-inf", cutoff);

    return parsedEvents;
  } catch (error) {
    console.error("[TRACKING-EVENTS] Redis fetch error:", error);
    return [];
  }
}

// ============================================
// IN-MEMORY FALLBACK
// ============================================

class TrackingEventEmitter {
  private clients: Map<string, Set<EventCallback>>;

  constructor() {
    this.clients = new Map();
  }

  subscribe(bookingId: string, callback: EventCallback): () => void {
    if (!this.clients.has(bookingId)) {
      this.clients.set(bookingId, new Set());
    }
    this.clients.get(bookingId)!.add(callback);

    return () => {
      const callbacks = this.clients.get(bookingId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.clients.delete(bookingId);
        }
      }
    };
  }

  emit(bookingId: string, event: TrackingEventData): void {
    const callbacks = this.clients.get(bookingId);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error("[TRACKING-EVENTS] Callback error:", error);
        }
      });
    }
  }

  getClientCount(bookingId: string): number {
    return this.clients.get(bookingId)?.size || 0;
  }
}

// Singleton
export const trackingEvents = new TrackingEventEmitter();

/**
 * Emit a location update event
 */
export async function emitLocationUpdate(
  bookingId: string,
  location: { latitude: number; longitude: number },
  estimatedArrival?: Date | null,
  distanceKm?: number | null
): Promise<void> {
  const event: TrackingEventData = {
    type: "location_update",
    bookingId,
    location,
    estimatedArrival: estimatedArrival?.toISOString() || null,
    distanceKm: distanceKm || null,
    timestamp: Date.now(),
  };

  // Push to Redis for distributed delivery
  await pushTrackingEventToRedis(bookingId, event);

  // Also emit locally
  trackingEvents.emit(bookingId, event);
}

/**
 * Emit tracking started event
 */
export async function emitTrackingStarted(bookingId: string): Promise<void> {
  const event: TrackingEventData = {
    type: "tracking_started",
    bookingId,
    timestamp: Date.now(),
  };

  await pushTrackingEventToRedis(bookingId, event);
  trackingEvents.emit(bookingId, event);
}

/**
 * Emit tracking stopped event
 */
export async function emitTrackingStopped(bookingId: string): Promise<void> {
  const event: TrackingEventData = {
    type: "tracking_stopped",
    bookingId,
    timestamp: Date.now(),
  };

  await pushTrackingEventToRedis(bookingId, event);
  trackingEvents.emit(bookingId, event);
}

/**
 * Emit arrived event
 */
export async function emitArrived(bookingId: string): Promise<void> {
  const event: TrackingEventData = {
    type: "arrived",
    bookingId,
    timestamp: Date.now(),
  };

  await pushTrackingEventToRedis(bookingId, event);
  trackingEvents.emit(bookingId, event);
}

/**
 * Check if Redis-based distributed tracking is available
 */
export function isDistributedTrackingAvailable(): boolean {
  return getRedisClient() !== null;
}
