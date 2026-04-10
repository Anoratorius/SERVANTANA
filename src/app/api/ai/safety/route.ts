import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAnthropicClient, AI_MODEL_FAST, SYSTEM_PROMPTS } from "@/lib/ai/anthropic";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

interface SafetyReport {
  overallRiskScore: number; // 0-100 (higher = more risk)
  riskLevel: "low" | "medium" | "high" | "critical";
  flags: Array<{
    type: string;
    severity: "info" | "warning" | "alert" | "critical";
    description: string;
    evidence: string[];
  }>;
  reviewAnalysis: {
    suspiciousReviews: number;
    patterns: string[];
    authenticitySc: number;
  };
  accountAnalysis: {
    ageInDays: number;
    activityPattern: string;
    locationConsistency: number;
    deviceConsistency: number;
  };
  bookingAnalysis: {
    cancellationRate: number;
    disputeRate: number;
    unusualPatterns: string[];
  };
  recommendations: string[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins or the user themselves can request safety analysis
    const { userId, analyzeReviews = true, analyzeBookings = true } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check permissions
    const requestingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (requestingUser?.role !== "ADMIN" && session.user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch comprehensive user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastKnownIp: true,
        locationCity: true,
        locationCountry: true,
        userSessions: {
          orderBy: { lastActiveAt: "desc" },
          take: 10,
          select: {
            ip: true,
            city: true,
            country: true,
            userAgent: true,
            lastActiveAt: true,
          },
        },
        userDevices: {
          select: {
            fingerprint: true,
            browser: true,
            os: true,
            lastSeenAt: true,
            lastCountry: true,
          },
        },
        reviewsGiven: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            reviewee: { select: { id: true } },
          },
        },
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            reviewer: { select: { id: true, createdAt: true } },
          },
        },
        bookingsAsCustomer: {
          select: {
            status: true,
            createdAt: true,
            cancelledAt: true,
            cancelledByCleaner: true,
          },
        },
        bookingsAsCleaner: {
          select: {
            status: true,
            createdAt: true,
            cancelledAt: true,
            cancelledByCleaner: true,
          },
        },
        disputesAsCustomer: {
          select: { status: true, type: true },
        },
        disputesAsCleaner: {
          select: { status: true, type: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const flags: SafetyReport["flags"] = [];
    let riskScore = 0;

    // Account age analysis
    const accountAgeInDays = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (accountAgeInDays < 7) {
      flags.push({
        type: "new_account",
        severity: "info",
        description: "Account is less than 7 days old",
        evidence: [`Created ${accountAgeInDays} days ago`],
      });
      riskScore += 10;
    }

    // Location consistency analysis
    const countries = new Set(user.userSessions.map(s => s.country).filter(Boolean));
    const locationConsistency = countries.size <= 2 ? 100 : Math.max(0, 100 - (countries.size - 2) * 20);

    if (countries.size > 3) {
      flags.push({
        type: "location_inconsistency",
        severity: "warning",
        description: "User has logged in from many different countries",
        evidence: Array.from(countries).slice(0, 5) as string[],
      });
      riskScore += 15;
    }

    // Device consistency analysis
    const deviceCount = user.userDevices.length;
    const deviceConsistency = deviceCount <= 3 ? 100 : Math.max(0, 100 - (deviceCount - 3) * 15);

    if (deviceCount > 5) {
      flags.push({
        type: "many_devices",
        severity: "info",
        description: "User has many registered devices",
        evidence: [`${deviceCount} devices registered`],
      });
      riskScore += 5;
    }

    // Booking analysis
    const allBookings = user.role === "WORKER"
      ? user.bookingsAsCleaner
      : user.bookingsAsCustomer;

    const totalBookings = allBookings.length;
    const cancelledBookings = allBookings.filter(b => b.status === "CANCELLED");
    const cancellationRate = totalBookings > 0
      ? (cancelledBookings.length / totalBookings) * 100
      : 0;

    if (cancellationRate > 30 && totalBookings >= 5) {
      flags.push({
        type: "high_cancellation_rate",
        severity: "warning",
        description: "High booking cancellation rate",
        evidence: [`${cancellationRate.toFixed(0)}% cancellation rate (${cancelledBookings.length}/${totalBookings})`],
      });
      riskScore += 15;
    }

    // Dispute analysis
    const allDisputes = [...user.disputesAsCustomer, ...user.disputesAsCleaner];
    const disputeRate = totalBookings > 0
      ? (allDisputes.length / totalBookings) * 100
      : 0;

    if (allDisputes.length >= 3 || disputeRate > 20) {
      flags.push({
        type: "high_dispute_rate",
        severity: "alert",
        description: "User has multiple disputes",
        evidence: [`${allDisputes.length} disputes (${disputeRate.toFixed(0)}% of bookings)`],
      });
      riskScore += 20;
    }

    // Review analysis
    let reviewAnalysis = {
      suspiciousReviews: 0,
      patterns: [] as string[],
      authenticitySc: 80,
    };

    if (analyzeReviews && user.reviewsReceived.length > 5) {
      // Check for review patterns
      const reviewsWithComments = user.reviewsReceived.filter(r => r.comment);

      if (reviewsWithComments.length >= 5) {
        const client = getAnthropicClient();

        const reviewTexts = reviewsWithComments.slice(0, 20).map(r => ({
          rating: r.rating,
          comment: r.comment,
          reviewerAge: Math.floor(
            (Date.now() - r.reviewer.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          ),
        }));

        try {
          const response = await client.messages.create({
            model: AI_MODEL_FAST,
            max_tokens: 1024,
            system: SYSTEM_PROMPTS.fraudDetection,
            messages: [
              {
                role: "user",
                content: `Analyze these reviews for potential fraud patterns:

${JSON.stringify(reviewTexts, null, 2)}

Return JSON:
{
  "suspiciousCount": (number),
  "patterns": ["list of suspicious patterns found"],
  "authenticity": (0-100),
  "concerns": ["specific concerns"]
}`,
              },
            ],
          });

          const text = response.content[0].type === "text" ? response.content[0].text : "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);

          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            reviewAnalysis = {
              suspiciousReviews: parsed.suspiciousCount || 0,
              patterns: parsed.patterns || [],
              authenticitySc: parsed.authenticity || 80,
            };

            if (parsed.suspiciousCount > 0) {
              flags.push({
                type: "suspicious_reviews",
                severity: parsed.suspiciousCount >= 3 ? "alert" : "warning",
                description: "Some reviews may be inauthentic",
                evidence: parsed.concerns || parsed.patterns,
              });
              riskScore += parsed.suspiciousCount * 5;
            }
          }
        } catch (error) {
          console.error("Review analysis failed:", error);
        }
      }
    }

    // Check for rapid activity (potential bot)
    const recentSessions = user.userSessions.filter(s => {
      const age = Date.now() - s.lastActiveAt.getTime();
      return age < 24 * 60 * 60 * 1000; // Last 24 hours
    });

    if (recentSessions.length > 50) {
      flags.push({
        type: "unusual_activity",
        severity: "warning",
        description: "Unusually high activity level",
        evidence: [`${recentSessions.length} sessions in last 24 hours`],
      });
      riskScore += 10;
    }

    // Determine risk level
    let riskLevel: SafetyReport["riskLevel"];
    if (riskScore < 20) riskLevel = "low";
    else if (riskScore < 40) riskLevel = "medium";
    else if (riskScore < 70) riskLevel = "high";
    else riskLevel = "critical";

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskLevel === "high" || riskLevel === "critical") {
      recommendations.push("Review user's recent activity manually");
      if (reviewAnalysis.suspiciousReviews > 0) {
        recommendations.push("Investigate flagged reviews");
      }
      if (cancellationRate > 30) {
        recommendations.push("Consider warning user about cancellation policy");
      }
    }
    if (countries.size > 3) {
      recommendations.push("Verify user identity if not already done");
    }

    const report: SafetyReport = {
      overallRiskScore: Math.min(100, riskScore),
      riskLevel,
      flags,
      reviewAnalysis,
      accountAnalysis: {
        ageInDays: accountAgeInDays,
        activityPattern: recentSessions.length > 20 ? "high" : recentSessions.length > 5 ? "normal" : "low",
        locationConsistency,
        deviceConsistency,
      },
      bookingAnalysis: {
        cancellationRate: Math.round(cancellationRate),
        disputeRate: Math.round(disputeRate),
        unusualPatterns: [],
      },
      recommendations,
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Safety Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to generate safety report" },
      { status: 500 }
    );
  }
}
