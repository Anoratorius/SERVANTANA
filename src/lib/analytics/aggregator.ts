/**
 * Analytics Data Aggregation
 */

import { prisma } from "@/lib/prisma";
import { getDateRange, calculatePercentageChange, calculateAverageRating, groupByDate, fillMissingDates } from "./calculations";

interface CleanerStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalEarnings: number;
  averageRating: number;
  responseRate: number;
  repeatCustomers: number;
}

interface EarningsBreakdown {
  grossEarnings: number;
  platformFees: number;
  netEarnings: number;
  pendingEarnings: number;
  availableEarnings: number;
}

interface ServiceStats {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  revenue: number;
  averageRating: number;
}

interface TrendData {
  date: string;
  value: number;
}

export async function getWorkerAnalytics(
  cleanerId: string,
  period: string
): Promise<{
  stats: CleanerStats;
  earnings: EarningsBreakdown;
  serviceStats: ServiceStats[];
  bookingTrend: TrendData[];
  earningsTrend: TrendData[];
  ratingDistribution: number[];
  previousPeriodComparison: {
    bookingsChange: number;
    earningsChange: number;
    ratingChange: number;
  };
}> {
  const { start, end } = getDateRange(period);

  // Get previous period for comparison
  const periodDuration = end.getTime() - start.getTime();
  const previousStart = new Date(start.getTime() - periodDuration);
  const previousEnd = new Date(start.getTime() - 1);

  // Current period bookings
  const bookings = await prisma.booking.findMany({
    where: {
      cleanerId,
      createdAt: { gte: start, lte: end },
    },
    include: {
      service: true,
      review: { select: { rating: true } },
    },
  });

  // Previous period bookings for comparison
  const previousBookings = await prisma.booking.findMany({
    where: {
      cleanerId,
      createdAt: { gte: previousStart, lte: previousEnd },
    },
    select: { id: true, totalPrice: true },
  });

  // Earnings data
  const earnings = await prisma.earning.findMany({
    where: {
      cleanerId,
      createdAt: { gte: start, lte: end },
    },
  });

  const previousEarnings = await prisma.earning.findMany({
    where: {
      cleanerId,
      createdAt: { gte: previousStart, lte: previousEnd },
    },
    select: { amount: true },
  });

  // Reviews
  const reviews = await prisma.review.findMany({
    where: {
      revieweeId: cleanerId,
      createdAt: { gte: start, lte: end },
    },
    select: { rating: true },
  });

  const previousReviews = await prisma.review.findMany({
    where: {
      revieweeId: cleanerId,
      createdAt: { gte: previousStart, lte: previousEnd },
    },
    select: { rating: true },
  });

  // Calculate stats
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED");
  const cancelledBookings = bookings.filter((b) => b.status === "CANCELLED");

  const stats: CleanerStats = {
    totalBookings: bookings.length,
    completedBookings: completedBookings.length,
    cancelledBookings: cancelledBookings.length,
    totalEarnings: earnings.reduce((sum, e) => sum + e.amount, 0),
    averageRating: calculateAverageRating(reviews.map((r) => r.rating)),
    responseRate: bookings.length > 0
      ? Math.round((completedBookings.length / bookings.length) * 100)
      : 0,
    repeatCustomers: await getRepeatCustomerCount(cleanerId, start, end),
  };

  // Earnings breakdown
  const earningsData: EarningsBreakdown = {
    grossEarnings: earnings.reduce((sum, e) => sum + e.grossAmount, 0),
    platformFees: earnings.reduce((sum, e) => sum + e.platformFee, 0),
    netEarnings: earnings.reduce((sum, e) => sum + e.amount, 0),
    pendingEarnings: earnings
      .filter((e) => e.status === "PENDING")
      .reduce((sum, e) => sum + e.amount, 0),
    availableEarnings: earnings
      .filter((e) => e.status === "AVAILABLE")
      .reduce((sum, e) => sum + e.amount, 0),
  };

  // Service stats
  const serviceStatsMap = new Map<string, ServiceStats>();
  for (const booking of completedBookings) {
    if (!booking.serviceId || !booking.service) continue;
    const key = booking.serviceId;
    const existing = serviceStatsMap.get(key) || {
      serviceId: booking.serviceId,
      serviceName: booking.service.name,
      bookingCount: 0,
      revenue: 0,
      averageRating: 0,
    };

    existing.bookingCount++;
    existing.revenue += booking.totalPrice;

    if (booking.review) {
      const ratings = [existing.averageRating, booking.review.rating].filter(Boolean);
      existing.averageRating = calculateAverageRating(ratings);
    }

    serviceStatsMap.set(key, existing);
  }

  // Booking trend
  const bookingTrend = fillMissingDates(
    groupByDate(
      bookings.map((b) => ({ date: new Date(b.createdAt), value: 1 }))
    ),
    start,
    end
  );

  // Earnings trend
  const earningsTrend = fillMissingDates(
    groupByDate(
      earnings.map((e) => ({ date: new Date(e.createdAt), value: e.amount }))
    ),
    start,
    end
  );

  // Rating distribution (1-5 stars)
  const ratingDistribution = [0, 0, 0, 0, 0];
  for (const review of reviews) {
    ratingDistribution[review.rating - 1]++;
  }

  // Previous period comparison
  const previousPeriodComparison = {
    bookingsChange: calculatePercentageChange(
      bookings.length,
      previousBookings.length
    ),
    earningsChange: calculatePercentageChange(
      earnings.reduce((sum, e) => sum + e.amount, 0),
      previousEarnings.reduce((sum, e) => sum + e.amount, 0)
    ),
    ratingChange: calculatePercentageChange(
      calculateAverageRating(reviews.map((r) => r.rating)) * 10,
      calculateAverageRating(previousReviews.map((r) => r.rating)) * 10
    ),
  };

  return {
    stats,
    earnings: earningsData,
    serviceStats: Array.from(serviceStatsMap.values()),
    bookingTrend,
    earningsTrend,
    ratingDistribution,
    previousPeriodComparison,
  };
}

