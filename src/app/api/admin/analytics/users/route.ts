import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { subDays, format, startOfDay, endOfDay, startOfMonth, subMonths } from "date-fns";

// Get user analytics for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const userType = searchParams.get("userType"); // CUSTOMER, WORKER, or null for all

    const since = subDays(new Date(), days);

    // Build user where clause
    const userWhereClause: Record<string, unknown> = {};
    if (userType === "CUSTOMER") {
      userWhereClause.role = "CUSTOMER";
    } else if (userType === "WORKER") {
      userWhereClause.role = "CLEANER";
    }

    // Get overview stats
    const [
      totalUsers,
      newUsersInPeriod,
      activeUsersInPeriod,
      verifiedUsers,
      suspendedUsers,
      bannedUsers,
    ] = await Promise.all([
      prisma.user.count({ where: userWhereClause }),
      prisma.user.count({ where: { ...userWhereClause, createdAt: { gte: since } } }),
      prisma.userEvent.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: since },
          userId: { not: null },
        },
      }).then(results => results.length),
      prisma.user.count({ where: { ...userWhereClause, emailVerified: { not: null } } }),
      prisma.user.count({ where: { ...userWhereClause, status: "SUSPENDED" } }),
      prisma.user.count({ where: { ...userWhereClause, status: "BANNED" } }),
    ]);

    // User growth trend (last N days)
    const growthTrend: { date: string; newUsers: number; totalUsers: number }[] = [];
    let runningTotal = await prisma.user.count({
      where: { ...userWhereClause, createdAt: { lt: since } },
    });

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = startOfDay(subDays(new Date(), i));
      const dayEnd = endOfDay(subDays(new Date(), i));

      const newOnDay = await prisma.user.count({
        where: { ...userWhereClause, createdAt: { gte: dayStart, lte: dayEnd } },
      });

      runningTotal += newOnDay;
      growthTrend.push({
        date: format(dayStart, "yyyy-MM-dd"),
        newUsers: newOnDay,
        totalUsers: runningTotal,
      });
    }

    // User acquisition sources (from UTM data)
    const acquisitionSources = await prisma.userEvent.groupBy({
      by: ["utmSource"],
      where: {
        createdAt: { gte: since },
        eventType: "SIGNUP",
        utmSource: { not: null },
      },
      _count: true,
      orderBy: { _count: { utmSource: "desc" } },
      take: 10,
    });

    // User devices
    const deviceBreakdown = await prisma.userEvent.groupBy({
      by: ["deviceType"],
      where: {
        createdAt: { gte: since },
        deviceType: { not: null },
      },
      _count: true,
    });

    // Browser breakdown
    const browserBreakdown = await prisma.userEvent.groupBy({
      by: ["browser"],
      where: {
        createdAt: { gte: since },
        browser: { not: null },
      },
      _count: true,
      orderBy: { _count: { browser: "desc" } },
      take: 10,
    });

    // OS breakdown
    const osBreakdown = await prisma.userEvent.groupBy({
      by: ["os"],
      where: {
        createdAt: { gte: since },
        os: { not: null },
      },
      _count: true,
      orderBy: { _count: { os: "desc" } },
      take: 10,
    });

    // Country breakdown
    const countryBreakdown = await prisma.userEvent.groupBy({
      by: ["ipCountry"],
      where: {
        createdAt: { gte: since },
        ipCountry: { not: null },
      },
      _count: true,
      orderBy: { _count: { ipCountry: "desc" } },
      take: 20,
    });

    // City breakdown
    const cityBreakdown = await prisma.userEvent.groupBy({
      by: ["ipCity", "ipCountry"],
      where: {
        createdAt: { gte: since },
        ipCity: { not: null },
      },
      _count: true,
      orderBy: { _count: { ipCity: "desc" } },
      take: 20,
    });

    // Language preferences
    const languageBreakdown = await prisma.userEvent.groupBy({
      by: ["language"],
      where: {
        createdAt: { gte: since },
        language: { not: null },
      },
      _count: true,
      orderBy: { _count: { language: "desc" } },
      take: 10,
    });

    // User retention (users who returned after signup)
    const retentionData = await calculateRetention(since, days);

    // Top pages visited
    const topPages = await prisma.userEvent.groupBy({
      by: ["pagePath"],
      where: {
        createdAt: { gte: since },
        eventType: "PAGE_VIEW",
        pagePath: { not: null },
      },
      _count: true,
      orderBy: { _count: { pagePath: "desc" } },
      take: 20,
    });

    // Average session duration
    const sessionStats = await prisma.userEvent.aggregate({
      where: {
        createdAt: { gte: since },
        timeOnPage: { not: null },
      },
      _avg: { timeOnPage: true },
      _sum: { timeOnPage: true },
    });

    // Scroll depth distribution
    const scrollDepthStats = await prisma.userEvent.aggregate({
      where: {
        createdAt: { gte: since },
        scrollDepth: { not: null },
      },
      _avg: { scrollDepth: true },
    });

    // Recent signups
    const recentSignups = await prisma.user.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        locationCity: true,
        locationCountry: true,
      },
    });

    // Worker-specific stats
    let workerStats = null;
    if (!userType || userType === "WORKER") {
      const [totalWorkers, verifiedWorkers, activeWorkers, avgRating] = await Promise.all([
        prisma.workerProfile.count(),
        prisma.workerProfile.count({ where: { verified: true } }),
        prisma.workerProfile.count({ where: { isActive: true } }),
        prisma.workerProfile.aggregate({ _avg: { averageRating: true } }),
      ]);

      workerStats = {
        total: totalWorkers,
        verified: verifiedWorkers,
        active: activeWorkers,
        averageRating: avgRating._avg.averageRating || 0,
        verificationRate: totalWorkers > 0 ? (verifiedWorkers / totalWorkers) * 100 : 0,
      };
    }

    // Customer-specific stats
    let customerStats = null;
    if (!userType || userType === "CUSTOMER") {
      const [totalCustomers, customersWithBookings, repeatCustomers] = await Promise.all([
        prisma.user.count({ where: { role: "CUSTOMER" } }),
        prisma.booking.groupBy({ by: ["customerId"] }).then(r => r.length),
        prisma.booking.groupBy({
          by: ["customerId"],
          having: { customerId: { _count: { gt: 1 } } },
        }).then(r => r.length),
      ]);

      customerStats = {
        total: totalCustomers,
        withBookings: customersWithBookings,
        repeatCustomers: repeatCustomers,
        bookingRate: totalCustomers > 0 ? (customersWithBookings / totalCustomers) * 100 : 0,
        repeatRate: customersWithBookings > 0 ? (repeatCustomers / customersWithBookings) * 100 : 0,
      };
    }

    return NextResponse.json({
      overview: {
        totalUsers,
        newUsersInPeriod,
        activeUsersInPeriod,
        verifiedUsers,
        suspendedUsers,
        bannedUsers,
        verificationRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 1000) / 10 : 0,
        growthRate: totalUsers > newUsersInPeriod && totalUsers > 0
          ? Math.round((newUsersInPeriod / (totalUsers - newUsersInPeriod)) * 1000) / 10
          : 0,
      },
      growthTrend,
      acquisitionSources: acquisitionSources.map(s => ({
        source: s.utmSource || "Direct",
        count: s._count,
      })),
      deviceBreakdown: deviceBreakdown.map(d => ({
        device: d.deviceType || "Unknown",
        count: d._count,
      })),
      browserBreakdown: browserBreakdown.map(b => ({
        browser: b.browser || "Unknown",
        count: b._count,
      })),
      osBreakdown: osBreakdown.map(o => ({
        os: o.os || "Unknown",
        count: o._count,
      })),
      countryBreakdown: countryBreakdown.map(c => ({
        country: c.ipCountry || "Unknown",
        count: c._count,
      })),
      cityBreakdown: cityBreakdown.map(c => ({
        city: c.ipCity || "Unknown",
        country: c.ipCountry || "",
        count: c._count,
      })),
      languageBreakdown: languageBreakdown.map(l => ({
        language: l.language || "Unknown",
        count: l._count,
      })),
      retention: retentionData,
      topPages: topPages.map(p => ({
        path: p.pagePath || "/",
        views: p._count,
      })),
      engagement: {
        avgTimeOnPage: sessionStats._avg.timeOnPage || 0,
        totalTimeOnSite: sessionStats._sum.timeOnPage || 0,
        avgScrollDepth: scrollDepthStats._avg.scrollDepth || 0,
      },
      recentSignups: recentSignups.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
        status: u.status,
        verified: !!u.emailVerified,
        location: u.locationCity ? `${u.locationCity}, ${u.locationCountry}` : null,
        joinedAt: u.createdAt,
      })),
      workerStats,
      customerStats,
    });
  } catch (error) {
    console.error("Error getting user analytics:", error);
    return NextResponse.json(
      { error: "Failed to get user analytics" },
      { status: 500 }
    );
  }
}

async function calculateRetention(since: Date, days: number) {
  // Get users who signed up each week and check if they returned
  const weeks = Math.ceil(days / 7);
  const retention: { week: string; signups: number; returned: number; rate: number }[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfDay(subDays(new Date(), (i + 1) * 7));
    const weekEnd = endOfDay(subDays(new Date(), i * 7));

    // Users who signed up that week
    const signedUp = await prisma.user.findMany({
      where: { createdAt: { gte: weekStart, lte: weekEnd } },
      select: { id: true },
    });

    const userIds = signedUp.map(u => u.id);

    // Of those, how many had activity after signup week
    const returned = userIds.length > 0 ? await prisma.userEvent.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        createdAt: { gt: weekEnd },
      },
    }).then(r => r.length) : 0;

    retention.push({
      week: format(weekStart, "MMM d"),
      signups: signedUp.length,
      returned,
      rate: signedUp.length > 0 ? Math.round((returned / signedUp.length) * 100) : 0,
    });
  }

  return retention;
}
