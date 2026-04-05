import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDateRange, groupByDate, fillMissingDates } from "@/lib/analytics/calculations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "WORKER") {
      return NextResponse.json(
        { error: "Only workers can access this" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";

    const { start, end } = getDateRange(period);

    const earnings = await prisma.earning.findMany({
      where: {
        cleanerId: session.user.id,
        createdAt: { gte: start, lte: end },
      },
      include: {
        booking: {
          select: {
            scheduledDate: true,
            service: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Summary
    const summary = {
      totalGross: earnings.reduce((sum, e) => sum + e.grossAmount, 0),
      totalFees: earnings.reduce((sum, e) => sum + e.platformFee, 0),
      totalNet: earnings.reduce((sum, e) => sum + e.amount, 0),
      pending: earnings
        .filter((e) => e.status === "PENDING")
        .reduce((sum, e) => sum + e.amount, 0),
      available: earnings
        .filter((e) => e.status === "AVAILABLE")
        .reduce((sum, e) => sum + e.amount, 0),
      paidOut: earnings
        .filter((e) => e.status === "PAID_OUT")
        .reduce((sum, e) => sum + e.amount, 0),
    };

    // Daily trend
    const dailyTrend = fillMissingDates(
      groupByDate(
        earnings.map((e) => ({
          date: new Date(e.createdAt),
          value: e.amount,
        }))
      ),
      start,
      end
    );

    // By service
    const byService = new Map<string, { name: string; amount: number; count: number }>();
    for (const earning of earnings) {
      const name = earning.booking.service?.name || "Unknown";
      const existing = byService.get(name) || { name, amount: 0, count: 0 };
      existing.amount += earning.amount;
      existing.count++;
      byService.set(name, existing);
    }

    return NextResponse.json({
      summary,
      dailyTrend,
      byService: Array.from(byService.values()).sort((a, b) => b.amount - a.amount),
      recentEarnings: earnings.slice(0, 10).map((e) => ({
        id: e.id,
        date: e.createdAt,
        grossAmount: e.grossAmount,
        platformFee: e.platformFee,
        netAmount: e.amount,
        status: e.status,
        serviceName: e.booking.service?.name || "Unknown",
      })),
    });
  } catch (error) {
    console.error("Error fetching earnings analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings analytics" },
      { status: 500 }
    );
  }
}
