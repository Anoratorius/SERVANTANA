/**
 * Advanced Analytics Module
 * Revenue forecasting, worker performance scoring, customer retention metrics
 */

import { prisma } from "./prisma";
import { subDays, subMonths, startOfMonth, endOfMonth, format, eachDayOfInterval, eachMonthOfInterval } from "date-fns";

// ============================================
// TYPES
// ============================================

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  bookings: number;
  avgBookingValue: number;
}

export interface RevenueForecast {
  historical: RevenueDataPoint[];
  forecast: RevenueDataPoint[];
  metrics: {
    totalRevenueLast30Days: number;
    totalRevenueLast90Days: number;
    averageDailyRevenue: number;
    growthRate: number; // percentage
    projectedMonthlyRevenue: number;
    seasonalityIndex: number; // 0-2, 1 = normal
  };
}

export interface WorkerPerformanceScore {
  workerId: string;
  workerName: string;
  overallScore: number; // 0-100
  breakdown: {
    rating: number; // 0-100 (from 5-star rating)
    responseTime: number; // 0-100 (faster = higher)
    completionRate: number; // 0-100
    cancellationRate: number; // 0-100 (lower cancellation = higher score)
    repeatCustomerRate: number; // 0-100
    verificationBonus: number; // 0-20 bonus for verified workers
  };
  trend: "improving" | "stable" | "declining";
  recommendations: string[];
  rank: number;
  totalWorkers: number;
}

export interface RetentionMetrics {
  repeatBookingRate: number; // percentage of customers who book again
  customerLifetimeValue: number; // average CLV in EUR
  churnRate: number; // percentage of customers who don't return
  averageBookingsPerCustomer: number;
  cohortAnalysis: CohortData[];
  retentionByMonth: { month: string; rate: number }[];
}

export interface CohortData {
  cohortMonth: string;
  totalCustomers: number;
  retained: {
    month1: number;
    month2: number;
    month3: number;
    month6: number;
    month12: number;
  };
}

// ============================================
// REVENUE FORECASTING
// ============================================

/**
 * Calculate revenue forecast based on historical data
 */
export async function getRevenueForecast(days: number = 90): Promise<RevenueForecast> {
  const endDate = new Date();
  const startDate = subDays(endDate, days);

  // Get historical booking data
  const bookings = await prisma.booking.findMany({
    where: {
      status: "COMPLETED",
      completedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      payment: true,
    },
  });

  // Group by date
  const dailyData = new Map<string, { revenue: number; count: number }>();

  // Initialize all dates
  const allDates = eachDayOfInterval({ start: startDate, end: endDate });
  for (const date of allDates) {
    const key = format(date, "yyyy-MM-dd");
    dailyData.set(key, { revenue: 0, count: 0 });
  }

  // Fill with actual data
  for (const booking of bookings) {
    if (booking.completedAt) {
      const key = format(booking.completedAt, "yyyy-MM-dd");
      const current = dailyData.get(key) || { revenue: 0, count: 0 };
      const bookingRevenue = booking.payment?.amount || booking.totalPrice || 0;
      dailyData.set(key, {
        revenue: current.revenue + bookingRevenue,
        count: current.count + 1,
      });
    }
  }

  // Convert to array
  const historical: RevenueDataPoint[] = Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      bookings: data.count,
      avgBookingValue: data.count > 0 ? Math.round((data.revenue / data.count) * 100) / 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate metrics
  const last30DaysData = historical.slice(-30);
  const last90DaysData = historical;

  const totalRevenueLast30Days = last30DaysData.reduce((sum, d) => sum + d.revenue, 0);
  const totalRevenueLast90Days = last90DaysData.reduce((sum, d) => sum + d.revenue, 0);
  const averageDailyRevenue = totalRevenueLast30Days / 30;

  // Calculate growth rate (compare last 30 days vs previous 30 days)
  const previous30DaysData = historical.slice(-60, -30);
  const previousRevenue = previous30DaysData.reduce((sum, d) => sum + d.revenue, 0);
  const growthRate = previousRevenue > 0
    ? ((totalRevenueLast30Days - previousRevenue) / previousRevenue) * 100
    : 0;

  // Simple linear regression for forecasting
  const forecast = generateForecast(historical, 30);

  // Calculate seasonality (compare to same period last year if data available)
  const seasonalityIndex = 1.0; // Default, would need more historical data

  return {
    historical,
    forecast,
    metrics: {
      totalRevenueLast30Days: Math.round(totalRevenueLast30Days * 100) / 100,
      totalRevenueLast90Days: Math.round(totalRevenueLast90Days * 100) / 100,
      averageDailyRevenue: Math.round(averageDailyRevenue * 100) / 100,
      growthRate: Math.round(growthRate * 100) / 100,
      projectedMonthlyRevenue: Math.round(averageDailyRevenue * 30 * (1 + growthRate / 100) * 100) / 100,
      seasonalityIndex,
    },
  };
}

