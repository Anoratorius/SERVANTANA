/**
 * Session Management Service
 * Track active sessions, allow users to view and revoke them
 */

import { prisma } from "./prisma";
import { writeAuditLog } from "./audit-log";
import { createHash } from "crypto";

// Session expiry: 30 days for remember me, 1 day otherwise
const SESSION_EXPIRY_DAYS_REMEMBER = 30;
const SESSION_EXPIRY_DAYS_DEFAULT = 1;

/**
 * Hash a session token for storage (don't store raw tokens)
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Create a new session record
 */
export async function createSession(options: {
  userId: string;
  sessionToken: string;
  deviceId?: string;
  ip?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  rememberMe?: boolean;
}): Promise<string> {
  const expiryDays = options.rememberMe
    ? SESSION_EXPIRY_DAYS_REMEMBER
    : SESSION_EXPIRY_DAYS_DEFAULT;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const session = await prisma.userSession.create({
    data: {
      userId: options.userId,
      sessionToken: hashToken(options.sessionToken),
      deviceId: options.deviceId,
      ip: options.ip,
      userAgent: options.userAgent?.substring(0, 500),
      country: options.country,
      city: options.city,
      expiresAt,
    },
  });

  return session.id;
}

/**
 * Update session last active time
 */
export async function touchSession(sessionToken: string): Promise<void> {
  const hashedToken = hashToken(sessionToken);

  await prisma.userSession.updateMany({
    where: { sessionToken: hashedToken, isValid: true },
    data: { lastActiveAt: new Date() },
  });
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string) {
  const sessions = await prisma.userSession.findMany({
    where: {
      userId,
      isValid: true,
      expiresAt: { gt: new Date() },
    },
    include: {
      device: {
        select: {
          name: true,
          browser: true,
          os: true,
          deviceType: true,
          isTrusted: true,
        },
      },
    },
    orderBy: { lastActiveAt: "desc" },
  });

  return sessions.map((session) => ({
    id: session.id,
    ip: session.ip,
    userAgent: session.userAgent,
    country: session.country,
    city: session.city,
    lastActiveAt: session.lastActiveAt,
    createdAt: session.createdAt,
    device: session.device,
    // Don't expose the actual token
  }));
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  sessionId: string,
  userId: string,
  revokedByIp?: string
): Promise<boolean> {
  const session = await prisma.userSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    return false;
  }

  await prisma.userSession.update({
    where: { id: sessionId },
    data: { isValid: false },
  });

  // Audit log
  await writeAuditLog({
    action: "SESSION_REVOKED",
    actorId: userId,
    targetId: sessionId,
    targetType: "Session",
    ip: revokedByIp,
    details: {
      revokedSessionIp: session.ip,
      revokedSessionCreatedAt: session.createdAt,
    },
  });

  return true;
}

/**
 * Revoke all sessions for a user (except current)
 */
export async function revokeAllSessions(
  userId: string,
  exceptSessionToken?: string,
  revokedByIp?: string
): Promise<number> {
  const where: Record<string, unknown> = {
    userId,
    isValid: true,
  };

  if (exceptSessionToken) {
    where.sessionToken = { not: hashToken(exceptSessionToken) };
  }

  const result = await prisma.userSession.updateMany({
    where,
    data: { isValid: false },
  });

  // Audit log
  await writeAuditLog({
    action: "SESSION_REVOKED",
    actorId: userId,
    ip: revokedByIp,
    details: {
      action: "revoke_all",
      count: result.count,
      keptCurrentSession: !!exceptSessionToken,
    },
  });

  return result.count;
}

/**
 * Validate a session token
 */
export async function validateSession(sessionToken: string): Promise<{
  valid: boolean;
  userId?: string;
  sessionId?: string;
}> {
  const hashedToken = hashToken(sessionToken);

  const session = await prisma.userSession.findFirst({
    where: {
      sessionToken: hashedToken,
      isValid: true,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, userId: true },
  });

  if (!session) {
    return { valid: false };
  }

  return {
    valid: true,
    userId: session.userId,
    sessionId: session.id,
  };
}

/**
 * Cleanup expired sessions (run periodically via cron)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.userSession.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { isValid: false, lastActiveAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      ],
    },
  });

  return result.count;
}

/**
 * Get session count for a user
 */
export async function getActiveSessionCount(userId: string): Promise<number> {
  return prisma.userSession.count({
    where: {
      userId,
      isValid: true,
      expiresAt: { gt: new Date() },
    },
  });
}
