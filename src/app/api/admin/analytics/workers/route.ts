import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { subDays, format, startOfDay, endOfDay } from "date-fns";

// Get worker analytics for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const since = subDays(new Date(), days);

    // Worker overview stats
    const [
      totalWorkers,
      activeWorkers,
      verifiedWorkers,
      newWorkersInPeriod,
      workersWithBookings,
    ] = await Promise.all([
      prisma.workerProfile.count(),
      prisma.workerProfile.count({ where: { isActive: true } }),
      prisma.workerProfile.count({ where: { verified: true } }),
      prisma.workerProfile.count({ where: { createdAt: { gte: since } } }),
      prisma.booking.groupBy({
        by: ["workerId"],
        where: { createdAt: { gte: since } },
      }).then(r => r.length),
    ]);

    // Aggregate worker stats
    const workerAggregates = await prisma.workerProfile.aggregate({
      _avg: {
        averageRating: true,
        hourlyRate: true,
        experienceYears: true,
        responseTime: true,
      },
      _sum: {
        totalBookings: true,
      },
    });

    // Earnings stats
    const earningsStats = await prisma.earning.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { amount: true, platformFee: true },
      _avg: { amount: true },
    });

    // Earnings trend by day
    const earningsTrend: { date: string; earnings: number; bookings: number; avgPerBooking: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = startOfDay(subDays(new Date(), i));
      const dayEnd = endOfDay(subDays(new Date(), i));

      const [dayEarnings, dayBookings] = await Promise.all([
        prisma.earning.aggregate({
          where: { createdAt: { gte: dayStart, lte: dayEnd } },
          _sum: { amount: true },
        }),
        prisma.booking.count({
          where: { createdAt: { gte: dayStart, lte: dayEnd }, status: "COMPLETED" },
        }),
      ]);

      const totalEarnings = dayEarnings._sum.amount || 0;
      earningsTrend.push({
        date: format(dayStart, "yyyy-MM-dd"),
        earnings: totalEarnings,
        bookings: dayBookings,
        avgPerBooking: dayBookings > 0 ? totalEarnings / dayBookings : 0,
      });
    }

    // Top performers by earnings
    const topEarners = await prisma.earning.groupBy({
      by: ["workerId"],
      where: { createdAt: { gte: since } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: 20,
    });

    // Get worker details for top earners
    const topEarnerIds = topEarners.map(e => e.workerId);
    const topEarnerProfiles = await prisma.workerProfile.findMany({
      where: { id: { in: topEarnerIds } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, avatar: true } },
        professions: {
          where: { isPrimary: true },
          include: { profession: { select: { name: true, emoji: true } } },
          take: 1,
        },
      },
    });
    const earnerMap = new Map(topEarnerProfiles.map(p => [p.id, p]));

    // Top performers by rating
    const topRated = await prisma.workerProfile.findMany({
      where: {
        averageRating: { gte: 4.5 },
        totalBookings: { gte: 5 },
      },
      orderBy: [
        { averageRating: "desc" },
        { totalBookings: "desc" },
      ],
      take: 20,
      include: {
        user: { select: { firstName: true, lastName: true, avatar: true } },
        professions: {
          where: { isPrimary: true },
          include: { profession: { select: { name: true, emoji: true } } },
          take: 1,
        },
      },
    });

    // Workers by response time (fastest responders)
    const fastestResponders = await prisma.workerProfile.findMany({
      where: {
        responseTime: { not: null, gt: 0 },
        isActive: true,
      },
      orderBy: { responseTime: "asc" },
      take: 20,
      include: {
        user: { select: { firstName: true, lastName: true } },
        professions: {
          where: { isPrimary: true },
          include: { profession: { select: { name: true, emoji: true } } },
          take: 1,
        },
      },
    });

    // Booking completion rate by worker
    const completionRates = await prisma.$queryRaw<Array<{
      workerId: string;
      total: bigint;
      completed: bigint;
    }>>`
      SELECT
        "workerId",
        COUNT(*) as total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
      FROM "Booking"
      WHERE "createdAt" >= ${since}
      GROUP BY "workerId"
      HAVING COUNT(*) >= 5
      ORDER BY (SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END)::float / COUNT(*)::float) DESC
      LIMIT 20
    `;

    // Get profiles for completion rates
    const completionWorkerIds = completionRates.map(c => c.workerId);
    const completionProfiles = await prisma.workerProfile.findMany({
      where: { id: { in: completionWorkerIds } },
      include: {
        user: { select: { firstName: true, lastName: true } },
        professions: {
          where: { isPrimary: true },
          include: { profession: { select: { name: true, emoji: true } } },
          take: 1,
        },
      },
    });
    const completionMap = new Map(completionProfiles.map(p => [p.id, p]));

    // Workers by profession (using junction table)
    const workersByProfession = await prisma.workerProfession.groupBy({
      by: ["professionId"],
      _count: true,
      orderBy: { _count: { professionId: "desc" } },
      take: 20,
    });

    // Get profession names and worker stats per profession
    const professionIds = workersByProfession.map(p => p.professionId);
    const professions = await prisma.profession.findMany({
      where: { id: { in: professionIds } },
      select: { id: true, name: true, emoji: true },
    });
    const professionMap = new Map(professions.map(p => [p.id, p]));

    // Workers by city
    const workersByCity = await prisma.workerProfile.groupBy({
      by: ["city", "country"],
      where: { city: { not: null } },
      _count: true,
      orderBy: { _count: { city: "desc" } },
      take: 20,
    });

    // Availability patterns
    const availabilityStats = await prisma.workerProfile.groupBy({
      by: ["availableNow"],
      _count: true,
    });

    // Service offerings
    const serviceOfferings = await prisma.workerService.groupBy({
      by: ["serviceId"],
      _count: true,
      _avg: { customPrice: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 15,
    });

    const serviceIds = serviceOfferings.map(s => s.serviceId);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    });
    const serviceMap = new Map(services.map(s => [s.id, s]));

    // Recent worker signups
    const recentSignups = await prisma.workerProfile.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        user: { select: { firstName: true, lastName: true, email: true, createdAt: true } },
        professions: {
          where: { isPrimary: true },
          include: { profession: { select: { name: true, emoji: true } } },
          take: 1,
        },
      },
    });

    // Hourly rate distribution
    const rateDistribution = await prisma.workerProfile.aggregate({
      _min: { hourlyRate: true },
      _max: { hourlyRate: true },
      _avg: { hourlyRate: true },
    });

    // Rate brackets
    const rateBrackets = await Promise.all([
      prisma.workerProfile.count({ where: { hourlyRate: { lt: 20 } } }),
      prisma.workerProfile.count({ where: { hourlyRate: { gte: 20, lt: 30 } } }),
      prisma.workerProfile.count({ where: { hourlyRate: { gte: 30, lt: 40 } } }),
      prisma.workerProfile.count({ where: { hourlyRate: { gte: 40, lt: 50 } } }),
      prisma.workerProfile.count({ where: { hourlyRate: { gte: 50 } } }),
    ]);

    // Verification stats
    const verificationStats = {
      total: totalWorkers,
      verified: verifiedWorkers,
      pending: totalWorkers - verifiedWorkers,
      rate: totalWorkers > 0 ? Math.round((verifiedWorkers / totalWorkers) * 100) : 0,
    };

    // Onboarding funnel
    const onboardingStats = await Promise.all([
      prisma.user.count({ where: { role: "CLEANER" } }),
      prisma.workerProfile.count(),
      prisma.workerProfile.count({ where: { onboardingComplete: true } }),
      prisma.workerProfile.count({ where: { verified: true } }),
      prisma.workerProfile.count({ where: { totalBookings: { gt: 0 } } }),
    ]);

    return NextResponse.json({
      overview: {
        totalWorkers,
        activeWorkers,
        verifiedWorkers,
        newWorkersInPeriod,
        workersWithBookings,
        avgRating: workerAggregates._avg.averageRating || 0,
        avgHourlyRate: workerAggregates._avg.hourlyRate || 0,
        avgExperience: workerAggregates._avg.experienceYears || 0,
        avgResponseTime: workerAggregates._avg.responseTime || 0,
        totalBookingsAllTime: workerAggregates._sum.totalBookings || 0,
      },
      earnings: {
        totalInPeriod: earningsStats._sum.amount || 0,
        platformFeesInPeriod: earningsStats._sum.platformFee || 0,
        avgPerBooking: earningsStats._avg.amount || 0,
      },
      earningsTrend,
      topEarners: topEarners.map(e => ({
        worker: earnerMap.get(e.workerId),
        totalEarnings: e._sum.amount || 0,
        bookings: e._count,
      })),
      topRated: topRated.map(w => ({
        id: w.id,
        name: `${w.user.firstName} ${w.user.lastName}`,
        avatar: w.user.avatar,
        profession: w.professions[0]?.profession || null,
        rating: w.averageRating,
        totalBookings: w.totalBookings,
      })),
      fastestResponders: fastestResponders.map(w => ({
        id: w.id,
        name: `${w.user.firstName} ${w.user.lastName}`,
        profession: w.professions[0]?.profession || null,
        responseTimeMinutes: w.responseTime,
      })),
      completionRates: completionRates.map(c => ({
        worker: completionMap.get(c.workerId),
        total: Number(c.total),
        completed: Number(c.completed),
        rate: Number(c.total) > 0 ? Math.round((Number(c.completed) / Number(c.total)) * 100) : 0,
      })),
      byProfession: workersByProfession.map(p => ({
        profession: professionMap.get(p.professionId),
        count: p._count,
      })),
      byCity: workersByCity.map(c => ({
        city: c.city,
        country: c.country,
        count: c._count,
      })),
      availability: {
        availableNow: availabilityStats.find(a => a.availableNow)?._count || 0,
        notAvailable: availabilityStats.find(a => !a.availableNow)?._count || 0,
      },
      serviceOfferings: serviceOfferings.map(s => ({
        service: serviceMap.get(s.serviceId),
        workerCount: s._count,
        avgPrice: s._avg.customPrice || 0,
      })),
      recentSignups: recentSignups.map(w => ({
        id: w.id,
        name: `${w.user.firstName} ${w.user.lastName}`,
        email: w.user.email,
        profession: w.professions[0]?.profession || null,
        hourlyRate: w.hourlyRate,
        verified: w.verified,
        onboardingComplete: w.onboardingComplete,
        joinedAt: w.createdAt,
      })),
      rateDistribution: {
        min: rateDistribution._min.hourlyRate || 0,
        max: rateDistribution._max.hourlyRate || 0,
        avg: rateDistribution._avg.hourlyRate || 0,
        brackets: [
          { range: "<€20", count: rateBrackets[0] },
          { range: "€20-30", count: rateBrackets[1] },
          { range: "€30-40", count: rateBrackets[2] },
          { range: "€40-50", count: rateBrackets[3] },
          { range: ">€50", count: rateBrackets[4] },
        ],
      },
      verification: verificationStats,
      onboardingFunnel: {
        registered: onboardingStats[0],
        profileCreated: onboardingStats[1],
        onboardingComplete: onboardingStats[2],
        verified: onboardingStats[3],
        hasBookings: onboardingStats[4],
      },
    });
  } catch (error) {
    console.error("Error getting worker analytics:", error);
    return NextResponse.json(
      { error: "Failed to get worker analytics" },
      { status: 500 }
    );
  }
}