/**
 * Generate forecast using simple moving average with trend
 */
function generateForecast(historical: RevenueDataPoint[], forecastDays: number): RevenueDataPoint[] {
  if (historical.length < 7) return [];

  // Calculate 7-day moving average
  const last7Days = historical.slice(-7);
  const avgRevenue = last7Days.reduce((sum, d) => sum + d.revenue, 0) / 7;
  const avgBookings = last7Days.reduce((sum, d) => sum + d.bookings, 0) / 7;

  // Calculate trend (simple linear)
  const last14Days = historical.slice(-14);
  const firstHalfAvg = last14Days.slice(0, 7).reduce((sum, d) => sum + d.revenue, 0) / 7;
  const secondHalfAvg = last14Days.slice(7).reduce((sum, d) => sum + d.revenue, 0) / 7;
  const dailyTrend = (secondHalfAvg - firstHalfAvg) / 7;

  const forecast: RevenueDataPoint[] = [];
  const lastDate = new Date(historical[historical.length - 1].date);

  for (let i = 1; i <= forecastDays; i++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);

    const projectedRevenue = Math.max(0, avgRevenue + dailyTrend * i);
    const projectedBookings = Math.max(0, Math.round(avgBookings + (dailyTrend / avgRevenue) * avgBookings * i));

    forecast.push({
      date: format(date, "yyyy-MM-dd"),
      revenue: Math.round(projectedRevenue * 100) / 100,
      bookings: projectedBookings,
      avgBookingValue: projectedBookings > 0
        ? Math.round((projectedRevenue / projectedBookings) * 100) / 100
        : 0,
    });
  }

  return forecast;
}

// ============================================
// WORKER PERFORMANCE SCORING
// ============================================

/**
 * Calculate performance score for a worker
 */
