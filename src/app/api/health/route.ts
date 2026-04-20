/**
 * Health Check Endpoint
 * Checks database, Redis, and overall API health
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedisClient } from "@/lib/rate-limit";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: CheckResult;
    redis: CheckResult;
    memory: MemoryInfo;
  };
  uptime: number;
}

interface CheckResult {
  status: "pass" | "fail";
  latency?: number;
  message?: string;
}

interface MemoryInfo {
  heapUsed: string;
  heapTotal: string;
  external: string;
  rss: string;
}

// Track server start time
const startTime = Date.now();

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: "pass",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: "fail",
      message: error instanceof Error ? error.message : "Database connection failed",
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<CheckResult> {
  const redis = getRedisClient();

  if (!redis) {
    return {
      status: "fail",
      message: "Redis not configured",
    };
  }

  const start = Date.now();
  try {
    await redis.ping();
    return {
      status: "pass",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: "fail",
      message: error instanceof Error ? error.message : "Redis connection failed",
    };
  }
}

/**
 * Get memory usage info
 */
function getMemoryInfo(): MemoryInfo {
  const mem = process.memoryUsage();
  const formatBytes = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;

  return {
    heapUsed: formatBytes(mem.heapUsed),
    heapTotal: formatBytes(mem.heapTotal),
    external: formatBytes(mem.external),
    rss: formatBytes(mem.rss),
  };
}

/**
 * Determine overall health status
 */
function determineOverallStatus(checks: HealthStatus["checks"]): HealthStatus["status"] {
  // Database is critical
  if (checks.database.status === "fail") {
    return "unhealthy";
  }

  // Redis failure is degraded (app can still function with in-memory fallback)
  if (checks.redis.status === "fail") {
    return "degraded";
  }

  return "healthy";
}

export async function GET() {
  const [databaseCheck, redisCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  const checks = {
    database: databaseCheck,
    redis: redisCheck,
    memory: getMemoryInfo(),
  };

  const health: HealthStatus = {
    status: determineOverallStatus(checks),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    checks,
    uptime: Math.floor((Date.now() - startTime) / 1000), // seconds
  };

  // Return appropriate status code
  const statusCode =
    health.status === "healthy" ? 200 :
    health.status === "degraded" ? 200 : // Still functional, just degraded
    503;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

/**
 * HEAD request for simple alive check (load balancers)
 */
export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
