import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { subDays, format, startOfDay, endOfDay, startOfMonth, subMonths } from "date-fns";

// Get platform health and performance analytics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const since = subDays(new Date(), days);

    // Revenue metrics
    const [totalRevenue, revenueInPeriod, completedBookingsRevenue] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: "SUCCEEDED" },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: "SUCCEEDED", createdAt: { gte: since } },
        _sum: { amount: true },
      }),
      prisma.booking.aggregate({
        where: { status: "COMPLETED", createdAt: { gte: since } },
        _sum: { totalPrice: true },
      }),
    ]);

    // Platform fees collected
    const platformFees = await prisma.payment.aggregate({
      where: { status: "SUCCEEDED", createdAt: { gte: since } },
      _sum: { platformFee: true },
    });

    // Revenue trend by day
    const revenueTrend: { date: string; revenue: number; bookings: number; fees: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = startOfDay(subDays(new Date(), i));
      const dayEnd = endOfDay(subDays(new Date(), i));

      const [dayRevenue, dayBookings, dayFees] = await Promise.all([
        prisma.payment.aggregate({
          where: { status: "SUCCEEDED", createdAt: { gte: dayStart, lte: dayEnd } },
          _sum: { amount: true },
        }),
        prisma.booking.count({
          where: { createdAt: { gte: dayStart, lte: dayEnd } },
        }),
        prisma.payment.aggregate({
          where: { status: "SUCCEEDED", createdAt: { gte: dayStart, lte: dayEnd } },
          _sum: { platformFee: true },
        }),
      ]);

      revenueTrend.push({
        date: format(dayStart, "yyyy-MM-dd"),
        revenue: dayRevenue._sum.amount || 0,
        bookings: dayBookings,
        fees: dayFees._sum.platformFee || 0,
      });
    }

    // Booking stats
    const [
      totalBookings,
      bookingsInPeriod,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      confirmedBookings,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { createdAt: { gte: since } } }),
      prisma.booking.count({ where: { status: "COMPLETED", createdAt: { gte: since } } }),
      prisma.booking.count({ where: { status: "CANCELLED", createdAt: { gte: since } } }),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
    ]);

    // Average booking value
    const avgBookingValue = await prisma.booking.aggregate({
      where: { createdAt: { gte: since } },
      _avg: { totalPrice: true },
    });

    // Booking status distribution
    const bookingsByStatus = await prisma.booking.groupBy({
      by: ["status"],
      _count: true,
    });

    // Payment methods distribution
    const paymentsByMethod = await prisma.payment.groupBy({
      by: ["paymentMethod"],
      where: { createdAt: { gte: since } },
      _count: true,
      _sum: { amount: true },
    });

    // Payment status distribution
    const paymentsByStatus = await prisma.payment.groupBy({
      by: ["status"],
      where: { createdAt: { gte: since } },
      _count: true,
    });

    // Review stats
    const [totalReviews, reviewsInPeriod, avgRating] = await Promise.all([
      prisma.review.count(),
      prisma.review.count({ where: { createdAt: { gte: since } } }),
      prisma.review.aggregate({ _avg: { rating: true } }),
    ]);

    // Rating distribution
    const ratingDistribution = await prisma.review.groupBy({
      by: ["rating"],
      _count: true,
      orderBy: { rating: "desc" },
    });

    // Message stats
    const [totalMessages, messagesInPeriod] = await Promise.all([
      prisma.message.count(),
      prisma.message.count({ where: { createdAt: { gte: since } } }),
    ]);

    // API/Event tracking stats (from UserEvent)
    const [totalEvents, eventsInPeriod, uniqueSessions] = await Promise.all([
      prisma.userEvent.count(),
      prisma.userEvent.count({ where: { createdAt: { gte: since } } }),
      prisma.userEvent.groupBy({
        by: ["sessionId"],
        where: { createdAt: { gte: since }, sessionId: { not: null } },
      }).then(r => r.length),
    ]);

    // Event types distribution
    const eventsByType = await prisma.userEvent.groupBy({
      by: ["eventType"],
      where: { createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { eventType: "desc" } },
      take: 15,
    });

    // Error events (looking for error-related events)
    const errorEvents = await prisma.userEvent.count({
      where: {
        createdAt: { gte: since },
        eventType: { in: ["PAYMENT_FAILURE", "BOOKING_CANCEL"] },
      },
    });

    // Page load performance (from scroll depth and time on page data)
    const pagePerformance = await prisma.userEvent.aggregate({
      where: {
        createdAt: { gte: since },
        timeOnPage: { not: null },
      },
      _avg: { timeOnPage: true, scrollDepth: true },
    });

    // Services stats
    const [totalServices, activeServices] = await Promise.all([
      prisma.service.count(),
      prisma.service.count({ where: { isActive: true } }),
    ]);

    // Top services by bookings
    const topServices = await prisma.booking.groupBy({
      by: ["serviceId"],
      where: { createdAt: { gte: since } },
      _count: true,
      _sum: { totalPrice: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 10,
    });

    // Get service names
    const serviceIds = topServices.map(s => s.serviceId).filter(Boolean) as string[];
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true, icon: true },
    });
    const serviceMap = new Map(services.map(s => [s.id, s]));

    // Funnel analysis (conversion rates)
    const [
      pageViews,
      searchEvents,
      workerViews,
      bookingStarts,
      bookingCompletes,
      paymentSuccesses,
    ] = await Promise.all([
      prisma.userEvent.count({ where: { createdAt: { gte: since }, eventType: "PAGE_VIEW" } }),
      prisma.userEvent.count({ where: { createdAt: { gte: since }, eventType: "SEARCH" } }),
      prisma.userEvent.count({ where: { createdAt: { gte: since }, eventType: "WORKER_VIEW" } }),
      prisma.userEvent.count({ where: { createdAt: { gte: since }, eventType: "BOOKING_START" } }),
      prisma.userEvent.count({ where: { createdAt: { gte: since }, eventType: "BOOKING_COMPLETE" } }),
      prisma.userEvent.count({ where: { createdAt: { gte: since }, eventType: "PAYMENT_SUCCESS" } }),
    ]);

    // Notification stats
    const [totalNotifications, pendingNotifications] = await Promise.all([
      prisma.notificationLog.count(),
      prisma.notificationLog.count({ where: { sent: false } }),
    ]);

    // Database size estimation (record counts)
    const dbStats = await Promise.all([
      prisma.user.count().then(c => ({ table: "users", count: c })),
      prisma.workerProfile.count().then(c => ({ table: "worker_profiles", count: c })),
      prisma.booking.count().then(c => ({ table: "bookings", count: c })),
      prisma.payment.count().then(c => ({ table: "payments", count: c })),
      prisma.review.count().then(c => ({ table: "reviews", count: c })),
      prisma.message.count().then(c => ({ table: "messages", count: c })),
      prisma.userEvent.count().then(c => ({ table: "user_events", count: c })),
      prisma.notificationLog.count().then(c => ({ table: "notifications", count: c })),
    ]);

    return NextResponse.json({
      revenue: {
        totalAllTime: totalRevenue._sum.amount || 0,
        inPeriod: revenueInPeriod._sum.amount || 0,
        fromBookings: completedBookingsRevenue._sum.totalPrice || 0,
        platformFees: platformFees._sum.platformFee || 0,
        avgBookingValue: avgBookingValue._avg.totalPrice || 0,
      },
      revenueTrend,
      bookings: {
        total: totalBookings,
        inPeriod: bookingsInPeriod,
        completed: completedBookings,
        cancelled: cancelledBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        completionRate: bookingsInPeriod > 0
          ? Math.round((completedBookings / bookingsInPeriod) * 100)
          : 0,
        cancellationRate: bookingsInPeriod > 0
          ? Math.round((cancelledBookings / bookingsInPeriod) * 100)
          : 0,
      },
      bookingsByStatus: bookingsByStatus.map(b => ({
        status: b.status,
        count: b._count,
      })),
      payments: {
        byMethod: paymentsByMethod.map(p => ({
          method: p.paymentMethod,
          count: p._count,
          total: p._sum.amount || 0,
        })),
        byStatus: paymentsByStatus.map(p => ({
          status: p.status,
          count: p._count,
        })),
      },
      reviews: {
        total: totalReviews,
        inPeriod: reviewsInPeriod,
        avgRating: avgRating._avg.rating || 0,
        distribution: ratingDistribution.map(r => ({
          rating: r.rating,
          count: r._count,
        })),
      },
      messaging: {
        totalMessages,
        inPeriod: messagesInPeriod,
      },
      events: {
        total: totalEvents,
        inPeriod: eventsInPeriod,
        uniqueSessions,
        errors: errorEvents,
        byType: eventsByType.map(e => ({
          type: e.eventType,
          count: e._count,
        })),
      },
      performance: {
        avgTimeOnPage: pagePerformance._avg.timeOnPage || 0,
        avgScrollDepth: pagePerformance._avg.scrollDepth || 0,
      },
      services: {
        total: totalServices,
        active: activeServices,
        top: topServices.map(s => ({
          service: s.serviceId ? serviceMap.get(s.serviceId) : null,
          bookings: s._count,
          revenue: s._sum.totalPrice || 0,
        })),
      },
      funnel: {
        pageViews,
        searches: searchEvents,
        workerViews,
        bookingStarts,
        bookingCompletes,
        paymentSuccesses,
        searchToBookingRate: searchEvents > 0
          ? Math.round((bookingStarts / searchEvents) * 100)
          : 0,
        bookingCompletionRate: bookingStarts > 0
          ? Math.round((bookingCompletes / bookingStarts) * 100)
          : 0,
        paymentSuccessRate: bookingCompletes > 0
          ? Math.round((paymentSuccesses / bookingCompletes) * 100)
          : 0,
      },
      notifications: {
        total: totalNotifications,
        pending: pendingNotifications,
      },
      database: {
        tables: dbStats,
        totalRecords: dbStats.reduce((sum, t) => sum + t.count, 0),
      },
    });
  } catch (error) {
    console.error("Error getting platform analytics:", error);
    return NextResponse.json(
      { error: "Failed to get platform analytics" },
      { status: 500 }
    );
  }
}