export async function getWorkerPerformanceScore(workerId: string): Promise<WorkerPerformanceScore | null> {
  const worker = await prisma.user.findUnique({
    where: { id: workerId },
    include: {
      workerProfile: true,
      reviewsReceived: {
        where: { createdAt: { gte: subMonths(new Date(), 6) } },
      },
      bookingsAsCleaner: {
        where: { createdAt: { gte: subMonths(new Date(), 6) } },
        include: { customer: true },
      },
    },
  });

  if (!worker || !worker.workerProfile) return null;

  // Calculate rating score (0-100)
  const avgRating = worker.workerProfile.averageRating || 0;
  const ratingScore = (avgRating / 5) * 100;

  // Calculate response time score (0-100)
  const responseTime = worker.workerProfile.responseTime || 60; // minutes
  const responseTimeScore = Math.max(0, 100 - (responseTime / 60) * 20); // 5+ hours = 0

  // Calculate completion rate (0-100)
  const completedBookings = worker.bookingsAsCleaner.filter((b) => b.status === "COMPLETED").length;
  const totalBookings = worker.bookingsAsCleaner.length;
  const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 100;

  // Calculate cancellation rate (lower is better)
  const cancelledBookings = worker.bookingsAsCleaner.filter((b) => b.status === "CANCELLED").length;
  const cancellationRate = totalBookings > 0 ? 100 - (cancelledBookings / totalBookings) * 100 : 100;

  // Calculate repeat customer rate (0-100)
  const uniqueCustomers = new Set(worker.bookingsAsCleaner.map((b) => b.customerId)).size;
  const repeatCustomers = totalBookings > uniqueCustomers ? totalBookings - uniqueCustomers : 0;
  const repeatCustomerRate = uniqueCustomers > 0 ? (repeatCustomers / (totalBookings)) * 100 : 0;

  // Verification bonus (0-20)
  const verificationBonus = worker.workerProfile.verified ? 20 : 0;

  // Calculate overall score (weighted average)
  const weights = {
    rating: 0.30,
    responseTime: 0.15,
    completionRate: 0.20,
    cancellationRate: 0.15,
    repeatCustomerRate: 0.20,
  };

  const overallScore = Math.min(100,
    ratingScore * weights.rating +
    responseTimeScore * weights.responseTime +
    completionRate * weights.completionRate +
    cancellationRate * weights.cancellationRate +
    repeatCustomerRate * weights.repeatCustomerRate +
    verificationBonus
  );

  // Determine trend (compare to 3 months ago)
  const recentReviews = worker.reviewsReceived.filter((r) => r.createdAt >= subMonths(new Date(), 3));
  const olderReviews = worker.reviewsReceived.filter((r) => r.createdAt < subMonths(new Date(), 3));

  const recentAvg = recentReviews.length > 0
    ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length
    : avgRating;
  const olderAvg = olderReviews.length > 0
    ? olderReviews.reduce((sum, r) => sum + r.rating, 0) / olderReviews.length
    : avgRating;

  let trend: "improving" | "stable" | "declining" = "stable";
  if (recentAvg > olderAvg + 0.2) trend = "improving";
  else if (recentAvg < olderAvg - 0.2) trend = "declining";

  // Generate recommendations
  const recommendations: string[] = [];
  if (ratingScore < 80) recommendations.push("Focus on service quality to improve ratings");
  if (responseTimeScore < 60) recommendations.push("Try to respond to booking requests faster");
  if (completionRate < 90) recommendations.push("Reduce booking cancellations");
  if (repeatCustomerRate < 30) recommendations.push("Build relationships with customers for repeat business");
  if (!worker.workerProfile.verified) recommendations.push("Complete verification for a trust badge");

  // Get ranking
  const allWorkers = await prisma.workerProfile.count();

  return {
    workerId,
    workerName: `${worker.firstName} ${worker.lastName}`,
    overallScore: Math.round(overallScore * 10) / 10,
    breakdown: {
      rating: Math.round(ratingScore * 10) / 10,
      responseTime: Math.round(responseTimeScore * 10) / 10,
      completionRate: Math.round(completionRate * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      repeatCustomerRate: Math.round(repeatCustomerRate * 10) / 10,
      verificationBonus,
    },
    trend,
    recommendations,
    rank: 1, // Would need to calculate actual rank
    totalWorkers: allWorkers,
  };
}

/**
 * Get top performing workers
 */
export async function getTopWorkers(limit: number = 10): Promise<WorkerPerformanceScore[]> {
  const workers = await prisma.workerProfile.findMany({
    where: { isActive: true },
    include: { user: true },
    orderBy: { averageRating: "desc" },
    take: limit * 2, // Get more to calculate scores
  });

  const scores: WorkerPerformanceScore[] = [];

  for (const worker of workers) {
    const score = await getWorkerPerformanceScore(worker.userId);
    if (score) scores.push(score);
  }

  // Sort by overall score and take top
  return scores
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, limit)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

// ============================================
// CUSTOMER RETENTION METRICS
// ============================================

/**
 * Calculate customer retention metrics
 */
export async function getRetentionMetrics(): Promise<RetentionMetrics> {
  const sixMonthsAgo = subMonths(new Date(), 6);
  const twelveMonthsAgo = subMonths(new Date(), 12);

  // Get all customers with their bookings
  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      bookingsAsCustomer: {
        some: {
          createdAt: { gte: twelveMonthsAgo },
        },
      },
    },
    include: {
      bookingsAsCustomer: {
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "asc" },
        include: { payment: true },
      },
    },
  });

  // Calculate repeat booking rate
  const customersWithMultipleBookings = customers.filter(
    (c) => c.bookingsAsCustomer.length > 1
  ).length;
  const repeatBookingRate = customers.length > 0
    ? (customersWithMultipleBookings / customers.length) * 100
    : 0;

  // Calculate customer lifetime value
  let totalCLV = 0;
  for (const customer of customers) {
    const customerRevenue = customer.bookingsAsCustomer.reduce(
      (sum, b) => sum + (b.payment?.amount || b.totalPrice || 0),
      0
    );
    totalCLV += customerRevenue;
  }
  const customerLifetimeValue = customers.length > 0 ? totalCLV / customers.length : 0;

  // Calculate churn rate (customers who haven't booked in 3 months)
  const threeMonthsAgo = subMonths(new Date(), 3);
  const activeCustomers = customers.filter((c) =>
    c.bookingsAsCustomer.some((b) => b.createdAt >= threeMonthsAgo)
  ).length;
  const churnedCustomers = customers.length - activeCustomers;
  const churnRate = customers.length > 0
    ? (churnedCustomers / customers.length) * 100
    : 0;

  // Average bookings per customer
  const totalBookings = customers.reduce((sum, c) => sum + c.bookingsAsCustomer.length, 0);
  const averageBookingsPerCustomer = customers.length > 0
    ? totalBookings / customers.length
    : 0;

  // Generate cohort analysis
  const cohortAnalysis = await generateCohortAnalysis();

  // Retention by month
  const retentionByMonth = await calculateMonthlyRetention();

  return {
    repeatBookingRate: Math.round(repeatBookingRate * 10) / 10,
    customerLifetimeValue: Math.round(customerLifetimeValue * 100) / 100,
    churnRate: Math.round(churnRate * 10) / 10,
    averageBookingsPerCustomer: Math.round(averageBookingsPerCustomer * 10) / 10,
    cohortAnalysis,
    retentionByMonth,
  };
}

