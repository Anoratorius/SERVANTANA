/**
 * Payment Analytics API
 * Provides payment statistics and analytics for admin dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface DateRange {
  start: Date;
  end: Date;
}

function getDateRange(period: string): DateRange {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;

  switch (period) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter":
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "all":
      start = new Date(2020, 0, 1); // Far enough back
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1); // Default to current month
  }

  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can access payment analytics" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";
    const { start, end } = getDateRange(period);

    // Run all queries in parallel
    const [
      totalPayments,
      successfulPayments,
      failedPayments,
      refundedPayments,
      paymentsByProvider,
      paymentsByStatus,
      revenueByDay,
      topWorkers,
      averageTransactionValue,
      currencyBreakdown,
    ] = await Promise.all([
      // Total payment count
      prisma.payment.count({
        where: {
          createdAt: { gte: start, lte: end },
        },
      }),

      // Successful payments with total amount
      prisma.payment.aggregate({
        where: {
          status: "SUCCEEDED",
          createdAt: { gte: start, lte: end },
        },
        _count: true,
        _sum: { amount: true, platformFee: true },
      }),

      // Failed payments
      prisma.payment.count({
        where: {
          status: "FAILED",
          createdAt: { gte: start, lte: end },
        },
      }),

      // Refunded payments with amount
      prisma.payment.aggregate({
        where: {
          status: "REFUNDED",
          createdAt: { gte: start, lte: end },
        },
        _count: true,
        _sum: { refundedAmount: true },
      }),

      // Payments grouped by provider
      prisma.payment.groupBy({
        by: ["provider"],
        where: {
          createdAt: { gte: start, lte: end },
        },
        _count: true,
        _sum: { amount: true },
      }),

      // Payments grouped by status
      prisma.payment.groupBy({
        by: ["status"],
        where: {
          createdAt: { gte: start, lte: end },
        },
        _count: true,
      }),

      // Revenue by day (last 30 days for chart)
      prisma.$queryRaw<Array<{ date: Date; total: number; count: bigint }>>`
        SELECT
          DATE(created_at) as date,
          SUM(amount) as total,
          COUNT(*) as count
        FROM "Payment"
        WHERE status = 'SUCCEEDED'
          AND created_at >= ${start}
          AND created_at <= ${end}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,

      // Top earning workers - fetch bookings with payments and aggregate
      (async () => {
        const bookingsWithPayments = await prisma.booking.findMany({
          where: {
            payment: {
              status: "SUCCEEDED",
              createdAt: { gte: start, lte: end },
            },
          },
          select: {
            workerId: true,
            payment: {
              select: { workerPayout: true },
            },
          },
        });

        // Aggregate by worker
        const workerPayouts = new Map<string, number>();
        bookingsWithPayments.forEach((b) => {
          const current = workerPayouts.get(b.workerId) || 0;
          workerPayouts.set(b.workerId, current + (b.payment?.workerPayout || 0));
        });

        // Get top 10 workers
        const topWorkerIds = Array.from(workerPayouts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([id]) => id);

        if (topWorkerIds.length === 0) {
          return [];
        }

        const workers = await prisma.user.findMany({
          where: { id: { in: topWorkerIds } },
          select: { id: true, firstName: true, lastName: true },
        });

        return topWorkerIds.map((id) => {
          const worker = workers.find((w) => w.id === id);
          return {
            workerId: id,
            workerName: worker ? `${worker.firstName} ${worker.lastName}` : "Unknown",
            totalPayout: workerPayouts.get(id) || 0,
          };
        });
      })(),

      // Average transaction value
      prisma.payment.aggregate({
        where: {
          status: "SUCCEEDED",
          createdAt: { gte: start, lte: end },
        },
        _avg: { amount: true },
      }),

      // Currency breakdown
      prisma.payment.groupBy({
        by: ["currency"],
        where: {
          status: "SUCCEEDED",
          createdAt: { gte: start, lte: end },
        },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    // Calculate metrics
    const totalRevenue = successfulPayments._sum.amount || 0;
    const platformRevenue = successfulPayments._sum.platformFee || 0;
    const refundedAmount = refundedPayments._sum.refundedAmount || 0;
    const successRate = totalPayments > 0
      ? ((successfulPayments._count / totalPayments) * 100).toFixed(1)
      : "0";

    // Format revenue by day for charts
    const revenueChart = revenueByDay.map((day) => ({
      date: day.date.toISOString().split("T")[0],
      revenue: Number(day.total) || 0,
      transactions: Number(day.count) || 0,
    }));

    // Format provider breakdown
    const providerStats = paymentsByProvider.map((p) => ({
      provider: p.provider,
      count: p._count,
      amount: p._sum.amount || 0,
      percentage: totalPayments > 0
        ? ((p._count / totalPayments) * 100).toFixed(1)
        : "0",
    }));

    // Format status breakdown
    const statusStats = paymentsByStatus.map((s) => ({
      status: s.status,
      count: s._count,
      percentage: totalPayments > 0
        ? ((s._count / totalPayments) * 100).toFixed(1)
        : "0",
    }));

    // Format currency breakdown
    const currencyStats = currencyBreakdown.map((c) => ({
      currency: c.currency,
      count: c._count,
      amount: c._sum.amount || 0,
    }));

    return NextResponse.json({
      period,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        totalTransactions: totalPayments,
        successfulTransactions: successfulPayments._count,
        failedTransactions: failedPayments,
        refundedTransactions: refundedPayments._count,
        successRate: `${successRate}%`,
        totalRevenue,
        platformRevenue,
        refundedAmount,
        netRevenue: totalRevenue - refundedAmount,
        averageTransactionValue: averageTransactionValue._avg.amount || 0,
      },
      charts: {
        revenueByDay: revenueChart,
      },
      breakdowns: {
        byProvider: providerStats,
        byStatus: statusStats,
        byCurrency: currencyStats,
      },
      topWorkers,
    });
  } catch (error) {
    console.error("Error fetching payment analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment analytics" },
      { status: 500 }
    );
  }
}
