/**
 * Revenue Forecasting API
 * GET: Get revenue forecast and historical data
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRevenueForecast } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access revenue forecasting
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can access revenue analytics" },
        { status: 403 }
      );
    }

    // Get days parameter (default 90)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "90", 10);

    const forecast = await getRevenueForecast(Math.min(days, 365));

    return NextResponse.json(forecast);
  } catch (error) {
    console.error("Error getting revenue forecast:", error);
    return NextResponse.json(
      { error: "Failed to get revenue forecast" },
      { status: 500 }
    );
  }
}