async function getRepeatCustomerCount(
  cleanerId: string,
  start: Date,
  end: Date
): Promise<number> {
  const result = await prisma.booking.groupBy({
    by: ["customerId"],
    where: {
      cleanerId,
      createdAt: { gte: start, lte: end },
      status: "COMPLETED",
    },
    _count: { customerId: true },
    having: {
      customerId: { _count: { gt: 1 } },
    },
  });

  return result.length;
}

export async function getAdminAnalytics(period: string) {
  const { start, end } = getDateRange(period);

  // Platform-wide stats
  const [
    totalUsers,
    totalCleaners,
    totalBookings,
    totalRevenue,
    activeBookings,
    pendingDisputes,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "WORKER" } }),
    prisma.booking.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.payment.aggregate({
      where: { createdAt: { gte: start, lte: end }, status: "SUCCEEDED" },
      _sum: { amount: true },
    }),
    prisma.booking.count({
      where: { status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] } },
    }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
  ]);

  // Get booking trends
  const bookings = await prisma.booking.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { createdAt: true, totalPrice: true },
  });

  const bookingTrend = fillMissingDates(
    groupByDate(bookings.map((b) => ({ date: new Date(b.createdAt), value: 1 }))),
    start,
    end
  );

  const revenueTrend = fillMissingDates(
    groupByDate(bookings.map((b) => ({ date: new Date(b.createdAt), value: b.totalPrice }))),
    start,
    end
  );

  // Top services
  const topServices = await prisma.booking.groupBy({
    by: ["serviceId"],
    where: { createdAt: { gte: start, lte: end } },
    _count: { id: true },
    _sum: { totalPrice: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  const serviceIds = topServices.map((s) => s.serviceId).filter((id): id is string => id !== null);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
  });

  const topServicesWithNames = topServices.map((s) => ({
    ...s,
    serviceName: services.find((svc) => svc.id === s.serviceId)?.name || "Unknown",
  }));

  return {
    stats: {
      totalUsers,
      totalCleaners,
      totalBookings,
      totalRevenue: totalRevenue._sum.amount || 0,
      activeBookings,
      pendingDisputes,
    },
    bookingTrend,
    revenueTrend,
    topServices: topServicesWithNames,
  };
}
