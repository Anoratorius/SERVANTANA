import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This endpoint should be called periodically (e.g., by a cron job)
// to release earnings that have passed their hold period
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret - required for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find all pending earnings that have passed their availableAt date
    const earningsToRelease = await prisma.earning.findMany({
      where: {
        status: "PENDING",
        availableAt: { lte: now },
      },
    });

    if (earningsToRelease.length === 0) {
      return NextResponse.json({
        message: "No earnings to release",
        released: 0,
      });
    }

    // Update earnings to AVAILABLE status
    const result = await prisma.earning.updateMany({
      where: {
        id: { in: earningsToRelease.map((e) => e.id) },
      },
      data: {
        status: "AVAILABLE",
      },
    });

    return NextResponse.json({
      message: "Earnings released successfully",
      released: result.count,
    });
  } catch (error) {
    console.error("Error releasing earnings:", error);
    return NextResponse.json(
      { error: "Failed to release earnings" },
      { status: 500 }
    );
  }
}
