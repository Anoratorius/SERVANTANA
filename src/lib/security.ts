/**
 * Comprehensive Security Utilities
 * Production-grade security measures for Servantana
 * Uses Redis for distributed IP blocking across Vercel function instances
 */

import { getRedisClient } from "./rate-limit";

// ============================================
// IP BLOCKING - Block IPs after repeated abuse
// ============================================

const IP_VIOLATION_THRESHOLD = 20; // violations before blocking
const IP_VIOLATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const IP_BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hour block

// In-memory fallback (for when Redis is unavailable)
interface BlockedIP {
  blockedUntil: number;
  reason: string;
  violations: number;
}

const blockedIPsFallback = new Map<string, BlockedIP>();
const ipViolationsFallback = new Map<string, { count: number; firstViolation: number }>();

/**
 * Record an IP violation (failed login, rate limit hit, etc.)
 * Uses Redis when available, falls back to in-memory
 */
export async function recordIPViolation(ip: string, reason: string): Promise<void> {
  if (ip === "unknown") return;

  const redis = getRedisClient();

  if (!redis) {
    // Fallback to in-memory
    recordIPViolationInMemory(ip, reason);
    return;
  }

  try {
    const violationKey = `ip:violations:${ip}`;
    const blockKey = `ip:blocked:${ip}`;

    // Increment violation count
    const count = await redis.incr(violationKey);

    // Set expiry on first violation
    if (count === 1) {
      await redis.expire(violationKey, Math.ceil(IP_VIOLATION_WINDOW_MS / 1000));
    }

    // Block IP after threshold
    if (count >= IP_VIOLATION_THRESHOLD) {
      const blockData = {
        blockedUntil: Date.now() + IP_BLOCK_DURATION_MS,
        reason,
        violations: count,
      };

      await redis.set(blockKey, JSON.stringify(blockData), {
        px: IP_BLOCK_DURATION_MS,
      });

      // Clear violations after blocking
      await redis.del(violationKey);

      console.warn(`[SECURITY] IP blocked: ${ip} - Reason: ${reason} - Violations: ${count}`);
    }
  } catch (error) {
    console.error("[SECURITY] Redis error recording violation:", error);
    // Fallback to in-memory
    recordIPViolationInMemory(ip, reason);
  }
}

/**
 * In-memory fallback for IP violation recording
 */
function recordIPViolationInMemory(ip: string, reason: string): void {
  const now = Date.now();
  const violations = ipViolationsFallback.get(ip);

  if (!violations || now - violations.firstViolation > IP_VIOLATION_WINDOW_MS) {
    ipViolationsFallback.set(ip, { count: 1, firstViolation: now });
    return;
  }

  violations.count += 1;
  ipViolationsFallback.set(ip, violations);

  // Block IP after threshold
  if (violations.count >= IP_VIOLATION_THRESHOLD) {
    blockedIPsFallback.set(ip, {
      blockedUntil: now + IP_BLOCK_DURATION_MS,
      reason,
      violations: violations.count,
    });
    ipViolationsFallback.delete(ip);
    console.warn(`[SECURITY] IP blocked (in-memory): ${ip} - Reason: ${reason}`);
  }
}

/**
 * Check if an IP is blocked
 * Uses Redis when available, falls back to in-memory
 */
export async function isIPBlocked(ip: string): Promise<{ blocked: boolean; reason?: string; until?: number }> {
  const redis = getRedisClient();

  if (!redis) {
    // Fallback to in-memory
    return isIPBlockedInMemory(ip);
  }

  try {
    const blockKey = `ip:blocked:${ip}`;
    const data = await redis.get(blockKey);

    if (!data) {
      return { blocked: false };
    }

    const blockInfo = JSON.parse(data as string) as BlockedIP;

    // Double-check expiry (Redis TTL should handle this, but be safe)
    if (Date.now() > blockInfo.blockedUntil) {
      await redis.del(blockKey);
      return { blocked: false };
    }

    return {
      blocked: true,
      reason: blockInfo.reason,
      until: blockInfo.blockedUntil,
    };
  } catch (error) {
    console.error("[SECURITY] Redis error checking block:", error);
    // Fallback to in-memory
    return isIPBlockedInMemory(ip);
  }
}

