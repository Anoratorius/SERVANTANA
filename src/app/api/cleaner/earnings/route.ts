import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a cleaner
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Only cleaners can view earnings" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all"; // all, week, month, year
    const status = searchParams.get("status"); // PENDING, AVAILABLE, PAID_OUT

    // Build date filter
    let dateFilter: Date | undefined;
    const now = new Date();

    switch (period) {
      case "week":
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        dateFilter = new Date(now.getFullYear(), 0, 1);
        break;
    }

    // Get earnings
    const earnings = await prisma.earning.findMany({
      where: {
        cleanerId: session.user.id,
        ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        booking: {
          select: {
            id: true,
            scheduledDate: true,
            scheduledTime: true,
            customer: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate totals
    const totalEarned = earnings.reduce((sum, e) => sum + e.amount, 0);
    const totalPending = earnings
      .filter((e) => e.status === "PENDING")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalAvailable = earnings
      .filter((e) => e.status === "AVAILABLE")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalPaidOut = earnings
      .filter((e) => e.status === "PAID_OUT")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalPlatformFees = earnings.reduce((sum, e) => sum + e.platformFee, 0);

    return NextResponse.json({
      earnings,
      summary: {
        totalEarned,
        totalPending,
        totalAvailable,
        totalPaidOut,
        totalPlatformFees,
        totalGross: earnings.reduce((sum, e) => sum + e.grossAmount, 0),
        count: earnings.length,
      },
    });
  } catch (error) {
    console.error("Error fetching earnings:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings" },
      { status: 500 }
    );
  }
}
