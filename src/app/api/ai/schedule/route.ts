import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface TimeSlotSuggestion {
  date: string;
  time: string;
  dayName: string;
  score: number; // 0-100, higher is better
  priceModifier: number; // -0.2 to +0.3 (discount to premium)
  demandLevel: "low" | "medium" | "high" | "peak";
  reasons: string[];
  estimatedWaitTime: number; // minutes until confirmed
  availableWorkers: number;
}

interface DemandForecast {
  hour: number;
  demand: number; // 0-100
  dayOfWeek: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      workerId,
      professionId,
      categoryId,
      latitude,
      longitude,
      duration = 120, // minutes
      startDate,
      daysAhead = 14,
    } = await request.json();

    const start = startDate ? new Date(startDate) : new Date();
    const suggestions: TimeSlotSuggestion[] = [];

    // Get historical booking data for demand forecasting
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalBookings = await prisma.booking.findMany({
      where: {
        scheduledDate: { gte: thirtyDaysAgo },
        status: { in: ["COMPLETED", "CONFIRMED", "IN_PROGRESS"] },
      },
      select: {
        scheduledDate: true,
        scheduledTime: true,
      },
    });

    // Build demand patterns
    const demandByHourAndDay = buildDemandPatterns(historicalBookings);

    // Get available workers for the criteria
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workerFilter: any = {
      onboardingComplete: true,
      isActive: true,
    };

    if (professionId) {
      workerFilter.professions = {
        some: { professionId, profession: { status: "APPROVED" } },
      };
    }

    if (categoryId) {
      workerFilter.professions = {
        some: { profession: { categoryId, status: "APPROVED" } },
      };
    }

    const workers = await prisma.user.findMany({
      where: {
        role: "WORKER",
        ...(workerId ? { id: workerId } : {}),
        workerProfile: workerFilter,
      },
      select: {
        id: true,
        workerProfile: {
          select: {
            hourlyRate: true,
            latitude: true,
            longitude: true,
            serviceRadius: true,
            availability: {
              where: { isActive: true },
              select: { dayOfWeek: true, startTime: true, endTime: true },
            },
          },
        },
        bookingsAsCleaner: {
          where: {
            scheduledDate: { gte: start },
            status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
          },
          select: {
            scheduledDate: true,
            scheduledTime: true,
            duration: true,
          },
        },
      },
    });

    // Filter by location if provided
    const nearbyWorkers = latitude && longitude
      ? workers.filter(w => {
          const profile = w.workerProfile;
          if (!profile?.latitude || !profile?.longitude) return false;
          const distance = calculateDistance(latitude, longitude, profile.latitude, profile.longitude);
          return distance <= (profile.serviceRadius || 10);
        })
      : workers;

    // Generate time slots for each day
    for (let day = 0; day < daysAhead; day++) {
      const date = new Date(start);
      date.setDate(date.getDate() + day);

      // Skip if date is in the past
      if (date < new Date()) continue;

      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split("T")[0];
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

      // Check each hour from 8 AM to 8 PM
      for (let hour = 8; hour <= 20; hour++) {
        const timeStr = `${hour.toString().padStart(2, "0")}:00`;

        // Count available workers for this slot
        const availableForSlot = nearbyWorkers.filter(worker => {
          const profile = worker.workerProfile;
          if (!profile) return false;

          // Check worker's availability schedule
          const dayAvail = profile.availability.find(a => a.dayOfWeek === dayOfWeek);
          if (!dayAvail) return false;

          const startHour = parseInt(dayAvail.startTime.split(":")[0]);
          const endHour = parseInt(dayAvail.endTime.split(":")[0]);
          if (hour < startHour || hour + (duration / 60) > endHour) return false;

          // Check for conflicting bookings
          const hasConflict = worker.bookingsAsCleaner.some(booking => {
            const bookingDate = new Date(booking.scheduledDate).toISOString().split("T")[0];
            if (bookingDate !== dateStr) return false;

            const bookingHour = parseInt(booking.scheduledTime.split(":")[0]);
            const bookingEnd = bookingHour + (booking.duration / 60);
            const slotEnd = hour + (duration / 60);

            return !(slotEnd <= bookingHour || hour >= bookingEnd);
          });

          return !hasConflict;
        });

        if (availableForSlot.length === 0) continue;

        // Calculate demand level
        const demandKey = `${dayOfWeek}-${hour}`;
        const demandScore = demandByHourAndDay.get(demandKey) || 50;

        // Calculate slot score and price modifier
        const { score, priceModifier, demandLevel, reasons } = calculateSlotScore(
          date,
          hour,
          demandScore,
          availableForSlot.length,
          day
        );

        suggestions.push({
          date: dateStr,
          time: timeStr,
          dayName,
          score,
          priceModifier,
          demandLevel,
          reasons,
          estimatedWaitTime: calculateWaitTime(demandLevel, availableForSlot.length),
          availableWorkers: availableForSlot.length,
        });
      }
    }

    // Sort by score (best slots first)
    suggestions.sort((a, b) => b.score - a.score);

    // Group by recommendation type
    const bestValue = suggestions.filter(s => s.priceModifier < 0).slice(0, 5);
    const quickestConfirmation = suggestions.filter(s => s.estimatedWaitTime < 30).slice(0, 5);
    const mostAvailable = [...suggestions].sort((a, b) => b.availableWorkers - a.availableWorkers).slice(0, 5);
    const topOverall = suggestions.slice(0, 10);

    return NextResponse.json({
      suggestions: topOverall,
      categories: {
        bestValue,
        quickestConfirmation,
        mostAvailable,
      },
      demandForecast: Array.from(demandByHourAndDay.entries()).map(([key, demand]) => {
        const [dayOfWeek, hour] = key.split("-").map(Number);
        return { dayOfWeek, hour, demand };
      }),
      totalSlotsAnalyzed: suggestions.length,
    });
  } catch (error) {
    console.error("Smart Scheduling error:", error);
    return NextResponse.json(
      { error: "Failed to generate schedule suggestions" },
      { status: 500 }
    );
  }
}

