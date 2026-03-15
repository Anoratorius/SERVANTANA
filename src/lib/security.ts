/**
 * Comprehensive Security Utilities
 * Production-grade security measures for Servantana
 */

// ============================================
// IP BLOCKING - Block IPs after repeated abuse
// ============================================

interface BlockedIP {
  blockedUntil: number;
  reason: string;
  violations: number;
}

const blockedIPs = new Map<string, BlockedIP>();
const ipViolations = new Map<string, { count: number; firstViolation: number }>();

const IP_VIOLATION_THRESHOLD = 20; // violations before blocking
const IP_VIOLATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const IP_BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hour block

/**
 * Record an IP violation (failed login, rate limit hit, etc.)
 */
export function recordIPViolation(ip: string, reason: string): void {
  if (ip === "unknown") return;

  const now = Date.now();
  const violations = ipViolations.get(ip);

  if (!violations || now - violations.firstViolation > IP_VIOLATION_WINDOW_MS) {
    ipViolations.set(ip, { count: 1, firstViolation: now });
    return;
  }

  violations.count += 1;
  ipViolations.set(ip, violations);

  // Block IP after threshold
  if (violations.count >= IP_VIOLATION_THRESHOLD) {
    blockedIPs.set(ip, {
      blockedUntil: now + IP_BLOCK_DURATION_MS,
      reason,
      violations: violations.count,
    });
    ipViolations.delete(ip);
    console.warn(`[SECURITY] IP blocked: ${ip} - Reason: ${reason}`);
  }
}

/**
 * Check if an IP is blocked
 */
export function isIPBlocked(ip: string): { blocked: boolean; reason?: string; until?: number } {
  const blocked = blockedIPs.get(ip);

  if (!blocked) {
    return { blocked: false };
  }

  if (Date.now() > blocked.blockedUntil) {
    blockedIPs.delete(ip);
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
export function checkIPBlock(ip: string): Response | null {
  const status = isIPBlocked(ip);

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

// Cleanup expired blocks periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of blockedIPs.entries()) {
    if (now > data.blockedUntil) {
      blockedIPs.delete(ip);
    }
  }
  for (const [ip, data] of ipViolations.entries()) {
    if (now - data.firstViolation > IP_VIOLATION_WINDOW_MS) {
      ipViolations.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes
