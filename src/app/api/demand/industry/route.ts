import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IndustryStatsSource } from "@prisma/client";

// Get industry statistics for a profession/location
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const professionId = searchParams.get("professionId");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const country = searchParams.get("country") || "DE";

    // Try to find stats at different granularities (city > state > country)
    let stats = null;

    if (professionId) {
      // Try city-level first
      if (city) {
        stats = await prisma.industryStats.findFirst({
          where: {
            professionId,
            city: { equals: city, mode: "insensitive" },
            country: { equals: country, mode: "insensitive" },
          },
          orderBy: { periodEnd: "desc" },
          include: {
            profession: {
              select: { name: true, nameDE: true, emoji: true },
            },
          },
        });
      }

      // Fall back to state-level
      if (!stats && state) {
        stats = await prisma.industryStats.findFirst({
          where: {
            professionId,
            city: null,
            state: { equals: state, mode: "insensitive" },
            country: { equals: country, mode: "insensitive" },
          },
          orderBy: { periodEnd: "desc" },
          include: {
            profession: {
              select: { name: true, nameDE: true, emoji: true },
            },
          },
        });
      }

      // Fall back to country-level
      if (!stats) {
        stats = await prisma.industryStats.findFirst({
          where: {
            professionId,
            city: null,
            state: null,
            country: { equals: country, mode: "insensitive" },
          },
          orderBy: { periodEnd: "desc" },
          include: {
            profession: {
              select: { name: true, nameDE: true, emoji: true },
            },
          },
        });
      }
    }

    // If no specific profession stats, get general market data
    if (!stats) {
      // Return default industry estimates
      return NextResponse.json({
        source: "ESTIMATED",
        location: { city, state, country },
        data: getDefaultIndustryData(country),
        message: "Based on industry research and market data",
      });
    }

    return NextResponse.json({
      source: stats.source,
      profession: stats.profession,
      location: {
        city: stats.city,
        state: stats.state,
        country: stats.country,
      },
      earnings: {
        avgHourlyRate: stats.avgHourlyRate,
        minHourlyRate: stats.minHourlyRate,
        maxHourlyRate: stats.maxHourlyRate,
        avgMonthlyEarnings: stats.avgMonthlyEarnings,
        avgWeeklyBookings: stats.avgWeeklyBookings,
        avgBookingValue: stats.avgBookingValue,
      },
      market: {
        totalWorkers: stats.totalWorkers,
        totalCustomers: stats.totalCustomers,
        demandScore: stats.demandScore,
        supplyScore: stats.supplyScore,
        opportunityScore: stats.opportunityScore,
      },
      metadata: {
        sampleSize: stats.sampleSize,
        confidence: stats.confidence,
        lastUpdated: stats.lastUpdated,
        periodStart: stats.periodStart,
        periodEnd: stats.periodEnd,
      },
    });
  } catch (error) {
    console.error("Error getting industry stats:", error);
    return NextResponse.json(
      { error: "Failed to get industry statistics" },
      { status: 500 }
    );
  }
}

// Create or update industry stats (admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      professionId,
      city,
      state,
      country,
      avgHourlyRate,
      minHourlyRate,
      maxHourlyRate,
      avgMonthlyEarnings,
      avgWeeklyBookings,
      avgBookingValue,
      totalWorkers,
      totalCustomers,
      source,
    } = body;

    if (!professionId || !country || !avgHourlyRate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate scores
    const demandScore = Math.min(100, (totalCustomers || 0) / 10);
    const supplyScore = Math.min(100, (totalWorkers || 0) / 10);
    const opportunityScore = Math.max(0, demandScore - supplyScore + 50);

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const stats = await prisma.industryStats.upsert({
      where: {
        professionId_city_state_country_periodStart: {
          professionId,
          city: city || null,
          state: state || null,
          country,
          periodStart,
        },
      },
      update: {
        avgHourlyRate,
        minHourlyRate,
        maxHourlyRate,
        avgMonthlyEarnings,
        avgWeeklyBookings,
        avgBookingValue,
        totalWorkers: totalWorkers || 0,
        totalCustomers: totalCustomers || 0,
        demandScore,
        supplyScore,
        opportunityScore,
        source: source || IndustryStatsSource.ESTIMATED,
        lastUpdated: now,
      },
      create: {
        professionId,
        city: city || null,
        state: state || null,
        country,
        avgHourlyRate,
        minHourlyRate,
        maxHourlyRate,
        avgMonthlyEarnings,
        avgWeeklyBookings,
        avgBookingValue,
        totalWorkers: totalWorkers || 0,
        totalCustomers: totalCustomers || 0,
        demandScore,
        supplyScore,
        opportunityScore,
        source: source || IndustryStatsSource.ESTIMATED,
        periodStart,
        periodEnd,
      },
    });

    return NextResponse.json({ success: true, id: stats.id });
  } catch (error) {
    console.error("Error creating industry stats:", error);
    return NextResponse.json(
      { error: "Failed to create industry statistics" },
      { status: 500 }
    );
  }
}

// Default industry data based on country research
function getDefaultIndustryData(country: string) {
  const data: Record<string, Record<string, number | string>> = {
    DE: {
      currency: "EUR",
      avgHourlyRate: 25,
      minHourlyRate: 15,
      maxHourlyRate: 45,
      avgMonthlyEarnings: 3200,
      avgWeeklyBookings: 12,
      avgBookingValue: 75,
    },
    AT: {
      currency: "EUR",
      avgHourlyRate: 28,
      minHourlyRate: 18,
      maxHourlyRate: 50,
      avgMonthlyEarnings: 3500,
      avgWeeklyBookings: 10,
      avgBookingValue: 85,
    },
    CH: {
      currency: "CHF",
      avgHourlyRate: 45,
      minHourlyRate: 30,
      maxHourlyRate: 80,
      avgMonthlyEarnings: 5500,
      avgWeeklyBookings: 10,
      avgBookingValue: 120,
    },
    US: {
      currency: "USD",
      avgHourlyRate: 30,
      minHourlyRate: 18,
      maxHourlyRate: 60,
      avgMonthlyEarnings: 4000,
      avgWeeklyBookings: 15,
      avgBookingValue: 80,
    },
  };

  return data[country] || data["DE"];
}