function buildDemandPatterns(
  bookings: Array<{ scheduledDate: Date; scheduledTime: string }>
): Map<string, number> {
  const demandMap = new Map<string, number>();
  const countMap = new Map<string, number>();

  // Initialize all slots with base demand
  for (let day = 0; day < 7; day++) {
    for (let hour = 8; hour <= 20; hour++) {
      demandMap.set(`${day}-${hour}`, 30); // Base demand
      countMap.set(`${day}-${hour}`, 0);
    }
  }

  // Count bookings per slot
  bookings.forEach(booking => {
    const date = new Date(booking.scheduledDate);
    const dayOfWeek = date.getDay();
    const hour = parseInt(booking.scheduledTime.split(":")[0]);
    const key = `${dayOfWeek}-${hour}`;

    const current = countMap.get(key) || 0;
    countMap.set(key, current + 1);
  });

  // Normalize to 0-100 scale
  const maxCount = Math.max(...countMap.values(), 1);
  countMap.forEach((count, key) => {
    const normalizedDemand = Math.round((count / maxCount) * 70) + 30; // 30-100 range
    demandMap.set(key, normalizedDemand);
  });

  return demandMap;
}

function calculateSlotScore(
  date: Date,
  hour: number,
  demandScore: number,
  availableWorkers: number,
  daysFromNow: number
): {
  score: number;
  priceModifier: number;
  demandLevel: "low" | "medium" | "high" | "peak";
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 50; // Base score

  // Demand-based adjustments
  let demandLevel: "low" | "medium" | "high" | "peak";
  let priceModifier: number;

  if (demandScore < 40) {
    demandLevel = "low";
    priceModifier = -0.15; // 15% discount
    score += 20;
    reasons.push("Low demand - best prices");
  } else if (demandScore < 60) {
    demandLevel = "medium";
    priceModifier = 0;
    score += 10;
    reasons.push("Standard pricing");
  } else if (demandScore < 80) {
    demandLevel = "high";
    priceModifier = 0.1; // 10% premium
    score -= 5;
    reasons.push("Popular time slot");
  } else {
    demandLevel = "peak";
    priceModifier = 0.2; // 20% premium
    score -= 10;
    reasons.push("Peak demand - premium pricing");
  }

  // Worker availability bonus
  if (availableWorkers >= 5) {
    score += 15;
    reasons.push("Many workers available");
  } else if (availableWorkers >= 3) {
    score += 10;
    reasons.push("Good availability");
  } else if (availableWorkers === 1) {
    score -= 10;
    reasons.push("Limited availability");
  }

  // Time-of-day preferences
  if (hour >= 9 && hour <= 11) {
    score += 10;
    reasons.push("Morning - optimal time");
  } else if (hour >= 14 && hour <= 16) {
    score += 5;
    reasons.push("Afternoon slot");
  }

  // Day preferences
  const dayOfWeek = date.getDay();
  if (dayOfWeek >= 1 && dayOfWeek <= 4) { // Mon-Thu
    score += 5;
    priceModifier -= 0.05;
    reasons.push("Weekday discount");
  } else if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
    priceModifier += 0.1;
    reasons.push("Weekend premium");
  }

  // Advance booking bonus
  if (daysFromNow >= 3 && daysFromNow <= 7) {
    score += 10;
    reasons.push("Optimal booking window");
  } else if (daysFromNow < 2) {
    score -= 5;
    priceModifier += 0.1;
    reasons.push("Last-minute booking");
  }

  // Cap price modifier
  priceModifier = Math.max(-0.2, Math.min(0.3, priceModifier));

  return {
    score: Math.max(0, Math.min(100, score)),
    priceModifier: Math.round(priceModifier * 100) / 100,
    demandLevel,
    reasons: reasons.slice(0, 3),
  };
}

function calculateWaitTime(demandLevel: string, availableWorkers: number): number {
  const baseWait = {
    low: 5,
    medium: 15,
    high: 30,
    peak: 60,
  }[demandLevel] || 30;

  // More workers = faster confirmation
  const workerFactor = Math.max(0.5, 1 - (availableWorkers - 1) * 0.1);

  return Math.round(baseWait * workerFactor);
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
