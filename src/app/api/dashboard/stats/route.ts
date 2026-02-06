import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const isCleaner = session.user.role === "CLEANER";

    // Get booking counts
    const [totalBookings, upcomingBookings, completedBookings] = await Promise.all([
      prisma.booking.count({
        where: isCleaner ? { cleanerId: userId } : { customerId: userId },
      }),
      prisma.booking.count({
        where: {
          ...(isCleaner ? { cleanerId: userId } : { customerId: userId }),
          status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
        },
      }),
      prisma.booking.count({
        where: {
          ...(isCleaner ? { cleanerId: userId } : { customerId: userId }),
          status: "COMPLETED",
        },
      }),
    ]);

    let totalEarnings = 0;
    let averageRating = 0;

    if (isCleaner) {
      // Calculate total earnings for cleaner
      const earnings = await prisma.booking.aggregate({
        where: {
          cleanerId: userId,
          status: "COMPLETED",
        },
        _sum: {
          totalPrice: true,
        },
      });
      totalEarnings = earnings._sum.totalPrice || 0;

      // Calculate average rating
      const ratings = await prisma.review.aggregate({
        where: {
          revieweeId: userId,
        },
        _avg: {
          rating: true,
        },
      });
      averageRating = ratings._avg.rating || 0;
    }

    return NextResponse.json({
      totalBookings,
      upcomingBookings,
      completedBookings,
      ...(isCleaner ? { totalEarnings, averageRating } : {}),
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
