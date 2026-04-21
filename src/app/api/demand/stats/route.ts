import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Get real demand statistics for a location/profession
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const professionId = searchParams.get("professionId");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const country = searchParams.get("country") || "DE"; // Default to Germany
    const days = parseInt(searchParams.get("days") || "30"); // Look back period

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Build where clause based on provided filters
    const whereClause: Record<string, unknown> = {
      createdAt: { gte: since },
    };

    if (professionId) {
      whereClause.professionId = professionId;
    }

    if (city) {
      whereClause.city = { equals: city, mode: "insensitive" };
    } else if (state) {
      whereClause.state = { equals: state, mode: "insensitive" };
    }

    if (country) {
      whereClause.country = { equals: country, mode: "insensitive" };
    }

    // Get demand signals
    const [
      totalSearches,
      unmatchedSearches,
      waitlistCount,
      recentSearches,
    ] = await Promise.all([
      // Total searches in period
      prisma.demandSignal.count({
        where: whereClause,
      }),

      // Unmatched searches (demand with no supply)
      prisma.demandSignal.count({
        where: {
          ...whereClause,
          wasMatched: false,
        },
      }),

      // Customers on waitlist
      prisma.demandSignal.count({
        where: {
          ...whereClause,
          joinedWaitlist: true,
          waitlistNotified: false,
        },
      }),

      // Last 5 searches for social proof (anonymized)
      prisma.demandSignal.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          city: true,
          createdAt: true,
          signalType: true,
          profession: {
            select: { name: true, nameDE: true },
          },
        },
      }),
    ]);

    // Calculate conversion rate (if we have platform data)
    const matchedSearches = totalSearches - unmatchedSearches;
    const matchRate = totalSearches > 0 ? matchedSearches / totalSearches : 0;

    // Calculate demand level
    let demandLevel: "low" | "moderate" | "high" | "very_high" = "low";
    if (totalSearches > 100 || waitlistCount > 10) {
      demandLevel = "very_high";
    } else if (totalSearches > 50 || waitlistCount > 5) {
      demandLevel = "high";
    } else if (totalSearches > 20 || waitlistCount > 2) {
      demandLevel = "moderate";
    }

    return NextResponse.json({
      period: {
        days,
        since: since.toISOString(),
      },
      demand: {
        totalSearches,
        unmatchedSearches,
        waitlistCount,
        matchRate: Math.round(matchRate * 100),
        demandLevel,
      },
      recentActivity: recentSearches.map((s) => ({
        city: s.city,
        profession: s.profession?.name || "Service",
        timeAgo: getTimeAgo(s.createdAt),
        type: s.signalType,
      })),
      message: generateDemandMessage(demandLevel, waitlistCount, unmatchedSearches),
    });
  } catch (error) {
    console.error("Error getting demand stats:", error);
    return NextResponse.json(
      { error: "Failed to get demand statistics" },
      { status: 500 }
    );
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

function generateDemandMessage(
  level: string,
  waitlistCount: number,
  unmatchedSearches: number
): string {
  if (waitlistCount > 0) {
    return `${waitlistCount} customer${waitlistCount > 1 ? "s" : ""} waiting for a service provider in this area`;
  }

  if (unmatchedSearches > 10) {
    return `${unmatchedSearches} recent searches couldn't find available providers`;
  }

  switch (level) {
    case "very_high":
      return "Very high demand - customers actively looking for providers";
    case "high":
      return "High demand in this area";
    case "moderate":
      return "Growing demand in this area";
    default:
      return "Emerging market opportunity";
  }
}
