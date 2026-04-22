/**
 * Performance API
 * GET: Get worker performance scores
 * POST: Record web vitals metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkerPerformanceScore, getTopWorkers } from "@/lib/analytics";

// In-memory store for web vitals (in production, use Redis or database)
const webVitalsStore: {
  metrics: Array<{
    name: string;
    value: number;
    rating: string;
    timestamp: number;
  }>;
  lastCleanup: number;
} = {
  metrics: [],
  lastCleanup: Date.now(),
};

// Keep only last hour of metrics
function cleanupOldMetrics() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  if (webVitalsStore.lastCleanup < oneHourAgo) {
    webVitalsStore.metrics = webVitalsStore.metrics.filter(
      (m) => m.timestamp > oneHourAgo
    );
    webVitalsStore.lastCleanup = Date.now();
  }
}

/**
 * POST: Record web vitals metrics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { metrics } = body;

    if (!Array.isArray(metrics)) {
      return NextResponse.json({ error: "Invalid metrics format" }, { status: 400 });
    }

    // Clean up old metrics
    cleanupOldMetrics();

    // Store new metrics
    const timestamp = Date.now();
    for (const metric of metrics) {
      if (metric.name && typeof metric.value === "number") {
        webVitalsStore.metrics.push({
          name: metric.name,
          value: metric.value,
          rating: metric.rating || "unknown",
          timestamp,
        });
      }
    }

    // Limit total stored metrics
    if (webVitalsStore.metrics.length > 10000) {
      webVitalsStore.metrics = webVitalsStore.metrics.slice(-5000);
    }

    return NextResponse.json({ received: metrics.length });
  } catch (error) {
    console.error("Error recording web vitals:", error);
    return NextResponse.json({ error: "Failed to record metrics" }, { status: 500 });
  }
}

/**
 * Helper to get web vitals summary (for admin dashboard)
 */
export function getWebVitalsSummary() {
  cleanupOldMetrics();

  const summary: Record<string, { avg: number; count: number; good: number; poor: number }> = {};

  for (const metric of webVitalsStore.metrics) {
    if (!summary[metric.name]) {
      summary[metric.name] = { avg: 0, count: 0, good: 0, poor: 0 };
    }
    const s = summary[metric.name];
    s.count++;
    s.avg = (s.avg * (s.count - 1) + metric.value) / s.count;
    if (metric.rating === "good") s.good++;
    if (metric.rating === "poor") s.poor++;
  }

  return summary;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("workerId");
    const top = searchParams.get("top");

    // If requesting top workers, check admin access
    if (top) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      if (user?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only admins can view all worker rankings" },
          { status: 403 }
        );
      }

      const limit = parseInt(top, 10) || 10;
      const topWorkers = await getTopWorkers(Math.min(limit, 50));

      return NextResponse.json({
        workers: topWorkers,
        generatedAt: new Date().toISOString(),
      });
    }

    // If requesting specific worker, check authorization
    const targetWorkerId = workerId || session.user.id;

    // Workers can only see their own score, admins can see any
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (targetWorkerId !== session.user.id && user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You can only view your own performance score" },
        { status: 403 }
      );
    }

    const score = await getWorkerPerformanceScore(targetWorkerId);

    if (!score) {
      return NextResponse.json(
        { error: "Worker not found or has no performance data" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      performance: score,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting performance score:", error);
    return NextResponse.json(
      { error: "Failed to get performance score" },
      { status: 500 }
    );
  }
}
