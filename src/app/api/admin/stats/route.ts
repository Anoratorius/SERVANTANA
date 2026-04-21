import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Simple in-memory cache for stats (60 second TTL)
let statsCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 60 seconds

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check session role directly (skip extra DB call if available)
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Return cached stats if valid
    if (statsCache && Date.now() - statsCache.timestamp < CACHE_TTL) {
      return NextResponse.json(statsCache.data);
    }

    // Get platform statistics with optimized queries
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Batch queries - reduce from 15+ to 6 parallel queries
    const [
      userStats,
      workerStats,
      bookingStats,
      reviewStats,
      recentBookings,
      recentUsers,
    ] = await Promise.all([
      // User counts in single query
      prisma.user.groupBy({
        by: ["role"],
        _count: true,
      }),
      // Worker verification counts
      prisma.workerProfile.groupBy({
        by: ["verified"],
        _count: true,
      }),
      // All booking stats in one query
      prisma.$queryRaw<Array<{
        total: bigint;
        completed: bigint;
        cancelled: bigint;
        revenue: number | null;
        new_this_week: bigint;
      }>>`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
          COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled,
          SUM(CASE WHEN status = 'COMPLETED' THEN "totalPrice" ELSE 0 END) as revenue,
          COUNT(*) FILTER (WHERE "createdAt" >= ${sevenDaysAgo}) as new_this_week
        FROM "Booking"
      `,
      // Review stats
      prisma.review.aggregate({
        _count: true,
        _avg: { rating: true },
      }),
      // Recent bookings
      prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          scheduledDate: true,
          status: true,
          totalPrice: true,
          customer: { select: { firstName: true, lastName: true } },
          worker: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
        },
      }),
      // Recent users with new users count
      prisma.user.findMany({
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
      }),
    ]);

    // Process user stats
    const totalUsers = userStats.reduce((sum, s) => sum + s._count, 0);
    const totalCustomers = userStats.find(s => s.role === "CUSTOMER")?._count || 0;
    const totalWorkers = userStats.find(s => s.role === "WORKER")?._count || 0;

    // Process worker stats
    const verifiedWorkers = workerStats.find(s => s.verified === true)?._count || 0;
    const pendingVerification = workerStats.find(s => s.verified === false)?._count || 0;

    // Process booking stats
    const bookingStat = bookingStats[0] || { total: BigInt(0), completed: BigInt(0), cancelled: BigInt(0), revenue: 0, new_this_week: BigInt(0) };

    // Get new users this month (separate light query)
    const newUsersThisMonth = await prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    const responseData = {
      overview: {
        totalUsers,
        totalCustomers,
        totalWorkers,
        verifiedWorkers,
        pendingVerification,
        totalBookings: Number(bookingStat.total),
        completedBookings: Number(bookingStat.completed),
        cancelledBookings: Number(bookingStat.cancelled),
        totalRevenue: bookingStat.revenue || 0,
        newUsersThisMonth,
        newBookingsThisWeek: Number(bookingStat.new_this_week),
        totalReviews: reviewStats._count,
        averageRating: reviewStats._avg.rating || 0,
      },
      recentBookings,
      recentUsers,
    };

    // Cache the result
    statsCache = { data: responseData, timestamp: Date.now() };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
