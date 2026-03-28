import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get platform statistics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalCustomers,
      totalCleaners,
      verifiedCleaners,
      pendingVerification,
      totalBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      newUsersThisMonth,
      newBookingsThisWeek,
      totalReviews,
      averageRating,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { role: "CLEANER" } }),
      prisma.workerProfile.count({ where: { verified: true } }),
      prisma.workerProfile.count({ where: { verified: false } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.booking.count({ where: { status: "CANCELLED" } }),
      prisma.booking.aggregate({
        where: { status: "COMPLETED" },
        _sum: { totalPrice: true },
      }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.booking.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.review.count(),
      prisma.review.aggregate({ _avg: { rating: true } }),
    ]);

    // Get bookings by status
    const bookingsByStatus = await prisma.booking.groupBy({
      by: ["status"],
      _count: true,
    });

    // Get recent activity
    const recentBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        cleaner: { select: { firstName: true, lastName: true } },
        service: { select: { name: true } },
      },
    });

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      overview: {
        totalUsers,
        totalCustomers,
        totalCleaners,
        verifiedCleaners,
        pendingVerification,
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue: totalRevenue._sum.totalPrice || 0,
        newUsersThisMonth,
        newBookingsThisWeek,
        totalReviews,
        averageRating: averageRating._avg.rating || 0,
      },
      bookingsByStatus: bookingsByStatus.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count }),
        {}
      ),
      recentBookings,
      recentUsers,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
