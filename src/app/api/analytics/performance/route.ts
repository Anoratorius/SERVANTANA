/**
 * Worker Performance API
 * GET: Get worker performance scores
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkerPerformanceScore, getTopWorkers } from "@/lib/analytics";

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
