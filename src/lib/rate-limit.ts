/**
 * Simple in-memory rate limiter for API protection
 * For production with multiple instances, use Redis-based solution like @upstash/ratelimit
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store - cleared on server restart
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and remaining quota
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  // No existing entry or window expired - create new entry
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Within window - check count
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count += 1;
  rateLimitStore.set(key, entry);

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

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
  // These headers CAN be spoofed in production - only use for dev
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

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // Strict: 5 requests per 15 minutes (password reset, login)
  strict: { maxRequests: 5, windowMs: 15 * 60 * 1000 },

  // Auth: 10 requests per 15 minutes (registration)
  auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },

  // Standard: 30 requests per minute (general API)
  standard: { maxRequests: 30, windowMs: 60 * 1000 },

  // Relaxed: 100 requests per minute (read operations)
  relaxed: { maxRequests: 100, windowMs: 60 * 1000 },
};

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
