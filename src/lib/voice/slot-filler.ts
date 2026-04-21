import { prisma } from "@/lib/prisma";
import { VoiceSlots, normalizeDate, normalizeTime, mapServiceToProfession } from "./intent-parser";

// Complete booking slots with all required fields
export interface CompleteBookingSlots {
  serviceId?: string;
  professionId?: string;
  professionName?: string;
  workerId?: string;
  workerName?: string;
  date: string; // ISO date YYYY-MM-DD
  time: string; // 24h format HH:MM
  address?: string;
  duration: number; // in minutes
  estimatedPrice?: number;
}

// Validation result
export interface SlotValidationResult {
  isValid: boolean;
  missingRequired: string[];
  slots: Partial<CompleteBookingSlots>;
  clarificationPrompt?: string;
}

// User preferences from their booking history and favorites
interface UserPreferences {
  defaultAddress?: string;
  favoriteWorkerId?: string;
  favoriteWorkerName?: string;
  lastProfessionId?: string;
  lastServiceId?: string;
  preferredTime?: string;
  preferredDay?: number; // 0-6 for day of week
  defaultDuration?: number;
}

/**
 * Get user preferences from their booking history and favorites
 */
async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const preferences: UserPreferences = {};

  // Get most recent booking for defaults
  const recentBooking = await prisma.booking.findFirst({
    where: { customerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      worker: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (recentBooking) {
    preferences.defaultAddress = recentBooking.address || undefined;
    preferences.lastServiceId = recentBooking.serviceId || undefined;
    preferences.defaultDuration = recentBooking.duration;
    preferences.preferredTime = recentBooking.scheduledTime;
  }

  // Get favorite worker
  const favoriteWorker = await prisma.favorite.findFirst({
    where: { customerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      worker: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (favoriteWorker) {
    preferences.favoriteWorkerId = favoriteWorker.worker.id;
    preferences.favoriteWorkerName = `${favoriteWorker.worker.firstName} ${favoriteWorker.worker.lastName}`;
  }

  // Get voice assistant defaults
  const voiceLink = await prisma.voiceAssistantLink.findFirst({
    where: { userId },
    include: {
      defaultProfession: true,
      defaultWorker: true,
      defaultService: true,
    },
  });

  if (voiceLink) {
    if (voiceLink.defaultProfessionId) {
      preferences.lastProfessionId = voiceLink.defaultProfessionId;
    }
    if (voiceLink.defaultServiceId) {
      preferences.lastServiceId = voiceLink.defaultServiceId;
    }
    if (voiceLink.defaultWorkerId) {
      preferences.favoriteWorkerId = voiceLink.defaultWorkerId;
      if (voiceLink.defaultWorker) {
        preferences.favoriteWorkerName = `${voiceLink.defaultWorker.firstName} ${voiceLink.defaultWorker.lastName}`;
      }
    }
    if (voiceLink.defaultAddress) {
      preferences.defaultAddress = voiceLink.defaultAddress;
    }
  }

  // Analyze booking patterns for preferred day/time
  const bookings = await prisma.booking.findMany({
    where: {
      customerId: userId,
      status: { in: ["COMPLETED", "CONFIRMED"] },
    },
    select: {
      scheduledDate: true,
      scheduledTime: true,
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  if (bookings.length >= 3) {
    // Find most common day
    const dayCounts: Record<number, number> = {};
    const timeCounts: Record<string, number> = {};

    for (const booking of bookings) {
      const day = booking.scheduledDate.getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;

      const time = booking.scheduledTime;
      timeCounts[time] = (timeCounts[time] || 0) + 1;
    }

    const mostCommonDay = Object.entries(dayCounts).sort(
      (a, b) => b[1] - a[1]
    )[0];
    if (mostCommonDay && mostCommonDay[1] >= 2) {
      preferences.preferredDay = parseInt(mostCommonDay[0]);
    }

    const mostCommonTime = Object.entries(timeCounts).sort(
      (a, b) => b[1] - a[1]
    )[0];
    if (mostCommonTime && mostCommonTime[1] >= 2) {
      preferences.preferredTime = mostCommonTime[0];
    }
  }

  return preferences;
}

/**
 * Find profession by name or type
 */
async function findProfession(
  nameOrType: string
): Promise<{ id: string; name: string } | null> {
  const searchTerm = mapServiceToProfession(nameOrType);

  const profession = await prisma.profession.findFirst({
    where: {
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { nameDE: { contains: searchTerm, mode: "insensitive" } },
      ],
      status: "APPROVED",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return profession;
}

/**
 * Find worker by name or preference
 */
async function findWorker(
  preference: string,
  userId: string,
  professionId?: string
): Promise<{ id: string; name: string } | null> {
  const lower = preference.toLowerCase();

  // Handle special preferences
  if (
    lower.includes("same") ||
    lower.includes("usual") ||
    lower.includes("last time")
  ) {
    // Get last worker
    const lastBooking = await prisma.booking.findFirst({
      where: {
        customerId: userId,
        ...(professionId
          ? {
              worker: {
                workerProfile: {
                  professions: {
                    some: { professionId },
                  },
                },
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (lastBooking) {
      return {
        id: lastBooking.worker.id,
        name: `${lastBooking.worker.firstName} ${lastBooking.worker.lastName}`,
      };
    }
  }

  if (lower.includes("favorite") || lower.includes("favourite")) {
    const favorite = await prisma.favorite.findFirst({
      where: { customerId: userId },
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (favorite) {
      return {
        id: favorite.worker.id,
        name: `${favorite.worker.firstName} ${favorite.worker.lastName}`,
      };
    }
  }

  // Search by name
  const worker = await prisma.user.findFirst({
    where: {
      OR: [
        { firstName: { contains: preference, mode: "insensitive" } },
        { lastName: { contains: preference, mode: "insensitive" } },
      ],
      role: { in: ["WORKER", "CLEANER"] },
      workerProfile: {
        isActive: true,
        onboardingComplete: true,
        ...(professionId
          ? {
              professions: {
                some: { professionId },
              },
            }
          : {}),
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  if (worker) {
    return {
      id: worker.id,
      name: `${worker.firstName} ${worker.lastName}`,
    };
  }

  return null;
}

/**
 * Fill missing slots from user preferences and defaults
 */
export async function fillMissingSlots(
  partialSlots: VoiceSlots,
  userId: string
): Promise<Partial<CompleteBookingSlots>> {
  const preferences = await getUserPreferences(userId);
  const filled: Partial<CompleteBookingSlots> = {};

  // Process profession/service type
  if (partialSlots.professionType || partialSlots.serviceType) {
    const searchTerm = partialSlots.professionType || partialSlots.serviceType;
    const profession = await findProfession(searchTerm!);
    if (profession) {
      filled.professionId = profession.id;
      filled.professionName = profession.name;
    }
  } else if (preferences.lastProfessionId) {
    const profession = await prisma.profession.findUnique({
      where: { id: preferences.lastProfessionId },
      select: { id: true, name: true },
    });
    if (profession) {
      filled.professionId = profession.id;
      filled.professionName = profession.name;
    }
  }

  // Process service ID
  if (partialSlots.serviceType) {
    const service = await prisma.service.findFirst({
      where: {
        name: { contains: partialSlots.serviceType, mode: "insensitive" },
        isActive: true,
      },
      select: { id: true },
    });
    if (service) {
      filled.serviceId = service.id;
    }
  } else if (preferences.lastServiceId) {
    filled.serviceId = preferences.lastServiceId;
  }

  // Process worker preference
  if (partialSlots.workerPreference) {
    const worker = await findWorker(
      partialSlots.workerPreference,
      userId,
      filled.professionId
    );
    if (worker) {
      filled.workerId = worker.id;
      filled.workerName = worker.name;
    }
  } else if (preferences.favoriteWorkerId) {
    filled.workerId = preferences.favoriteWorkerId;
    filled.workerName = preferences.favoriteWorkerName;
  }

  // Process date
  if (partialSlots.date) {
    const normalizedDate = normalizeDate(partialSlots.date);
    if (normalizedDate) {
      filled.date = normalizedDate;
    }
  }

  // If no date specified, use next preferred day or tomorrow
  if (!filled.date) {
    const today = new Date();
    if (preferences.preferredDay !== undefined) {
      const currentDay = today.getDay();
      let daysUntil = preferences.preferredDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;

      const preferredDate = new Date(today);
      preferredDate.setDate(preferredDate.getDate() + daysUntil);
      filled.date = preferredDate.toISOString().split("T")[0];
    } else {
      // Default to tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filled.date = tomorrow.toISOString().split("T")[0];
    }
  }

  // Process time
  if (partialSlots.time) {
    const normalizedTime = normalizeTime(partialSlots.time);
    if (normalizedTime) {
      filled.time = normalizedTime;
    }
  }

  // If no time specified, use preferred time or default
  if (!filled.time) {
    filled.time = preferences.preferredTime || "10:00";
  }

  // Process address
  if (partialSlots.address) {
    filled.address = partialSlots.address;
  } else if (preferences.defaultAddress) {
    filled.address = preferences.defaultAddress;
  }

  // Process duration
  if (partialSlots.duration) {
    filled.duration = partialSlots.duration;
  } else {
    filled.duration = preferences.defaultDuration || 60;
  }

  return filled;
}

/**
 * Validate if we have enough information to complete a booking
 */
export async function validateSlots(
  slots: Partial<CompleteBookingSlots>
): Promise<SlotValidationResult> {
  const missingRequired: string[] = [];
  let clarificationPrompt: string | undefined;

  // Check required fields for booking
  if (!slots.date) {
    missingRequired.push("date");
  }

  if (!slots.time) {
    missingRequired.push("time");
  }

  // Either worker or profession is required
  if (!slots.workerId && !slots.professionId) {
    missingRequired.push("service type or worker");
  }

  // Build clarification prompt
  if (missingRequired.length > 0) {
    if (missingRequired.includes("service type or worker")) {
      clarificationPrompt = "What type of service do you need?";
    } else if (missingRequired.includes("date")) {
      clarificationPrompt = "What date would you like to book?";
    } else if (missingRequired.includes("time")) {
      clarificationPrompt = "What time works best for you?";
    }
  }

  return {
    isValid: missingRequired.length === 0,
    missingRequired,
    slots,
    clarificationPrompt,
  };
}

/**
 * Get estimated price for a booking
 */
export async function getEstimatedPrice(
  slots: Partial<CompleteBookingSlots>
): Promise<number | null> {
  if (!slots.workerId && !slots.professionId) {
    return null;
  }

  let hourlyRate: number | null = null;

  if (slots.workerId) {
    const workerProfile = await prisma.workerProfile.findFirst({
      where: { userId: slots.workerId },
      select: { hourlyRate: true },
    });
    hourlyRate = workerProfile?.hourlyRate || null;
  }

  if (!hourlyRate && slots.professionId) {
    // Get average rate for profession
    const workers = await prisma.workerProfession.findMany({
      where: { professionId: slots.professionId },
      include: {
        worker: {
          select: { hourlyRate: true },
        },
      },
      take: 10,
    });

    if (workers.length > 0) {
      const totalRate = workers.reduce((sum, w) => sum + w.worker.hourlyRate, 0);
      hourlyRate = totalRate / workers.length;
    }
  }

  if (hourlyRate && slots.duration) {
    return Math.round((hourlyRate * slots.duration) / 60 * 100) / 100;
  }

  return null;
}

/**
 * Build a confirmation message for the user
 */
export function buildConfirmationMessage(
  slots: Partial<CompleteBookingSlots>
): string {
  const parts: string[] = [];

  if (slots.professionName) {
    parts.push(`booking a ${slots.professionName}`);
  }

  if (slots.workerName) {
    parts.push(`with ${slots.workerName}`);
  }

  if (slots.date) {
    const date = new Date(slots.date);
    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    parts.push(`for ${formattedDate}`);
  }

  if (slots.time) {
    const [hours, minutes] = slots.time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    parts.push(`at ${displayHour}:${minutes} ${ampm}`);
  }

  if (slots.duration) {
    const hours = Math.floor(slots.duration / 60);
    const mins = slots.duration % 60;
    if (hours > 0 && mins > 0) {
      parts.push(`for ${hours} hour${hours > 1 ? "s" : ""} and ${mins} minutes`);
    } else if (hours > 0) {
      parts.push(`for ${hours} hour${hours > 1 ? "s" : ""}`);
    } else {
      parts.push(`for ${mins} minutes`);
    }
  }

  if (slots.estimatedPrice) {
    parts.push(`at approximately $${slots.estimatedPrice.toFixed(2)}`);
  }

  if (parts.length === 0) {
    return "I need more information to complete your booking.";
  }

  return `I'm ${parts.join(" ")}. Should I confirm this booking?`;
}
