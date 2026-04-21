import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseIntent, VoiceIntent, VoiceSlots } from "@/lib/voice/intent-parser";
import {
  fillMissingSlots,
  validateSlots,
  getEstimatedPrice,
  buildConfirmationMessage,
  CompleteBookingSlots,
} from "@/lib/voice/slot-filler";

export const maxDuration = 30;

// Response structure for voice platforms
interface VoiceResponse {
  success: boolean;
  intent: VoiceIntent;
  slots: VoiceSlots;
  filledSlots: Partial<CompleteBookingSlots>;
  validation: {
    isValid: boolean;
    missingRequired: string[];
  };
  response: {
    text: string; // Text response for voice synthesis
    ssml?: string; // SSML for more natural speech (optional)
  };
  action?: {
    type: "CONFIRM_BOOKING" | "ASK_CLARIFICATION" | "SHOW_AVAILABILITY" | "SHOW_STATUS" | "NONE";
    data?: Record<string, unknown>;
  };
  confidence: number;
  sessionData?: Record<string, unknown>;
}

/**
 * POST /api/voice/intent
 * Unified intent processor for voice commands
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          response: {
            text: "You need to be logged in to use voice booking. Please link your account first.",
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { utterance, platform, sessionId, sessionData } = body;

    if (!utterance || typeof utterance !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing utterance",
          response: {
            text: "I didn't catch that. Please try again.",
          },
        },
        { status: 400 }
      );
    }

    // Update last used timestamp for voice assistant link
    if (platform) {
      await prisma.voiceAssistantLink.updateMany({
        where: {
          userId: session.user.id,
          platform: platform.toUpperCase(),
        },
        data: {
          lastUsedAt: new Date(),
        },
      });
    }

    // Parse the voice command
    const parsedIntent = await parseIntent(utterance);

    // Process based on intent
    let response: VoiceResponse;

    switch (parsedIntent.intent) {
      case "BOOK_SERVICE":
        response = await handleBookService(
          session.user.id,
          parsedIntent.slots,
          parsedIntent.confidence,
          sessionData
        );
        break;

      case "CHECK_AVAILABILITY":
        response = await handleCheckAvailability(
          session.user.id,
          parsedIntent.slots,
          parsedIntent.confidence
        );
        break;

      case "CANCEL_BOOKING":
        response = await handleCancelBooking(
          session.user.id,
          parsedIntent.slots,
          parsedIntent.confidence
        );
        break;

      case "CHECK_STATUS":
        response = await handleCheckStatus(
          session.user.id,
          parsedIntent.slots,
          parsedIntent.confidence
        );
        break;

      case "RESCHEDULE":
        response = await handleReschedule(
          session.user.id,
          parsedIntent.slots,
          parsedIntent.confidence,
          sessionData
        );
        break;

      default:
        response = {
          success: false,
          intent: "UNKNOWN",
          slots: parsedIntent.slots,
          filledSlots: {},
          validation: {
            isValid: false,
            missingRequired: [],
          },
          response: {
            text:
              parsedIntent.clarificationNeeded ||
              "I'm not sure what you'd like to do. You can book a service, check availability, check booking status, reschedule, or cancel a booking.",
          },
          action: { type: "NONE" },
          confidence: parsedIntent.confidence,
        };
    }

    // Add session data for multi-turn conversations
    response.sessionData = {
      ...sessionData,
      lastIntent: parsedIntent.intent,
      lastSlots: parsedIntent.slots,
      sessionId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Voice intent processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Processing error",
        response: {
          text: "Sorry, I encountered an error. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}

async function handleBookService(
  userId: string,
  slots: VoiceSlots,
  confidence: number,
  sessionData?: Record<string, unknown>
): Promise<VoiceResponse> {
  // Fill missing slots from user preferences
  const filledSlots = await fillMissingSlots(slots, userId);

  // Get estimated price
  const estimatedPrice = await getEstimatedPrice(filledSlots);
  if (estimatedPrice) {
    filledSlots.estimatedPrice = estimatedPrice;
  }

  // Validate slots
  const validation = await validateSlots(filledSlots);

  if (!validation.isValid) {
    return {
      success: true,
      intent: "BOOK_SERVICE",
      slots,
      filledSlots,
      validation: {
        isValid: false,
        missingRequired: validation.missingRequired,
      },
      response: {
        text:
          validation.clarificationPrompt ||
          "I need more information to complete your booking.",
      },
      action: {
        type: "ASK_CLARIFICATION",
        data: { missingFields: validation.missingRequired },
      },
      confidence,
    };
  }

  // Build confirmation message
  const confirmationText = buildConfirmationMessage(filledSlots);

  return {
    success: true,
    intent: "BOOK_SERVICE",
    slots,
    filledSlots,
    validation: {
      isValid: true,
      missingRequired: [],
    },
    response: {
      text: confirmationText,
      ssml: `<speak>${confirmationText}</speak>`,
    },
    action: {
      type: "CONFIRM_BOOKING",
      data: {
        slots: filledSlots,
        awaitingConfirmation: true,
      },
    },
    confidence,
  };
}

async function handleCheckAvailability(
  userId: string,
  slots: VoiceSlots,
  confidence: number
): Promise<VoiceResponse> {
  const filledSlots = await fillMissingSlots(slots, userId);

  // If no date specified, check next 7 days
  const startDate = filledSlots.date
    ? new Date(filledSlots.date)
    : new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  // Find available workers
  const whereClause: Record<string, unknown> = {
    role: { in: ["WORKER", "CLEANER"] },
    workerProfile: {
      isActive: true,
      onboardingComplete: true,
    },
  };

  if (filledSlots.professionId) {
    whereClause.workerProfile = {
      ...whereClause.workerProfile as object,
      professions: {
        some: { professionId: filledSlots.professionId },
      },
    };
  }

  const availableWorkers = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      workerProfile: {
        select: {
          availableNow: true,
          hourlyRate: true,
          averageRating: true,
        },
      },
    },
    take: 5,
  });

  if (availableWorkers.length === 0) {
    return {
      success: true,
      intent: "CHECK_AVAILABILITY",
      slots,
      filledSlots,
      validation: { isValid: true, missingRequired: [] },
      response: {
        text: `I couldn't find any available ${filledSlots.professionName || "workers"} for that time. Would you like me to check a different date?`,
      },
      action: {
        type: "SHOW_AVAILABILITY",
        data: { workers: [], noResults: true },
      },
      confidence,
    };
  }

  const workerNames = availableWorkers
    .slice(0, 3)
    .map((w) => w.firstName)
    .join(", ");

  return {
    success: true,
    intent: "CHECK_AVAILABILITY",
    slots,
    filledSlots,
    validation: { isValid: true, missingRequired: [] },
    response: {
      text: `I found ${availableWorkers.length} available ${filledSlots.professionName || "workers"}. ${workerNames}${availableWorkers.length > 3 ? " and others are" : " is"} available. Would you like to book one of them?`,
    },
    action: {
      type: "SHOW_AVAILABILITY",
      data: {
        workers: availableWorkers.map((w) => ({
          id: w.id,
          name: `${w.firstName} ${w.lastName}`,
          availableNow: w.workerProfile?.availableNow,
          hourlyRate: w.workerProfile?.hourlyRate,
          rating: w.workerProfile?.averageRating,
        })),
      },
    },
    confidence,
  };
}

async function handleCancelBooking(
  userId: string,
  slots: VoiceSlots,
  confidence: number
): Promise<VoiceResponse> {
  // Find the booking to cancel
  let booking;

  if (slots.bookingId) {
    booking = await prisma.booking.findFirst({
      where: {
        id: slots.bookingId,
        customerId: userId,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: {
        worker: {
          select: { firstName: true, lastName: true },
        },
        service: {
          select: { name: true },
        },
      },
    });
  } else {
    // Get next upcoming booking
    booking = await prisma.booking.findFirst({
      where: {
        customerId: userId,
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledDate: { gte: new Date() },
      },
      orderBy: { scheduledDate: "asc" },
      include: {
        worker: {
          select: { firstName: true, lastName: true },
        },
        service: {
          select: { name: true },
        },
      },
    });
  }

  if (!booking) {
    return {
      success: true,
      intent: "CANCEL_BOOKING",
      slots,
      filledSlots: {},
      validation: { isValid: false, missingRequired: ["booking"] },
      response: {
        text: "I couldn't find any upcoming bookings to cancel. Is there anything else I can help with?",
      },
      action: { type: "NONE" },
      confidence,
    };
  }

  const bookingDate = booking.scheduledDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return {
    success: true,
    intent: "CANCEL_BOOKING",
    slots,
    filledSlots: {
      date: booking.scheduledDate.toISOString().split("T")[0],
      time: booking.scheduledTime,
      workerId: booking.workerId,
      workerName: `${booking.worker.firstName} ${booking.worker.lastName}`,
    },
    validation: { isValid: true, missingRequired: [] },
    response: {
      text: `I found your booking with ${booking.worker.firstName} on ${bookingDate} at ${booking.scheduledTime}. Are you sure you want to cancel this booking?`,
    },
    action: {
      type: "CONFIRM_BOOKING",
      data: {
        bookingId: booking.id,
        actionType: "cancel",
        awaitingConfirmation: true,
      },
    },
    confidence,
  };
}

async function handleCheckStatus(
  userId: string,
  slots: VoiceSlots,
  confidence: number
): Promise<VoiceResponse> {
  // Get upcoming bookings
  const bookings = await prisma.booking.findMany({
    where: {
      customerId: userId,
      scheduledDate: { gte: new Date() },
    },
    orderBy: { scheduledDate: "asc" },
    take: 3,
    include: {
      worker: {
        select: { firstName: true, lastName: true },
      },
      service: {
        select: { name: true },
      },
    },
  });

  if (bookings.length === 0) {
    return {
      success: true,
      intent: "CHECK_STATUS",
      slots,
      filledSlots: {},
      validation: { isValid: true, missingRequired: [] },
      response: {
        text: "You don't have any upcoming bookings. Would you like me to book a service for you?",
      },
      action: { type: "SHOW_STATUS", data: { bookings: [] } },
      confidence,
    };
  }

  const nextBooking = bookings[0];
  const bookingDate = nextBooking.scheduledDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  let statusText = `Your next booking is with ${nextBooking.worker.firstName} on ${bookingDate} at ${nextBooking.scheduledTime}. The status is ${nextBooking.status.toLowerCase()}.`;

  if (bookings.length > 1) {
    statusText += ` You have ${bookings.length - 1} more upcoming booking${bookings.length > 2 ? "s" : ""}.`;
  }

  return {
    success: true,
    intent: "CHECK_STATUS",
    slots,
    filledSlots: {},
    validation: { isValid: true, missingRequired: [] },
    response: {
      text: statusText,
    },
    action: {
      type: "SHOW_STATUS",
      data: {
        bookings: bookings.map((b) => ({
          id: b.id,
          status: b.status,
          date: b.scheduledDate.toISOString(),
          time: b.scheduledTime,
          workerName: `${b.worker.firstName} ${b.worker.lastName}`,
          serviceName: b.service?.name,
        })),
      },
    },
    confidence,
  };
}

async function handleReschedule(
  userId: string,
  slots: VoiceSlots,
  confidence: number,
  sessionData?: Record<string, unknown>
): Promise<VoiceResponse> {
  // Find the booking to reschedule
  let booking;

  if (slots.bookingId) {
    booking = await prisma.booking.findFirst({
      where: {
        id: slots.bookingId,
        customerId: userId,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: {
        worker: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  } else {
    // Get next upcoming booking
    booking = await prisma.booking.findFirst({
      where: {
        customerId: userId,
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledDate: { gte: new Date() },
      },
      orderBy: { scheduledDate: "asc" },
      include: {
        worker: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  if (!booking) {
    return {
      success: true,
      intent: "RESCHEDULE",
      slots,
      filledSlots: {},
      validation: { isValid: false, missingRequired: ["booking"] },
      response: {
        text: "I couldn't find any upcoming bookings to reschedule. Would you like to book a new service?",
      },
      action: { type: "NONE" },
      confidence,
    };
  }

  // Fill slots for the new time
  const filledSlots = await fillMissingSlots(slots, userId);

  // If new date/time not specified, ask
  if (!slots.date && !slots.time) {
    return {
      success: true,
      intent: "RESCHEDULE",
      slots,
      filledSlots: {
        ...filledSlots,
        workerId: booking.workerId,
        workerName: `${booking.worker.firstName} ${booking.worker.lastName}`,
      },
      validation: { isValid: false, missingRequired: ["new date or time"] },
      response: {
        text: `When would you like to reschedule your booking with ${booking.worker.firstName}?`,
      },
      action: {
        type: "ASK_CLARIFICATION",
        data: {
          bookingId: booking.id,
          currentDate: booking.scheduledDate.toISOString(),
          currentTime: booking.scheduledTime,
        },
      },
      confidence,
    };
  }

  const newDate = filledSlots.date || booking.scheduledDate.toISOString().split("T")[0];
  const newTime = filledSlots.time || booking.scheduledTime;

  const formattedDate = new Date(newDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return {
    success: true,
    intent: "RESCHEDULE",
    slots,
    filledSlots: {
      ...filledSlots,
      date: newDate,
      time: newTime,
      workerId: booking.workerId,
      workerName: `${booking.worker.firstName} ${booking.worker.lastName}`,
    },
    validation: { isValid: true, missingRequired: [] },
    response: {
      text: `I'll reschedule your booking with ${booking.worker.firstName} to ${formattedDate} at ${newTime}. Should I confirm this change?`,
    },
    action: {
      type: "CONFIRM_BOOKING",
      data: {
        bookingId: booking.id,
        actionType: "reschedule",
        newDate,
        newTime,
        awaitingConfirmation: true,
      },
    },
    confidence,
  };
}
