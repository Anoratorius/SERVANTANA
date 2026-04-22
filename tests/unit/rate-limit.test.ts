import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the rate limiter module
const mockRateLimiters = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = mockRateLimiters.get(key);

  if (!entry || entry.resetTime < now) {
    mockRateLimiters.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetIn: entry.resetTime - now };
}

describe("Rate Limiter", () => {
  beforeEach(() => {
    mockRateLimiters.clear();
  });

  it("should allow requests within limit", () => {
    const key = "test-user-1";
    const limit = 5;
    const windowMs = 60000;

    for (let i = 0; i < limit; i++) {
      const result = checkRateLimit(key, limit, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit - i - 1);
    }
  });

  it("should block requests over limit", () => {
    const key = "test-user-2";
    const limit = 3;
    const windowMs = 60000;

    // Use up the limit
    for (let i = 0; i < limit; i++) {
      checkRateLimit(key, limit, windowMs);
    }

    // Next request should be blocked
    const result = checkRateLimit(key, limit, windowMs);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should track different keys separately", () => {
    const limit = 2;
    const windowMs = 60000;

    // User 1 uses their limit
    checkRateLimit("user-1", limit, windowMs);
    checkRateLimit("user-1", limit, windowMs);
    const user1Result = checkRateLimit("user-1", limit, windowMs);

    // User 2 should still have their limit
    const user2Result = checkRateLimit("user-2", limit, windowMs);

    expect(user1Result.allowed).toBe(false);
    expect(user2Result.allowed).toBe(true);
  });

  it("should reset after window expires", () => {
    const key = "test-user-3";
    const limit = 1;
    const windowMs = 100; // Short window for testing

    // Use the limit
    checkRateLimit(key, limit, windowMs);
    const blockedResult = checkRateLimit(key, limit, windowMs);
    expect(blockedResult.allowed).toBe(false);

    // Simulate time passing
    const entry = mockRateLimiters.get(key);
    if (entry) {
      entry.resetTime = Date.now() - 1; // Expired
    }

    // Should be allowed again
    const allowedResult = checkRateLimit(key, limit, windowMs);
    expect(allowedResult.allowed).toBe(true);
  });
});
