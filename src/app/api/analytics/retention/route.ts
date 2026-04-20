/**
 * Customer Retention Analytics API
 * GET: Get retention metrics, CLV, and cohort analysis
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRetentionMetrics } from "@/lib/analytics";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access retention analytics
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can access retention analytics" },
        { status: 403 }
      );
    }

    const metrics = await getRetentionMetrics();

    return NextResponse.json({
      metrics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting retention metrics:", error);
    return NextResponse.json(
      { error: "Failed to get retention metrics" },
      { status: 500 }
    );
  }
}
