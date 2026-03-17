import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDateRange } from "@/lib/analytics/calculations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Only cleaners can access this" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";

    const { start, end } = getDateRange(period);

    // Get bookings by service
    const bookings = await prisma.booking.findMany({
      where: {
        cleanerId: session.user.id,
        createdAt: { gte: start, lte: end },
      },
      include: {
        service: true,
        review: { select: { rating: true } },
      },
    });

    // Aggregate by service
    const serviceStats = new Map<string, {
      serviceId: string;
      serviceName: string;
      totalBookings: number;
      completedBookings: number;
      cancelledBookings: number;
      totalRevenue: number;
      ratings: number[];
    }>();

    for (const booking of bookings) {
      if (!booking.serviceId || !booking.service) continue;
      const key = booking.serviceId;
      const existing = serviceStats.get(key) || {
        serviceId: booking.serviceId,
        serviceName: booking.service.name,
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
        ratings: [],
      };

      existing.totalBookings++;

      if (booking.status === "COMPLETED") {
        existing.completedBookings++;
        existing.totalRevenue += booking.totalPrice;
      } else if (booking.status === "CANCELLED") {
        existing.cancelledBookings++;
      }

      if (booking.review) {
        existing.ratings.push(booking.review.rating);
      }

      serviceStats.set(key, existing);
    }

    // Format output
    const services = Array.from(serviceStats.values()).map((s) => ({
      ...s,
      averageRating: s.ratings.length > 0
        ? Math.round((s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length) * 10) / 10
        : 0,
      completionRate: s.totalBookings > 0
        ? Math.round((s.completedBookings / s.totalBookings) * 100)
        : 0,
      ratings: undefined, // Remove raw ratings from output
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json({ services });
  } catch (error) {
    console.error("Error fetching service analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch service analytics" },
      { status: 500 }
    );
  }
}
