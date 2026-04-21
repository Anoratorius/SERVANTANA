import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 10-Factor Weighted Scoring Algorithm
const SCORING_WEIGHTS = {
  rating: 0.20,           // Worker's average rating (20%)
  experience: 0.10,       // Years of experience (10%)
  distance: 0.15,         // Proximity to customer (15%)
  price: 0.12,            // Price competitiveness (12%)
  availability: 0.10,     // Availability match (10%)
  preferences: 0.08,      // Customer preferences match (8%)
  reliability: 0.10,      // Booking completion rate (10%)
  verification: 0.05,     // Document verification status (5%)
  responseTime: 0.05,     // Average response time (5%)
  repeatCustomer: 0.05,   // Previous positive interactions (5%)
};

interface WorkerScore {
  workerId: string;
  totalScore: number;
  factors: {
    rating: number;
    experience: number;
    distance: number;
    price: number;
    availability: number;
    preferences: number;
    reliability: number;
    verification: number;
    responseTime: number;
    repeatCustomer: number;
  };
  matchReasons: string[];
}

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      latitude,
      longitude,
      professionId,
      categoryId,
      preferredDate,
      preferredTime,
      maxPrice,
      ecoFriendly,
      petFriendly,
      limit = 10,
    } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "Location is required" }, { status: 400 });
    }

    // Get customer's booking history for repeat customer scoring
    const customerHistory = await prisma.booking.findMany({
      where: {
        customerId: session.user.id,
        status: "COMPLETED",
      },
      select: {
        workerId: true,
        review: { select: { rating: true } },
      },
    });

    const previousWorkers = new Map<string, { count: number; avgRating: number }>();
    customerHistory.forEach(booking => {
      const existing = previousWorkers.get(booking.workerId) || { count: 0, avgRating: 0 };
      const rating = booking.review?.rating || 0;
      previousWorkers.set(booking.workerId, {
        count: existing.count + 1,
        avgRating: rating > 0 ? (existing.avgRating * existing.count + rating) / (existing.count + 1) : existing.avgRating,
      });
    });

    // Build worker filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileFilters: any = {
      onboardingComplete: true,
      isActive: true,
    };

    if (professionId) {
      profileFilters.professions = {
        some: { professionId, profession: { status: "APPROVED" } },
      };
    }

    if (categoryId) {
      profileFilters.professions = {
        some: { profession: { categoryId, status: "APPROVED" } },
      };
    }

    if (ecoFriendly) profileFilters.ecoFriendly = true;
    if (petFriendly) profileFilters.petFriendly = true;

    // Fetch workers with all necessary data
    const workers = await prisma.user.findMany({
      where: {
        role: "WORKER",
        workerProfile: { is: profileFilters },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        workerProfile: {
          select: {
            id: true,
            bio: true,
            hourlyRate: true,
            currency: true,
            experienceYears: true,
            verified: true,
            ecoFriendly: true,
            petFriendly: true,
            city: true,
            latitude: true,
            longitude: true,
            serviceRadius: true,
            averageRating: true,
            totalBookings: true,
            responseTime: true,
            availability: {
              where: { isActive: true },
              select: { dayOfWeek: true, startTime: true, endTime: true },
            },
            professions: {
              where: { profession: { status: "APPROVED" } },
              select: {
                isPrimary: true,
                profession: {
                  select: { id: true, name: true, emoji: true },
                },
              },
            },
          },
        },
        bookingsAsWorker: {
          select: { status: true },
        },
        workerDocuments: {
          where: { status: "VERIFIED" },
          select: { type: true },
        },
      },
      take: 100, // Get more than needed for scoring
    });

    // Calculate scores for each worker
    const scoredWorkers: WorkerScore[] = [];
    const allPrices = workers
      .map(w => w.workerProfile?.hourlyRate || 0)
      .filter(p => p > 0);
    const avgPrice = allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 50;

    for (const worker of workers) {
      const profile = worker.workerProfile;
      if (!profile) continue;

      // Calculate distance
      let distance = Infinity;
      if (profile.latitude && profile.longitude) {
        distance = calculateDistance(latitude, longitude, profile.latitude, profile.longitude);
        // Skip if outside service radius
        if (distance > (profile.serviceRadius || 10)) continue;
      }

      const factors = {
        rating: 0,
        experience: 0,
        distance: 0,
        price: 0,
        availability: 0,
        preferences: 0,
        reliability: 0,
        verification: 0,
        responseTime: 0,
        repeatCustomer: 0,
      };
      const matchReasons: string[] = [];

      // 1. Rating Score (0-100)
      factors.rating = Math.min((profile.averageRating / 5) * 100, 100);
      if (profile.averageRating >= 4.5) {
        matchReasons.push(`Highly rated (${profile.averageRating.toFixed(1)}★)`);
      }

      // 2. Experience Score (0-100)
      factors.experience = Math.min((profile.experienceYears / 10) * 100, 100);
      if (profile.experienceYears >= 5) {
        matchReasons.push(`${profile.experienceYears}+ years experience`);
      }

      // 3. Distance Score (0-100, closer is better)
      if (distance !== Infinity) {
        factors.distance = Math.max(100 - (distance / (profile.serviceRadius || 10)) * 100, 0);
        if (distance <= 2) {
          matchReasons.push("Very close to you");
        } else if (distance <= 5) {
          matchReasons.push("Nearby");
        }
      }

      // 4. Price Score (0-100, competitive pricing)
      if (profile.hourlyRate) {
        if (maxPrice && profile.hourlyRate <= maxPrice) {
          factors.price = 100;
          matchReasons.push("Within your budget");
        } else {
          // Score based on how competitive the price is
          factors.price = Math.max(100 - ((profile.hourlyRate - avgPrice) / avgPrice) * 50, 0);
          if (profile.hourlyRate < avgPrice * 0.9) {
            matchReasons.push("Competitive pricing");
          }
        }
      }

      // 5. Availability Score (0-100)
      if (preferredDate && preferredTime) {
        const date = new Date(preferredDate);
        const dayOfWeek = date.getDay();
        const timeSlot = profile.availability.find(a => a.dayOfWeek === dayOfWeek);

        if (timeSlot) {
          const requestedTime = parseInt(preferredTime.split(":")[0]);
          const startHour = parseInt(timeSlot.startTime.split(":")[0]);
          const endHour = parseInt(timeSlot.endTime.split(":")[0]);

          if (requestedTime >= startHour && requestedTime < endHour) {
            factors.availability = 100;
            matchReasons.push("Available at your requested time");
          } else {
            factors.availability = 50; // Available that day but different time
          }
        }
      } else {
        factors.availability = 70; // Default if no preference specified
      }

      // 6. Preferences Score (0-100)
      let prefScore = 50;
      if (ecoFriendly && profile.ecoFriendly) {
        prefScore += 25;
        matchReasons.push("Eco-friendly");
      }
      if (petFriendly && profile.petFriendly) {
        prefScore += 25;
        matchReasons.push("Pet-friendly");
      }
      factors.preferences = Math.min(prefScore, 100);

      // 7. Reliability Score (0-100, based on completion rate)
      const totalBookings = worker.bookingsAsWorker.length;
      const completedBookings = worker.bookingsAsWorker.filter(b => b.status === "COMPLETED").length;
      const cancelledBookings = worker.bookingsAsWorker.filter(b => b.status === "CANCELLED").length;

      if (totalBookings > 0) {
        const completionRate = completedBookings / totalBookings;
        const cancellationRate = cancelledBookings / totalBookings;
        factors.reliability = Math.max((completionRate * 100) - (cancellationRate * 50), 0);

        if (completionRate >= 0.95 && totalBookings >= 10) {
          matchReasons.push("Excellent reliability");
        }
      } else {
        factors.reliability = 50; // New worker, neutral score
      }

      // 8. Verification Score (0-100)
      const verifiedDocs = worker.workerDocuments.length;
      factors.verification = profile.verified ? 100 : Math.min(verifiedDocs * 25, 75);
      if (profile.verified) {
        matchReasons.push("Verified professional");
      }

      // 9. Response Time Score (0-100, faster is better)
      if (profile.responseTime) {
        // Assuming response time is in minutes, score based on < 1 hour being ideal
        factors.responseTime = Math.max(100 - (profile.responseTime / 60) * 20, 0);
        if (profile.responseTime <= 30) {
          matchReasons.push("Fast responder");
        }
      } else {
        factors.responseTime = 50; // Unknown response time
      }

      // 10. Repeat Customer Score (0-100)
      const previousInteraction = previousWorkers.get(worker.id);
      if (previousInteraction) {
        const { count, avgRating } = previousInteraction;
        factors.repeatCustomer = Math.min((count * 20) + (avgRating / 5) * 50, 100);
        if (count >= 1 && avgRating >= 4) {
          matchReasons.push("You've worked with them before");
        }
      }

      // Calculate total weighted score
      const totalScore =
        factors.rating * SCORING_WEIGHTS.rating +
        factors.experience * SCORING_WEIGHTS.experience +
        factors.distance * SCORING_WEIGHTS.distance +
        factors.price * SCORING_WEIGHTS.price +
        factors.availability * SCORING_WEIGHTS.availability +
        factors.preferences * SCORING_WEIGHTS.preferences +
        factors.reliability * SCORING_WEIGHTS.reliability +
        factors.verification * SCORING_WEIGHTS.verification +
        factors.responseTime * SCORING_WEIGHTS.responseTime +
        factors.repeatCustomer * SCORING_WEIGHTS.repeatCustomer;

      scoredWorkers.push({
        workerId: worker.id,
        totalScore,
        factors,
        matchReasons: matchReasons.slice(0, 4), // Top 4 reasons
      });
    }

    // Sort by score and take top matches
    scoredWorkers.sort((a, b) => b.totalScore - a.totalScore);
    const topMatches = scoredWorkers.slice(0, limit);

    // Fetch full worker details for top matches
    const workerIds = topMatches.map(m => m.workerId);
    const workerDetails = await prisma.user.findMany({
      where: { id: { in: workerIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        workerProfile: {
          select: {
            id: true,
            bio: true,
            hourlyRate: true,
            currency: true,
            experienceYears: true,
            verified: true,
            ecoFriendly: true,
            petFriendly: true,
            city: true,
            latitude: true,
            longitude: true,
            averageRating: true,
            totalBookings: true,
            professions: {
              where: { profession: { status: "APPROVED" } },
              select: {
                isPrimary: true,
                profession: {
                  select: { id: true, name: true, emoji: true },
                },
              },
              orderBy: [{ isPrimary: "desc" }],
            },
          },
        },
      },
    });

    // Combine worker details with scores
    const results = topMatches.map(match => {
      const worker = workerDetails.find(w => w.id === match.workerId);
      const distance = worker?.workerProfile?.latitude && worker?.workerProfile?.longitude
        ? calculateDistance(latitude, longitude, worker.workerProfile.latitude, worker.workerProfile.longitude)
        : null;

      return {
        worker: {
          ...worker,
          workerProfile: worker?.workerProfile ? {
            ...worker.workerProfile,
            distance: distance ? Math.round(distance * 10) / 10 : null,
          } : null,
        },
        matchScore: Math.round(match.totalScore),
        matchPercentage: Math.round(match.totalScore),
        factors: match.factors,
        matchReasons: match.matchReasons,
      };
    });

    return NextResponse.json({
      matches: results,
      totalCandidates: workers.length,
      scoringWeights: SCORING_WEIGHTS,
    });
  } catch (error) {
    console.error("Smart Match error:", error);
    return NextResponse.json(
      { error: "Failed to find matches" },
      { status: 500 }
    );
  }
}