/**
 * In-memory fallback for IP block checking
 */
function isIPBlockedInMemory(ip: string): { blocked: boolean; reason?: string; until?: number } {
  const blocked = blockedIPsFallback.get(ip);

  if (!blocked) {
    return { blocked: false };
  }

  if (Date.now() > blocked.blockedUntil) {
    blockedIPsFallback.delete(ip);
    return { blocked: false };
  }

  return {
    blocked: true,
    reason: blocked.reason,
    until: blocked.blockedUntil,
  };
}

/**
 * Middleware-style IP check that returns a Response if blocked
 */
export async function checkIPBlock(ip: string): Promise<Response | null> {
  const status = await isIPBlocked(ip);

  if (status.blocked) {
    return new Response(
      JSON.stringify({
        error: "Access denied",
        reason: "Your IP has been temporarily blocked due to suspicious activity",
        blockedUntil: new Date(status.until!).toISOString(),
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return null;
}

/**
 * Manually block an IP (for admin use)
 */
export async function blockIP(ip: string, reason: string, durationMs?: number): Promise<void> {
  const duration = durationMs || IP_BLOCK_DURATION_MS;
  const redis = getRedisClient();

  if (!redis) {
    blockedIPsFallback.set(ip, {
      blockedUntil: Date.now() + duration,
      reason,
      violations: 0,
    });
    return;
  }

  try {
    const blockData = {
      blockedUntil: Date.now() + duration,
      reason,
      violations: 0,
    };

    await redis.set(`ip:blocked:${ip}`, JSON.stringify(blockData), {
      px: duration,
    });

    console.warn(`[SECURITY] IP manually blocked: ${ip} - Reason: ${reason}`);
  } catch (error) {
    console.error("[SECURITY] Redis error blocking IP:", error);
    blockedIPsFallback.set(ip, {
      blockedUntil: Date.now() + duration,
      reason,
      violations: 0,
    });
  }
}

/**
 * Manually unblock an IP (for admin use)
 */
export async function unblockIP(ip: string): Promise<void> {
  const redis = getRedisClient();

  blockedIPsFallback.delete(ip);

  if (!redis) return;

  try {
    await redis.del(`ip:blocked:${ip}`);
    console.info(`[SECURITY] IP unblocked: ${ip}`);
  } catch (error) {
    console.error("[SECURITY] Redis error unblocking IP:", error);
  }
}

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize user input to prevent XSS
 * Escapes HTML special characters
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitize object values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeInput(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? sanitizeInput(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Strip potentially dangerous characters from filenames
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .substring(0, 255);
}

// ============================================
// AUDIT LOGGING
// ============================================

export type AuditAction =
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "USER_ROLE_CHANGED"
  | "USER_LOCKED"
  | "USER_UNLOCKED"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "BOOKING_CREATED"
  | "BOOKING_CANCELLED"
  | "PAYMENT_COMPLETED"
  | "PAYMENT_REFUNDED"
  | "ADMIN_ACTION"
  | "SECURITY_VIOLATION";

interface AuditLogEntry {
  action: AuditAction;
  actorId?: string;
  actorEmail?: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

// In-memory audit log buffer (flush to database periodically in production)
const auditBuffer: AuditLogEntry[] = [];
const MAX_BUFFER_SIZE = 100;

/**
 * Log a security/audit event
 */
export function auditLog(entry: Omit<AuditLogEntry, "timestamp">): void {
  const logEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date(),
    // Redact sensitive data
    details: entry.details ? redactSensitiveData(entry.details) : undefined,
  };

  auditBuffer.push(logEntry);

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[AUDIT] ${logEntry.action}`, {
      actor: logEntry.actorEmail || logEntry.actorId,
      target: logEntry.targetId,
      ip: logEntry.ip,
    });
  }

  // Flush buffer if full
  if (auditBuffer.length >= MAX_BUFFER_SIZE) {
    flushAuditLog();
  }
}

/**
 * Flush audit log to persistent storage
 * In production, this should write to a database or external service
 */
export async function flushAuditLog(): Promise<void> {
  if (auditBuffer.length === 0) return;

  const entries = [...auditBuffer];
  auditBuffer.length = 0;

  // In production, persist to database
  // For now, just log critical events
  const criticalEvents = entries.filter((e) =>
    ["SECURITY_VIOLATION", "USER_DELETED", "USER_ROLE_CHANGED", "PAYMENT_REFUNDED"].includes(e.action)
  );

  if (criticalEvents.length > 0) {
    console.log(`[AUDIT FLUSH] ${entries.length} events, ${criticalEvents.length} critical`);
  }
}

/**
 * Redact sensitive data from audit logs
 */
function redactSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ["password", "token", "secret", "key", "authorization", "cookie", "creditCard"];
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      redacted[key] = "[REDACTED]";
    } else if (value && typeof value === "object") {
      redacted[key] = redactSensitiveData(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

// ============================================
// HONEYPOT PROTECTION
// ============================================

/**
 * Check if honeypot field was filled (indicates bot)
 * The honeypot field should be hidden via CSS and empty for real users
 */
export function checkHoneypot(value: string | undefined | null): boolean {
  // If honeypot has any value, it's likely a bot
  return !value || value.trim() === "";
}

/**
 * Generate honeypot field name (randomized to avoid detection)
 */
export function generateHoneypotFieldName(): string {
  const names = ["website", "url", "homepage", "company_url", "fax", "phone2"];
  return names[Math.floor(Math.random() * names.length)];
}

// ============================================
// SECURE ERROR RESPONSES
// ============================================

/**
 * Create a safe error response that doesn't leak sensitive information
 */
export function safeErrorResponse(
  error: unknown,
  fallbackMessage: string = "An error occurred"
): Response {
  // Log the actual error server-side
  console.error("[ERROR]", error);

  // Never expose internal errors to client
  const isProduction = process.env.NODE_ENV === "production";

  return new Response(
    JSON.stringify({
      error: isProduction ? fallbackMessage : String(error),
      ...(isProduction ? {} : { stack: error instanceof Error ? error.stack : undefined }),
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// ============================================
// TIMING ATTACK PREVENTION
// ============================================

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do comparison to maintain constant time
    // Use a dummy comparison to prevent timing attacks
    let dummy = 0;
    for (let i = 0; i < a.length; i++) {
      dummy |= a.charCodeAt(i) ^ b.charCodeAt(i % b.length);
    }
    // Prevent compiler from optimizing away the dummy computation
    return dummy !== dummy; // Always false, but uses dummy
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Add random delay to prevent timing attacks
 */
export async function randomDelay(minMs: number = 100, maxMs: number = 500): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

// ============================================
// REQUEST VALIDATION
// ============================================

/**
 * Validate request origin for CSRF protection
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin) {
    // Allow requests without origin (same-origin, non-browser)
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const expectedHost = host?.split(":")[0];
    return originUrl.hostname === expectedHost || originUrl.hostname === "localhost";
  } catch {
    return false;
  }
}

/**
 * Create CSRF validation error response
 */
export function csrfErrorResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Invalid request origin" }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// ============================================
// SECURE HEADERS HELPER
// ============================================

/**
 * Add security headers to a Response
 */
export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Cleanup expired blocks periodically (for in-memory fallback)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of blockedIPsFallback.entries()) {
      if (now > data.blockedUntil) {
        blockedIPsFallback.delete(ip);
      }
    }
    for (const [ip, data] of ipViolationsFallback.entries()) {
      if (now - data.firstViolation > IP_VIOLATION_WINDOW_MS) {
        ipViolationsFallback.delete(ip);
      }
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}
