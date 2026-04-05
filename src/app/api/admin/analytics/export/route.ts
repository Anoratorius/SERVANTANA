import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDateRange } from "@/lib/analytics/calculations";
import {
  generateBookingsExport,
  generateEarningsExport,
  generateRevenueExport,
  createDownloadResponse,
} from "@/lib/analytics/export";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "bookings";
    const period = searchParams.get("period") || "month";

    const { start, end } = getDateRange(period);
    const dateStr = new Date().toISOString().split("T")[0];

    switch (type) {
      case "bookings": {
        const bookings = await prisma.booking.findMany({
          where: {
            createdAt: { gte: start, lte: end },
          },
          include: {
            service: { select: { name: true } },
            customer: { select: { firstName: true, lastName: true } },
            cleaner: { select: { firstName: true, lastName: true } },
          },
          orderBy: { scheduledDate: "desc" },
        });

        const exportData = bookings.map((b) => ({
          id: b.id,
          scheduledDate: b.scheduledDate,
          scheduledTime: b.scheduledTime,
          status: b.status,
          totalPrice: b.totalPrice,
          serviceName: b.service?.name || "N/A",
          customerName: `${b.customer.firstName || ""} ${b.customer.lastName || ""}`.trim() || "N/A",
          workerName: b.cleaner
            ? `${b.cleaner.firstName || ""} ${b.cleaner.lastName || ""}`.trim() || "N/A"
            : "Unassigned",
        }));

        const csv = generateBookingsExport(exportData);
        return createDownloadResponse(csv, `bookings-${dateStr}.csv`);
      }

      case "earnings": {
        const earnings = await prisma.earning.findMany({
          where: {
            createdAt: { gte: start, lte: end },
          },
          orderBy: { createdAt: "desc" },
        });

        const exportData = earnings.map((e) => ({
          id: e.id,
          createdAt: e.createdAt,
          grossAmount: e.grossAmount,
          platformFee: e.platformFee,
          amount: e.amount,
          status: e.status,
          bookingId: e.bookingId,
        }));

        const csv = generateEarningsExport(exportData);
        return createDownloadResponse(csv, `earnings-${dateStr}.csv`);
      }

      case "revenue": {
        const payments = await prisma.payment.findMany({
          where: {
            createdAt: { gte: start, lte: end },
            status: "SUCCEEDED",
          },
          include: {
            booking: { select: { scheduledDate: true } },
          },
          orderBy: { createdAt: "asc" },
        });

        // Group by date
        const dailyData = new Map<
          string,
          { bookings: number; revenue: number; platformFees: number; refunds: number }
        >();

        for (const payment of payments) {
          const dateKey = new Date(payment.createdAt).toISOString().split("T")[0];
          const existing = dailyData.get(dateKey) || {
            bookings: 0,
            revenue: 0,
            platformFees: 0,
            refunds: 0,
          };

          existing.bookings++;
          existing.revenue += payment.amount;
          existing.platformFees += payment.amount * 0.15;

          dailyData.set(dateKey, existing);
        }

        // Get refunds
        const refunds = await prisma.payment.findMany({
          where: {
            createdAt: { gte: start, lte: end },
            status: "REFUNDED",
          },
        });

        for (const refund of refunds) {
          const dateKey = new Date(refund.createdAt).toISOString().split("T")[0];
          const existing = dailyData.get(dateKey) || {
            bookings: 0,
            revenue: 0,
            platformFees: 0,
            refunds: 0,
          };
          existing.refunds += refund.amount;
          dailyData.set(dateKey, existing);
        }

        const exportData = Array.from(dailyData.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => ({
            date,
            bookings: data.bookings,
            revenue: Math.round(data.revenue * 100) / 100,
            platformFees: Math.round(data.platformFees * 100) / 100,
            refunds: Math.round(data.refunds * 100) / 100,
          }));

        const csv = generateRevenueExport(exportData);
        return createDownloadResponse(csv, `revenue-${dateStr}.csv`);
      }

      default:
        return NextResponse.json(
          { error: "Invalid export type. Use: bookings, earnings, or revenue" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error exporting analytics:", error);
    return NextResponse.json(
      { error: "Failed to export analytics" },
      { status: 500 }
    );
  }
}