/**
 * Generate cohort analysis data
 */
async function generateCohortAnalysis(): Promise<CohortData[]> {
  const cohorts: CohortData[] = [];
  const now = new Date();

  // Analyze last 6 months of cohorts
  for (let i = 5; i >= 0; i--) {
    const cohortStart = startOfMonth(subMonths(now, i));
    const cohortEnd = endOfMonth(subMonths(now, i));
    const cohortMonth = format(cohortStart, "yyyy-MM");

    // Get customers who made their first booking in this cohort
    const cohortCustomers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        bookingsAsCustomer: {
          some: {
            createdAt: { gte: cohortStart, lte: cohortEnd },
            status: "COMPLETED",
          },
        },
      },
      include: {
        bookingsAsCustomer: {
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Filter to only first-time customers in this period
    const newCustomers = cohortCustomers.filter((c) => {
      const firstBooking = c.bookingsAsCustomer[0];
      return firstBooking && firstBooking.createdAt >= cohortStart && firstBooking.createdAt <= cohortEnd;
    });

    const totalCustomers = newCustomers.length;

    // Calculate retention at different intervals
    const retained = {
      month1: 0,
      month2: 0,
      month3: 0,
      month6: 0,
      month12: 0,
    };

    for (const customer of newCustomers) {
      const bookings = customer.bookingsAsCustomer;
      if (bookings.length < 2) continue;

      const firstBookingDate = bookings[0].createdAt;

      for (const booking of bookings.slice(1)) {
        const monthsSinceFirst = Math.floor(
          (booking.createdAt.getTime() - firstBookingDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
        );

        if (monthsSinceFirst >= 1 && monthsSinceFirst < 2) retained.month1++;
        if (monthsSinceFirst >= 2 && monthsSinceFirst < 3) retained.month2++;
        if (monthsSinceFirst >= 3 && monthsSinceFirst < 6) retained.month3++;
        if (monthsSinceFirst >= 6 && monthsSinceFirst < 12) retained.month6++;
        if (monthsSinceFirst >= 12) retained.month12++;
      }
    }

    cohorts.push({
      cohortMonth,
      totalCustomers,
      retained,
    });
  }

  return cohorts;
}

/**
 * Calculate monthly retention rates
 */
async function calculateMonthlyRetention(): Promise<{ month: string; rate: number }[]> {
  const results: { month: string; rate: number }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));
    const previousMonthStart = startOfMonth(subMonths(now, i + 1));
    const previousMonthEnd = endOfMonth(subMonths(now, i + 1));

    // Customers active in previous month
    const previousMonthCustomers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        bookingsAsCustomer: {
          some: {
            status: "COMPLETED",
            createdAt: { gte: previousMonthStart, lte: previousMonthEnd },
          },
        },
      },
      select: { id: true },
    });

    const previousCustomerIds = new Set(previousMonthCustomers.map((c) => c.id));

    // Of those, how many booked again this month
    const retainedCustomers = await prisma.booking.findMany({
      where: {
        status: "COMPLETED",
        createdAt: { gte: monthStart, lte: monthEnd },
        customerId: { in: Array.from(previousCustomerIds) },
      },
      select: { customerId: true },
      distinct: ["customerId"],
    });

    const retentionRate = previousCustomerIds.size > 0
      ? (retainedCustomers.length / previousCustomerIds.size) * 100
      : 0;

    results.push({
      month: format(monthStart, "yyyy-MM"),
      rate: Math.round(retentionRate * 10) / 10,
    });
  }

  return results;
}
