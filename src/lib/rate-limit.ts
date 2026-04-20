/**
 * Redis-backed rate limiter using Upstash
 * Provides distributed rate limiting that works across multiple Vercel function instances
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ============================================
// REDIS CLIENT
// ============================================

let redis: Redis | null = null;
let redisInitialized = false;

function getRedis(): Redis | null {
  if (redisInitialized) return redis;

  redisInitialized = true;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn("[RATE-LIMIT] Upstash Redis not configured - falling back to in-memory (not suitable for production)");
    return null;
  }

  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    return redis;
  } catch (error) {
    console.error("[RATE-LIMIT] Failed to initialize Redis:", error);
    return null;
  }
}

// Export for use in other modules (health check, IP blocking, etc.)
export function getRedisClient(): Redis | null {
  return getRedis();
}

// ============================================
// RATE LIMITERS (Redis-backed)
// ============================================

// Cache for Ratelimit instances (one per config)
const rateLimiterCache = new Map<string, Ratelimit>();

function createRateLimiter(config: RateLimitConfig, prefix: string): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cacheKey = `${prefix}:${config.maxRequests}:${config.windowMs}`;

  if (rateLimiterCache.has(cacheKey)) {
    return rateLimiterCache.get(cacheKey)!;
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs}ms`),
    prefix: `ratelimit:${prefix}`,
    analytics: true,
  });

  rateLimiterCache.set(cacheKey, limiter);
  return limiter;
}

// ============================================
// IN-MEMORY FALLBACK (for development/missing config)
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const inMemoryStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of inMemoryStore.entries()) {
      if (now > entry.resetTime) {
        inMemoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

function checkRateLimitInMemory(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = inMemoryStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    inMemoryStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count += 1;
  inMemoryStore.set(identifier, entry);

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

// ============================================
// PUBLIC INTERFACES
// ============================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

// ============================================
// MAIN RATE LIMIT FUNCTION
// ============================================

/**
 * Check if a request should be rate limited
 * Uses Redis when available, falls back to in-memory
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and remaining quota
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const limiter = createRateLimiter(config, "api");

  if (!limiter) {
    // Fallback to in-memory
    return checkRateLimitInMemory(identifier, config);
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      resetTime: result.reset,
    };
  } catch (error) {
    console.error("[RATE-LIMIT] Redis error, falling back to in-memory:", error);
    return checkRateLimitInMemory(identifier, config);
  }
}

/**
 * Synchronous rate limit check (in-memory only)
 * Use this only when async is not possible
 * @deprecated Prefer async checkRateLimit for production
 */
export function checkRateLimitSync(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return checkRateLimitInMemory(identifier, config);
}

// ============================================
// IP EXTRACTION
// ============================================

/**
 * Get client IP from request headers
 * SECURITY: On Vercel, ONLY trust x-vercel-forwarded-for - other headers can be spoofed
 */
export function getClientIP(request: Request): string {
  // Vercel-specific - MUST check first, cannot be spoofed on Vercel
  const vercelIP = request.headers.get("x-vercel-forwarded-for");
  if (vercelIP) {
    return vercelIP.split(",")[0].trim();
  }

  // Fallback for local development only
  if (process.env.NODE_ENV === "development") {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    const realIP = request.headers.get("x-real-ip");
    if (realIP) {
      return realIP;
    }
  }

  return "unknown";
}

// ============================================
// PRE-CONFIGURED RATE LIMITERS
// ============================================

export const rateLimiters = {
  // Authentication - strict limits
  login: { maxRequests: 5, windowMs: 60 * 1000 },           // 5 per minute
  register: { maxRequests: 3, windowMs: 60 * 60 * 1000 },   // 3 per hour
  forgotPassword: { maxRequests: 3, windowMs: 15 * 60 * 1000 }, // 3 per 15 min
  verifyEmail: { maxRequests: 5, windowMs: 15 * 60 * 1000 },    // 5 per 15 min
  resetPassword: { maxRequests: 3, windowMs: 15 * 60 * 1000 },  // 3 per 15 min

  // Bookings & Payments
  createBooking: { maxRequests: 10, windowMs: 60 * 1000 },  // 10 per minute
  payment: { maxRequests: 5, windowMs: 60 * 1000 },         // 5 per minute
  createDispute: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour

  // Messaging
  sendMessage: { maxRequests: 30, windowMs: 60 * 1000 },    // 30 per minute
  markRead: { maxRequests: 60, windowMs: 60 * 1000 },       // 60 per minute

  // Content creation
  createReview: { maxRequests: 5, windowMs: 60 * 60 * 1000 },  // 5 per hour
  suggestCategory: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  suggestProfession: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour

  // General operations
  standard: { maxRequests: 30, windowMs: 60 * 1000 },       // 30 per minute (writes)
  relaxed: { maxRequests: 100, windowMs: 60 * 1000 },       // 100 per minute (reads)
  search: { maxRequests: 30, windowMs: 60 * 1000 },         // 30 per minute

  // Admin - more lenient
  admin: { maxRequests: 60, windowMs: 60 * 1000 },          // 60 per minute

  // Legacy aliases
  strict: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
};

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Create rate limit error response
 */
export function rateLimitResponse(resetTime: number) {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
      },
    }
  );
}

/**
 * Apply rate limiting to a request (async version)
 * Returns null if allowed, or a 429 Response if rate limited
 */
export async function applyRateLimit(
  request: Request,
  limitType: keyof typeof rateLimiters,
  customKey?: string
): Promise<Response | null> {
  const ip = getClientIP(request);
  const key = customKey ? `${limitType}:${customKey}` : `${limitType}:${ip}`;
  const config = rateLimiters[limitType];
  const result = await checkRateLimit(key, config);

  if (!result.success) {
    return rateLimitResponse(result.resetTime);
  }

  return null;
}

/**
 * Apply rate limiting synchronously (in-memory only)
 * Use applyRateLimit for production - this is for compatibility
 * @deprecated Prefer async applyRateLimit
 */
export function applyRateLimitSync(
  request: Request,
  limitType: keyof typeof rateLimiters,
  customKey?: string
): Response | null {
  const ip = getClientIP(request);
  const key = customKey ? `${limitType}:${customKey}` : `${limitType}:${ip}`;
  const config = rateLimiters[limitType];
  const result = checkRateLimitSync(key, config);

  if (!result.success) {
    return rateLimitResponse(result.resetTime);
  }

  return null;
}

// ============================================
// BODY SIZE VALIDATION
// ============================================

/**
 * Check request body size limit
 * @param request - The incoming request
 * @param maxSizeBytes - Maximum allowed body size in bytes (default 1MB)
 * @returns null if valid, or error Response if exceeded
 */
export async function checkBodySize(
  request: Request,
  maxSizeBytes: number = 1024 * 1024 // 1MB default
): Promise<Response | null> {
  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > maxSizeBytes) {
      return new Response(
        JSON.stringify({
          error: "Request body too large",
          maxSize: `${Math.round(maxSizeBytes / 1024)}KB`,
        }),
        {
          status: 413,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  return null;
}
