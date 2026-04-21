import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

// Aggregate daily analytics (should be called by cron or manually by admin)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Only admins can trigger aggregation manually
    if (session?.user?.role !== "ADMIN") {
      // Check for cron secret
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const daysAgo = body.daysAgo || 0; // 0 = today, 1 = yesterday, etc.

    const targetDate = startOfDay(subDays(new Date(), daysAgo));
    const targetDateEnd = endOfDay(targetDate);

    console.log(`Aggregating analytics for ${format(targetDate, "yyyy-MM-dd")}`);

    // Aggregate platform-wide metrics
    await aggregatePlatformMetrics(targetDate, targetDateEnd);

    // Aggregate user-level analytics
    await aggregateUserAnalytics(targetDate, targetDateEnd);

    // Aggregate worker performance metrics
    await aggregateWorkerPerformance(targetDate, targetDateEnd);

    // Aggregate customer behavior metrics
    await aggregateCustomerBehavior(targetDate, targetDateEnd);

    return NextResponse.json({
      success: true,
      date: format(targetDate, "yyyy-MM-dd"),
    });
  } catch (error) {
    console.error("Error aggregating analytics:", error);
    return NextResponse.json(
      { error: "Failed to aggregate analytics" },
      { status: 500 }
    );
  }
}

async function aggregatePlatformMetrics(startDate: Date, endDate: Date) {
  // Get counts
  const [
    totalUsers,
    totalCustomers,
    totalWorkers,
    newUsersToday,
    newCustomersToday,
    newWorkersToday,
    bookingsCreated,
    bookingsCompleted,
    bookingsCancelled,
    totalEvents,
    totalSearches,
    disputes,
    demandSignals,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: { in: ["WORKER", "CLEANER"] } } }),
    prisma.user.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: startDate, lte: endDate } } }),
    prisma.user.count({ where: { role: { in: ["WORKER", "CLEANER"] }, createdAt: { gte: startDate, lte: endDate } } }),
    prisma.booking.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    prisma.booking.count({ where: { status: "COMPLETED", completedAt: { gte: startDate, lte: endDate } } }),
    prisma.booking.count({ where: { status: "CANCELLED", cancelledAt: { gte: startDate, lte: endDate } } }),
    prisma.userEvent.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    prisma.userEvent.count({ where: { eventType: "SEARCH", createdAt: { gte: startDate, lte: endDate } } }),
    prisma.dispute.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    prisma.demandSignal.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
  ]);

  // Get active users (users with events today)
  const activeUsersResult = await prisma.userEvent.groupBy({
    by: ["userId"],
    where: {
      createdAt: { gte: startDate, lte: endDate },
      userId: { not: null },
    },
  });
  const activeUsersToday = activeUsersResult.length;

  // Get revenue
  const revenueResult = await prisma.payment.aggregate({
    where: {
      status: "SUCCEEDED",
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: {
      platformFee: true,
      amount: true,
    },
  });
  const totalRevenue = revenueResult._sum.platformFee || 0;
  const totalBookingValue = revenueResult._sum.amount || 0;

  // Get refunds
  const refundsResult = await prisma.payment.aggregate({
    where: {
      refundedAt: { gte: startDate, lte: endDate },
    },
    _sum: {
      refundedAmount: true,
    },
  });
  const refundsTotal = refundsResult._sum.refundedAmount || 0;

  // Get tips
  const tipsResult = await prisma.booking.aggregate({
    where: {
      tipPaidAt: { gte: startDate, lte: endDate },
    },
    _sum: {
      tipAmount: true,
    },
  });
  const tipsTotal = tipsResult._sum.tipAmount || 0;

  // Calculate demand metrics
  const unmatchedDemand = await prisma.demandSignal.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      wasMatched: false,
    },
  });

  const waitlistCount = await prisma.demandSignal.count({
    where: {
      joinedWaitlist: true,
      waitlistNotified: false,
    },
  });

  // Calculate averages
  const avgBookingValue = bookingsCreated > 0 ? totalBookingValue / bookingsCreated : 0;
  const avgRevenuePerUser = totalUsers > 0 ? totalRevenue / totalUsers : 0;

  // Get top cities by bookings
  const topCitiesResult = await prisma.booking.groupBy({
    by: ["city"],
    where: {
      createdAt: { gte: startDate, lte: endDate },
      city: { not: null },
    },
    _count: true,
    orderBy: { _count: { city: "desc" } },
    take: 10,
  });

  const topCitiesByBookings = topCitiesResult.map((c) => ({
    city: c.city,
    count: c._count,
  }));

  // Upsert platform metrics
  await prisma.platformMetrics.upsert({
    where: { date: startDate },
    update: {
      totalUsers,
      totalCustomers,
      totalWorkers,
      newUsersToday,
      newCustomersToday,
      newWorkersToday,
      activeUsersToday,
      totalSessions: totalEvents,
      totalSearches,
      bookingsCreated,
      bookingsCompleted,
      bookingsCancelled,
      totalRevenue,
      totalBookingValue,
      avgBookingValue,
      refundsTotal,
      tipsTotal,
      avgRevenuePerUser,
      totalDemandSignals: demandSignals,
      unmatchedDemand,
      waitlistCount,
      disputesOpened: disputes,
      topCitiesByBookings,
    },
    create: {
      date: startDate,
      periodType: "DAILY",
      totalUsers,
      totalCustomers,
      totalWorkers,
      newUsersToday,
      newCustomersToday,
      newWorkersToday,
      activeUsersToday,
      totalSessions: totalEvents,
      totalSearches,
      bookingsCreated,
      bookingsCompleted,
      bookingsCancelled,
      totalRevenue,
      totalBookingValue,
      avgBookingValue,
      refundsTotal,
      tipsTotal,
      avgRevenuePerUser,
      totalDemandSignals: demandSignals,
      unmatchedDemand,
      waitlistCount,
      disputesOpened: disputes,
      topCitiesByBookings,
    },
  });

  console.log("Platform metrics aggregated");
}

