import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDateRange, groupByDate, fillMissingDates } from "@/lib/analytics/calculations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";

    const { start, end } = getDateRange(period);

    // Get all payments in the period
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      include: {
        booking: {
          select: {
            id: true,
            scheduledDate: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate daily revenue
    const revenueByDate = groupByDate(
      payments
        .filter((p) => p.status === "SUCCEEDED")
        .map((p) => ({
          date: new Date(p.createdAt),
          value: p.amount,
        }))
    );

    // Calculate daily refunds
    const refundsByDate = groupByDate(
      payments
        .filter((p) => p.status === "REFUNDED")
        .map((p) => ({
          date: new Date(p.createdAt),
          value: p.amount,
        }))
    );

    // Calculate daily platform fees (assuming 15% platform fee)
    const platformFeeRate = 0.15;
    const feesByDate = groupByDate(
      payments
        .filter((p) => p.status === "SUCCEEDED")
        .map((p) => ({
          date: new Date(p.createdAt),
          value: p.amount * platformFeeRate,
        }))
    );

    // Fill missing dates and combine data
    const filledRevenue = fillMissingDates(revenueByDate, start, end);
    const refundMap = new Map(refundsByDate.map((r) => [r.date, r.value]));
    const feeMap = new Map(feesByDate.map((f) => [f.date, f.value]));

    // Get booking counts by date
    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: {
        createdAt: true,
      },
    });

    const bookingsByDate = groupByDate(
      bookings.map((b) => ({
        date: new Date(b.createdAt),
        value: 1,
      }))
    );
    const bookingMap = new Map(bookingsByDate.map((b) => [b.date, b.value]));

    const dailyData = filledRevenue.map((r) => ({
      date: r.date,
      revenue: r.value,
      refunds: refundMap.get(r.date) || 0,
      platformFees: Math.round((feeMap.get(r.date) || 0) * 100) / 100,
      bookings: bookingMap.get(r.date) || 0,
      netRevenue: r.value - (refundMap.get(r.date) || 0),
    }));

    // Calculate summary
    const totalRevenue = payments
      .filter((p) => p.status === "SUCCEEDED")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalRefunds = payments
      .filter((p) => p.status === "REFUNDED")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPlatformFees = Math.round(totalRevenue * platformFeeRate * 100) / 100;

    const summary = {
      totalRevenue,
      totalRefunds,
      totalPlatformFees,
      netRevenue: totalRevenue - totalRefunds,
      totalBookings: bookings.length,
      averageOrderValue: bookings.length > 0
        ? Math.round((totalRevenue / bookings.length) * 100) / 100
        : 0,
    };

    return NextResponse.json({
      summary,
      dailyData,
      period,
    });
  } catch (error) {
    console.error("Error fetching revenue analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue analytics" },
      { status: 500 }
    );
  }
}
