/**
 * Database-Persisted Audit Logging
 * Tracks all security-relevant events for compliance and forensics
 */

import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export type AuditAction =
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "USER_ROLE_CHANGED"
  | "USER_SUSPENDED"
  | "USER_BANNED"
  | "USER_REACTIVATED"
  | "USER_LOCKED"
  | "USER_UNLOCKED"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGIN_NEW_DEVICE"
  | "LOGOUT"
  | "SESSION_REVOKED"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "EMAIL_VERIFICATION_SENT"
  | "EMAIL_VERIFIED"
  | "BOOKING_CREATED"
  | "BOOKING_CANCELLED"
  | "PAYMENT_COMPLETED"
  | "PAYMENT_FAILED"
  | "PAYMENT_REFUNDED"
  | "ADMIN_ACTION"
  | "SECURITY_VIOLATION"
  | "SUSPICIOUS_ACTIVITY"
  | "DOCUMENT_VERIFIED"
  | "DOCUMENT_REJECTED"
  | "DISPUTE_RESOLVED"
  | "DISPUTE_CLOSED"
  | "WORKER_FIRST_JOB_COMPLETED"
  | "WORKER_SUBSCRIPTION_PAID"
  | "WORKER_SUSPENDED_NONPAYMENT"
  | "WORKER_SUBSCRIPTION_EXPIRED";

export type AuditSeverity = "INFO" | "WARNING" | "CRITICAL";

interface AuditLogInput {
  action: AuditAction;
  actorId?: string;
  actorEmail?: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  country?: string;
  severity?: AuditSeverity;
}

// Sensitive keys to redact from logs
const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "key",
  "authorization",
  "cookie",
  "creditcard",
  "cvv",
  "ssn",
  "apikey",
];

/**
 * Redact sensitive data from audit log details
 */
function redactSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
      redacted[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      redacted[key] = redactSensitiveData(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Determine severity based on action type
 */
function getDefaultSeverity(action: AuditAction): AuditSeverity {
  const criticalActions: AuditAction[] = [
    "USER_DELETED",
    "USER_ROLE_CHANGED",
    "SECURITY_VIOLATION",
    "PAYMENT_REFUNDED",
    "SUSPICIOUS_ACTIVITY",
  ];

  const warningActions: AuditAction[] = [
    "LOGIN_FAILED",
    "USER_LOCKED",
    "LOGIN_NEW_DEVICE",
    "PASSWORD_RESET_REQUESTED",
    "PAYMENT_FAILED",
  ];

  if (criticalActions.includes(action)) return "CRITICAL";
  if (warningActions.includes(action)) return "WARNING";
  return "INFO";
}

/**
 * Write an audit log entry to the database
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const severity = input.severity || getDefaultSeverity(input.action);
    const details = input.details ? redactSensitiveData(input.details) : null;

    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId,
        actorEmail: input.actorEmail,
        targetId: input.targetId,
        targetType: input.targetType,
        details: details as Prisma.InputJsonValue | undefined,
        ip: input.ip,
        userAgent: input.userAgent?.substring(0, 500), // Limit length
        country: input.country,
        severity,
      },
    });

    // Log critical events to console as well
    if (severity === "CRITICAL") {
      console.warn(`[AUDIT CRITICAL] ${input.action}`, {
        actor: input.actorEmail || input.actorId,
        target: input.targetId,
        ip: input.ip,
      });
    }
  } catch (error) {
    // Never fail the main operation due to audit logging failure
    console.error("[AUDIT LOG ERROR]", error);
  }
}

/**
 * Query audit logs (admin only)
 */
export async function queryAuditLogs(options: {
  actorId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};

  if (options.actorId) where.actorId = options.actorId;
  if (options.action) where.action = options.action;
  if (options.severity) where.severity = options.severity;

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) (where.createdAt as Record<string, Date>).gte = options.startDate;
    if (options.endDate) (where.createdAt as Record<string, Date>).lte = options.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options.limit || 50,
      skip: options.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Get security summary for admin dashboard
 */
export async function getSecuritySummary(days: number = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [
    totalEvents,
    criticalEvents,
    failedLogins,
    newDeviceLogins,
    securityViolations,
    recentCritical,
  ] = await Promise.all([
    prisma.auditLog.count({
      where: { createdAt: { gte: since } },
    }),
    prisma.auditLog.count({
      where: { createdAt: { gte: since }, severity: "CRITICAL" },
    }),
    prisma.auditLog.count({
      where: { createdAt: { gte: since }, action: "LOGIN_FAILED" },
    }),
    prisma.auditLog.count({
      where: { createdAt: { gte: since }, action: "LOGIN_NEW_DEVICE" },
    }),
    prisma.auditLog.count({
      where: { createdAt: { gte: since }, action: "SECURITY_VIOLATION" },
    }),
    prisma.auditLog.findMany({
      where: { createdAt: { gte: since }, severity: "CRITICAL" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    period: `${days} days`,
    totalEvents,
    criticalEvents,
    failedLogins,
    newDeviceLogins,
    securityViolations,
    recentCritical,
  };
}
