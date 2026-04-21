import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { subDays, format, startOfDay, endOfDay } from "date-fns";

// Get demand analytics for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const city = searchParams.get("city");
    const professionId = searchParams.get("professionId");

    const since = subDays(new Date(), days);

    // Build where clause
    const whereClause: Record<string, unknown> = {
      createdAt: { gte: since },
    };
    if (city) whereClause.city = { equals: city, mode: "insensitive" };
    if (professionId) whereClause.professionId = professionId;

    // Get overview stats
    const [
      totalSignals,
      matchedSignals,
      waitlistCount,
      bookingsCreated,
    ] = await Promise.all([
      prisma.demandSignal.count({ where: whereClause }),
      prisma.demandSignal.count({ where: { ...whereClause, wasMatched: true } }),
      prisma.demandSignal.count({
        where: { ...whereClause, joinedWaitlist: true, waitlistNotified: false },
      }),
      prisma.demandSignal.count({ where: { ...whereClause, bookingCreated: true } }),
    ]);

    const matchRate = totalSignals > 0 ? (matchedSignals / totalSignals) * 100 : 0;
    const conversionRate = totalSignals > 0 ? (bookingsCreated / totalSignals) * 100 : 0;

    // Get demand by type
    const demandByType = await prisma.demandSignal.groupBy({
      by: ["signalType"],
      where: whereClause,
      _count: true,
    });

    // Get demand by city
    const demandByCity = await prisma.demandSignal.groupBy({
      by: ["city"],
      where: { ...whereClause, city: { not: null } },
      _count: true,
      orderBy: { _count: { city: "desc" } },
      take: 20,
    });

    // Get demand by profession
    const demandByProfession = await prisma.demandSignal.groupBy({
      by: ["professionId"],
      where: { ...whereClause, professionId: { not: null } },
      _count: true,
      orderBy: { _count: { professionId: "desc" } },
      take: 20,
    });

    // Get profession names
    const professionIds = demandByProfession.map((d) => d.professionId).filter(Boolean) as string[];
    const professions = await prisma.profession.findMany({
      where: { id: { in: professionIds } },
      select: { id: true, name: true, nameDE: true, emoji: true },
    });
    const professionMap = new Map(professions.map((p) => [p.id, p]));

    // Get demand trend over time
    const demandTrend: { date: string; count: number; matched: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = startOfDay(subDays(new Date(), i));
      const dayEnd = endOfDay(subDays(new Date(), i));

      const [count, matched] = await Promise.all([
        prisma.demandSignal.count({
          where: { ...whereClause, createdAt: { gte: dayStart, lte: dayEnd } },
        }),
        prisma.demandSignal.count({
          where: { ...whereClause, createdAt: { gte: dayStart, lte: dayEnd }, wasMatched: true },
        }),
      ]);

      demandTrend.push({
        date: format(dayStart, "yyyy-MM-dd"),
        count,
        matched,
      });
    }

    // Get supply gaps (high demand, low supply)
    const supplyGaps = await getSupplyGaps();

    // Get recent unmatched searches
    const recentUnmatched = await prisma.demandSignal.findMany({
      where: { ...whereClause, wasMatched: false },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        profession: { select: { name: true, emoji: true } },
      },
    });

    // Get active waitlist
    const activeWaitlist = await prisma.demandSignal.findMany({
      where: {
        joinedWaitlist: true,
        waitlistNotified: false,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        profession: { select: { name: true, emoji: true } },
        customer: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json({
      overview: {
        totalSignals,
        matchedSignals,
        unmatchedSignals: totalSignals - matchedSignals,
        waitlistCount,
        bookingsCreated,
        matchRate: Math.round(matchRate * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
      },
      demandByType: demandByType.map((d) => ({
        type: d.signalType,
        count: d._count,
      })),
      demandByCity: demandByCity.map((d) => ({
        city: d.city,
        count: d._count,
      })),
      demandByProfession: demandByProfession.map((d) => ({
        profession: professionMap.get(d.professionId || ""),
        count: d._count,
      })),
      demandTrend,
      supplyGaps,
      recentUnmatched: recentUnmatched.map((s) => ({
        id: s.id,
        profession: s.profession?.name,
        emoji: s.profession?.emoji,
        city: s.city,
        country: s.country,
        searchQuery: s.searchQuery,
        requestedDate: s.requestedDate,
        createdAt: s.createdAt,
      })),
      activeWaitlist: activeWaitlist.map((w) => ({
        id: w.id,
        profession: w.profession?.name,
        emoji: w.profession?.emoji,
        city: w.city,
        country: w.country,
        customer: w.customer
          ? `${w.customer.firstName} ${w.customer.lastName}`
          : "Anonymous",
        email: w.customer?.email,
        joinedAt: w.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error getting demand analytics:", error);
    return NextResponse.json(
      { error: "Failed to get demand analytics" },
      { status: 500 }
    );
  }
}

async function getSupplyGaps() {
  // Get demand counts by city
  const demandByCity = await prisma.demandSignal.groupBy({
    by: ["city", "country"],
    where: {
      createdAt: { gte: subDays(new Date(), 30) },
      city: { not: null },
    },
    _count: true,
  });

  // Get worker counts by city
  const workersByCity = await prisma.workerProfile.groupBy({
    by: ["city"],
    where: {
      isActive: true,
      onboardingComplete: true,
      city: { not: null },
    },
    _count: true,
  });

  const workerCounts = new Map(workersByCity.map((w) => [w.city?.toLowerCase(), w._count]));

  // Calculate gaps
  const gaps = demandByCity.map((d) => {
    const workerCount = workerCounts.get(d.city?.toLowerCase() || "") || 0;
    const demandCount = d._count;
    const gap = demandCount - workerCount * 10; // Each worker can handle ~10 bookings/month

    return {
      city: d.city,
      country: d.country,
      demandCount,
      workerCount,
      gap,
      severity: gap > 50 ? "critical" : gap > 20 ? "high" : gap > 5 ? "moderate" : "low",
    };
  });

  // Sort by gap (highest first)
  return gaps
    .filter((g) => g.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 20);
}