async function aggregateUserAnalytics(startDate: Date, endDate: Date) {
  // Get all users with activity today
  const usersWithActivity = await prisma.userEvent.groupBy({
    by: ["userId"],
    where: {
      createdAt: { gte: startDate, lte: endDate },
      userId: { not: null },
    },
  });

  for (const { userId } of usersWithActivity) {
    if (!userId) continue;

    // Get event counts
    const events = await prisma.userEvent.groupBy({
      by: ["eventType"],
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    const eventCounts = Object.fromEntries(events.map((e) => [e.eventType, e._count]));

    // Get session count (approximate by counting page views)
    const sessionsCount = eventCounts["PAGE_VIEW"] || 0;
    const searchesCount = eventCounts["SEARCH"] || 0;
    const profilesViewed = eventCounts["PROFILE_VIEW"] || 0;

    // Get bookings
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { customerId: userId, createdAt: { gte: startDate, lte: endDate } },
          { workerId: userId, createdAt: { gte: startDate, lte: endDate } },
        ],
      },
    });

    const bookingsCreated = bookings.filter((b) => b.customerId === userId).length;
    const bookingsCompleted = bookings.filter((b) => b.status === "COMPLETED").length;
    const bookingsCancelled = bookings.filter((b) => b.status === "CANCELLED").length;
    const totalBookingValue = bookings
      .filter((b) => b.customerId === userId)
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    // Get messages
    const messagesSent = await prisma.message.count({
      where: {
        senderId: userId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const messagesReceived = await prisma.message.count({
      where: {
        receiverId: userId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Get reviews
    const reviewsGiven = await prisma.review.count({
      where: {
        reviewerId: userId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Upsert user analytics
    await prisma.userAnalytics.upsert({
      where: {
        userId_date: { userId, date: startDate },
      },
      update: {
        sessionsCount,
        searchesCount,
        profilesViewed,
        bookingsCreated,
        bookingsCompleted,
        bookingsCancelled,
        totalBookingValue,
        avgBookingValue: bookingsCreated > 0 ? totalBookingValue / bookingsCreated : 0,
        messagesSent,
        messagesReceived,
        reviewsGiven,
        eventsTriggered: Object.values(eventCounts).reduce((a, b) => a + b, 0),
      },
      create: {
        userId,
        date: startDate,
        sessionsCount,
        searchesCount,
        profilesViewed,
        bookingsCreated,
        bookingsCompleted,
        bookingsCancelled,
        totalBookingValue,
        avgBookingValue: bookingsCreated > 0 ? totalBookingValue / bookingsCreated : 0,
        messagesSent,
        messagesReceived,
        reviewsGiven,
        eventsTriggered: Object.values(eventCounts).reduce((a, b) => a + b, 0),
      },
    });
  }

  console.log(`User analytics aggregated for ${usersWithActivity.length} users`);
}

async function aggregateWorkerPerformance(startDate: Date, endDate: Date) {
  // Get all workers with bookings today
  const workersWithBookings = await prisma.booking.groupBy({
    by: ["workerId"],
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  for (const { workerId } of workersWithBookings) {
    // Get bookings
    const bookings = await prisma.booking.findMany({
      where: {
        workerId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { payment: true },
    });

    const bookingsReceived = bookings.length;
    const bookingsCompleted = bookings.filter((b) => b.status === "COMPLETED").length;
    const bookingsCancelled = bookings.filter((b) => b.status === "CANCELLED").length;
    const completionRate = bookingsReceived > 0 ? (bookingsCompleted / bookingsReceived) * 100 : 0;
    const cancellationRate = bookingsReceived > 0 ? (bookingsCancelled / bookingsReceived) * 100 : 0;

    // Get earnings
    const grossEarnings = bookings
      .filter((b) => b.payment?.status === "SUCCEEDED")
      .reduce((sum, b) => sum + (b.payment?.workerPayout || 0), 0);

    const tipsReceived = bookings
      .filter((b) => b.tipAmount)
      .reduce((sum, b) => sum + (b.tipAmount || 0), 0);

    // Get ratings
    const ratings = await prisma.review.findMany({
      where: {
        revieweeId: workerId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const ratingsReceived = ratings.length;
    const avgRating = ratingsReceived > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratingsReceived
      : 0;
    const fiveStarRatings = ratings.filter((r) => r.rating === 5).length;
    const oneStarRatings = ratings.filter((r) => r.rating === 1).length;

    // Get profile views
    const profileViews = await prisma.userEvent.count({
      where: {
        eventType: "PROFILE_VIEW",
        targetId: workerId,
        targetType: "worker",
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Upsert worker performance
    await prisma.workerPerformanceMetrics.upsert({
      where: {
        workerId_date: { workerId, date: startDate },
      },
      update: {
        bookingsReceived,
        bookingsCompleted,
        bookingsCancelled,
        completionRate,
        cancellationRate,
        grossEarnings,
        netEarnings: grossEarnings,
        tipsReceived,
        avgEarningPerJob: bookingsCompleted > 0 ? grossEarnings / bookingsCompleted : 0,
        ratingsReceived,
        avgRating,
        fiveStarRatings,
        oneStarRatings,
        profileViews,
      },
      create: {
        workerId,
        date: startDate,
        bookingsReceived,
        bookingsCompleted,
        bookingsCancelled,
        completionRate,
        cancellationRate,
        grossEarnings,
        netEarnings: grossEarnings,
        tipsReceived,
        avgEarningPerJob: bookingsCompleted > 0 ? grossEarnings / bookingsCompleted : 0,
        ratingsReceived,
        avgRating,
        fiveStarRatings,
        oneStarRatings,
        profileViews,
      },
    });
  }

  console.log(`Worker performance aggregated for ${workersWithBookings.length} workers`);
}

async function aggregateCustomerBehavior(startDate: Date, endDate: Date) {
  // Get all customers with bookings today
  const customersWithBookings = await prisma.booking.groupBy({
    by: ["customerId"],
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  for (const { customerId } of customersWithBookings) {
    // Get bookings
    const bookings = await prisma.booking.findMany({
      where: {
        customerId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { payment: true },
    });

    const bookingsCreated = bookings.length;
    const bookingsCompleted = bookings.filter((b) => b.status === "COMPLETED").length;
    const bookingsCancelled = bookings.filter((b) => b.status === "CANCELLED").length;
    const totalSpent = bookings
      .filter((b) => b.payment?.status === "SUCCEEDED")
      .reduce((sum, b) => sum + (b.payment?.amount || 0), 0);
    const tipsGiven = bookings.reduce((sum, b) => sum + (b.tipAmount || 0), 0);

    // Get searches
    const searches = await prisma.userEvent.count({
      where: {
        userId: customerId,
        eventType: "SEARCH",
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Get profile views
    const profilesViewed = await prisma.userEvent.count({
      where: {
        userId: customerId,
        eventType: "PROFILE_VIEW",
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Get unique workers booked
    const uniqueWorkers = new Set(bookings.map((b) => b.workerId)).size;

    // Get reviews given
    const reviewsGiven = await prisma.review.count({
      where: {
        reviewerId: customerId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Get lifetime stats
    const lifetimeBookings = await prisma.booking.count({
      where: { customerId, status: "COMPLETED" },
    });

    const lifetimeSpentResult = await prisma.payment.aggregate({
      where: {
        booking: { customerId },
        status: "SUCCEEDED",
      },
      _sum: { amount: true },
    });
    const lifetimeSpent = lifetimeSpentResult._sum.amount || 0;

    // Upsert customer behavior
    await prisma.customerBehaviorMetrics.upsert({
      where: {
        customerId_date: { customerId, date: startDate },
      },
      update: {
        bookingsCreated,
        bookingsCompleted,
        bookingsCancelled,
        totalSpent,
        avgBookingValue: bookingsCreated > 0 ? totalSpent / bookingsCreated : 0,
        tipsGiven,
        searches,
        profilesViewed,
        uniqueWorkersBooked: uniqueWorkers,
        reviewsGiven,
        lifetimeBookings,
        lifetimeSpent,
        ltv: lifetimeSpent, // Simple LTV = total spent
      },
      create: {
        customerId,
        date: startDate,
        bookingsCreated,
        bookingsCompleted,
        bookingsCancelled,
        totalSpent,
        avgBookingValue: bookingsCreated > 0 ? totalSpent / bookingsCreated : 0,
        tipsGiven,
        searches,
        profilesViewed,
        uniqueWorkersBooked: uniqueWorkers,
        reviewsGiven,
        lifetimeBookings,
        lifetimeSpent,
        ltv: lifetimeSpent,
      },
    });
  }

  console.log(`Customer behavior aggregated for ${customersWithBookings.length} customers`);
}
