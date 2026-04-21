import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseIntent } from "@/lib/voice/intent-parser";
import {
  fillMissingSlots,
  validateSlots,
  getEstimatedPrice,
  buildConfirmationMessage,
} from "@/lib/voice/slot-filler";

export const maxDuration = 30;

// Google Actions request types (Conversational Actions)
interface GoogleActionsRequest {
  handler: {
    name: string;
  };
  intent: {
    name: string;
    params?: Record<string, { original: string; resolved: unknown }>;
    query?: string;
  };
  scene?: {
    name: string;
    slotFillingStatus?: string;
    slots?: Record<string, { mode: string; status: string; value: unknown }>;
    next?: { name: string };
  };
  session: {
    id: string;
    params?: Record<string, unknown>;
    typeOverrides?: unknown[];
    languageCode: string;
  };
  user: {
    locale: string;
    params?: Record<string, unknown>;
    accountLinkingStatus?: "LINKED" | "NOT_LINKED";
    verificationStatus?: "VERIFIED" | "GUEST";
    lastSeenTime?: string;
  };
  home?: {
    params?: Record<string, unknown>;
  };
  device?: {
    capabilities: string[];
  };
}

// Google Actions response types
interface GoogleActionsResponse {
  session?: {
    id?: string;
    params?: Record<string, unknown>;
  };
  prompt?: {
    override?: boolean;
    firstSimple?: {
      speech?: string;
      text?: string;
    };
    content?: {
      card?: {
        title: string;
        subtitle?: string;
        text?: string;
        image?: {
          url: string;
          alt: string;
        };
        button?: {
          name: string;
          open: { url: string };
        };
      };
      list?: {
        title?: string;
        items: Array<{
          key: string;
          title: string;
          description?: string;
        }>;
      };
    };
    lastSimple?: {
      speech?: string;
      text?: string;
    };
    suggestions?: Array<{ title: string }>;
    link?: {
      name: string;
      open: { url: string };
    };
  };
  scene?: {
    name?: string;
    slots?: Record<string, { mode: string; status: string; value: unknown }>;
    next?: { name: string };
  };
  user?: {
    params?: Record<string, unknown>;
  };
  home?: {
    params?: Record<string, unknown>;
  };
  expected?: {
    speech?: string[];
    languageCode?: string;
  };
}

/**
 * POST /api/voice/google/webhook
 * Google Actions fulfillment endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body: GoogleActionsRequest = await request.json();

    // Extract user authentication status
    const isLinked = body.user.accountLinkingStatus === "LINKED";
    const sessionParams = body.session.params || {};
    const userParams = body.user.params || {};

    // Get handler/intent name
    const handlerName = body.handler?.name || body.intent?.name || "unknown";
    const intentQuery = body.intent?.query || "";

    // Process based on handler name
    let response: GoogleActionsResponse;

    switch (handlerName) {
      case "actions.intent.MAIN":
      case "welcome":
      case "main":
        response = await handleMain(isLinked, userParams);
        break;

      case "book_service":
      case "BookServiceIntent":
        response = await handleBookService(
          body.intent,
          isLinked,
          sessionParams,
          userParams
        );
        break;

      case "check_availability":
      case "CheckAvailabilityIntent":
        response = await handleCheckAvailability(
          body.intent,
          isLinked,
          userParams
        );
        break;

      case "check_status":
      case "CheckStatusIntent":
        response = await handleCheckStatus(isLinked, userParams);
        break;

      case "cancel_booking":
      case "CancelBookingIntent":
        response = await handleCancelBooking(isLinked, sessionParams, userParams);
        break;

      case "reschedule_booking":
      case "RescheduleIntent":
        response = await handleReschedule(
          body.intent,
          isLinked,
          sessionParams,
          userParams
        );
        break;

      case "confirm_yes":
      case "actions.intent.YES":
        response = await handleConfirmation(true, sessionParams, userParams);
        break;

      case "confirm_no":
      case "actions.intent.NO":
        response = await handleConfirmation(false, sessionParams, userParams);
        break;

      case "actions.intent.CANCEL":
      case "goodbye":
        response = createResponse(
          "Thank you for using Servantana! Goodbye.",
          undefined,
          true
        );
        break;

      case "fallback":
      case "actions.intent.FALLBACK":
        // Try to parse the query as a natural language command
        if (intentQuery) {
          response = await handleNaturalLanguage(intentQuery, isLinked, userParams);
        } else {
          response = createResponse(
            "I'm not sure what you meant. You can book a service, check availability, or manage your bookings. What would you like to do?",
            ["Book a service", "Check availability", "My bookings"]
          );
        }
        break;

      default:
        // Try natural language processing for unknown handlers
        if (intentQuery) {
          response = await handleNaturalLanguage(intentQuery, isLinked, userParams);
        } else {
          response = createResponse(
            "I can help you book professional services. What would you like to do?",
            ["Book a cleaner", "Check availability", "My bookings"]
          );
        }
    }

    // Preserve session params
    if (!response.session) {
      response.session = {};
    }
    response.session.params = {
      ...sessionParams,
      ...response.session.params,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Google Actions webhook error:", error);
    return NextResponse.json(
      createResponse(
        "Sorry, I encountered an error. Please try again.",
        undefined,
        true
      )
    );
  }
}

async function handleMain(
  isLinked: boolean,
  userParams: Record<string, unknown>
): Promise<GoogleActionsResponse> {
  if (!isLinked) {
    return {
      prompt: {
        firstSimple: {
          speech:
            "Welcome to Servantana! To use voice booking, please link your account.",
          text: "Welcome to Servantana! Please link your account to get started.",
        },
      },
      scene: {
        name: "AccountLinking",
      },
    };
  }

  return createResponse(
    "Welcome to Servantana! You can book professional services, check availability, or manage your appointments. What would you like to do?",
    ["Book a service", "Check availability", "My bookings"]
  );
}

async function handleBookService(
  intent: GoogleActionsRequest["intent"],
  isLinked: boolean,
  sessionParams: Record<string, unknown>,
  userParams: Record<string, unknown>
): Promise<GoogleActionsResponse> {
  if (!isLinked) {
    return createAccountLinkingResponse();
  }

  const userId = userParams.userId as string;
  if (!userId) {
    return createAccountLinkingResponse();
  }

  // Extract intent parameters
  const params = intent.params || {};
  const serviceType = params.service_type?.original || params.ServiceType?.original;
  const date = params.date?.original || params.Date?.original;
  const time = params.time?.original || params.Time?.original;
  const workerName = params.worker_name?.original || params.WorkerName?.original;

  // Build utterance from params
  const utterance = buildUtterance("book", serviceType, date, time, workerName);

  // Parse intent
  const parsedIntent = await parseIntent(utterance);

  // Fill missing slots
  const filledSlots = await fillMissingSlots(parsedIntent.slots, userId);
  const estimatedPrice = await getEstimatedPrice(filledSlots);
  if (estimatedPrice) {
    filledSlots.estimatedPrice = estimatedPrice;
  }

  // Validate
  const validation = await validateSlots(filledSlots);

  if (!validation.isValid) {
    return createResponse(
      validation.clarificationPrompt || "What type of service do you need?",
      ["Cleaning", "Plumbing", "Electrical", "Gardening"],
      false,
      { lastIntent: "BOOK_SERVICE", partialSlots: filledSlots }
    );
  }

  // Build confirmation
  const confirmMessage = buildConfirmationMessage(filledSlots);

  return createResponse(
    confirmMessage,
    ["Yes, confirm", "No, cancel"],
    false,
    {
      awaitingConfirmation: true,
      actionType: "book",
      slots: filledSlots,
    }
  );
}

async function handleCheckAvailability(
  intent: GoogleActionsRequest["intent"],
  isLinked: boolean,
  userParams: Record<string, unknown>
): Promise<GoogleActionsResponse> {
  if (!isLinked) {
    return createAccountLinkingResponse();
  }

  const userId = userParams.userId as string;
  if (!userId) {
    return createAccountLinkingResponse();
  }

  const params = intent.params || {};
  const serviceType = params.service_type?.original || params.ServiceType?.original;
  const date = params.date?.original || params.Date?.original;

  const utterance = buildUtterance("check availability", serviceType, date);
  const parsedIntent = await parseIntent(utterance);
  const filledSlots = await fillMissingSlots(parsedIntent.slots, userId);

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

  const workers = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      workerProfile: {
        select: {
          availableNow: true,
          averageRating: true,
          hourlyRate: true,
        },
      },
    },
    take: 5,
  });

  if (workers.length === 0) {
    return createResponse(
      `I couldn't find any available ${filledSlots.professionName || "workers"}. Would you like to check a different service or date?`,
      ["Try another service", "Check different date"]
    );
  }

  const workerList = workers
    .slice(0, 3)
    .map((w) => `${w.firstName} (${w.workerProfile?.averageRating?.toFixed(1) || "New"} stars)`)
    .join(", ");

  return createResponse(
    `I found ${workers.length} available ${filledSlots.professionName || "workers"}. ${workerList}. Would you like to book one of them?`,
    workers.slice(0, 3).map((w) => `Book ${w.firstName}`),
    false,
    {
      availableWorkers: workers.map((w) => ({
        id: w.id,
        name: `${w.firstName} ${w.lastName}`,
      })),
    }
  );
}

async function handleCheckStatus(
  isLinked: boolean,
  userParams: Record<string, unknown>
): Promise<GoogleActionsResponse> {
  if (!isLinked) {
    return createAccountLinkingResponse();
  }

  const userId = userParams.userId as string;
  if (!userId) {
    return createAccountLinkingResponse();
  }

  const bookings = await prisma.booking.findMany({
    where: {
      customerId: userId,
      scheduledDate: { gte: new Date() },
    },
    orderBy: { scheduledDate: "asc" },
    take: 3,
    include: {
      worker: {
        select: { firstName: true },
      },
    },
  });

  if (bookings.length === 0) {
    return createResponse(
      "You don't have any upcoming bookings. Would you like to book a service?",
      ["Book a service", "Check availability"]
    );
  }

  const nextBooking = bookings[0];
  const bookingDate = nextBooking.scheduledDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  let statusText = `Your next booking is with ${nextBooking.worker.firstName} on ${bookingDate} at ${nextBooking.scheduledTime}. Status: ${nextBooking.status.toLowerCase()}.`;

  if (bookings.length > 1) {
    statusText += ` You have ${bookings.length - 1} more upcoming booking${bookings.length > 2 ? "s" : ""}.`;
  }

  return createResponse(statusText, ["Reschedule", "Cancel booking", "That's all"]);
}

async function handleCancelBooking(
  isLinked: boolean,
  sessionParams: Record<string, unknown>,
  userParams: Record<string, unknown>
): Promise<GoogleActionsResponse> {
  if (!isLinked) {
    return createAccountLinkingResponse();
  }

  const userId = userParams.userId as string;
  if (!userId) {
    return createAccountLinkingResponse();
  }

  const booking = await prisma.booking.findFirst({
    where: {
      customerId: userId,
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledDate: { gte: new Date() },
    },
    orderBy: { scheduledDate: "asc" },
    include: {
      worker: {
        select: { firstName: true },
      },
    },
  });

  if (!booking) {
    return createResponse(
      "You don't have any upcoming bookings to cancel.",
      ["Book a service", "That's all"]
    );
  }

  const bookingDate = booking.scheduledDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return createResponse(
    `Found your booking with ${booking.worker.firstName} on ${bookingDate} at ${booking.scheduledTime}. Are you sure you want to cancel?`,
    ["Yes, cancel", "No, keep it"],
    false,
    {
      awaitingConfirmation: true,
      actionType: "cancel",
      bookingId: booking.id,
    }
  );
}

async function handleReschedule(
  intent: GoogleActionsRequest["intent"],
  isLinked: boolean,
  sessionParams: Record<string, unknown>,
  userParams: Record<string, unknown>
): Promise<GoogleActionsResponse> {
  if (!isLinked) {
    return createAccountLinkingResponse();
  }

  const userId = userParams.userId as string;
  if (!userId) {
    return createAccountLinkingResponse();
  }

  const params = intent.params || {};
  const newDate = params.date?.original || params.Date?.original;
  const newTime = params.time?.original || params.Time?.original;

  const booking = await prisma.booking.findFirst({
    where: {
      customerId: userId,
      status: { in: ["PENDING", "CONFIRMED"] },
      scheduledDate: { gte: new Date() },
    },
    orderBy: { scheduledDate: "asc" },
    include: {
      worker: {
        select: { firstName: true },
      },
    },
  });

  if (!booking) {
    return createResponse(
      "You don't have any upcoming bookings to reschedule.",
      ["Book a service", "That's all"]
    );
  }

  if (!newDate && !newTime) {
    return createResponse(
      `When would you like to reschedule your booking with ${booking.worker.firstName}?`,
      ["Tomorrow", "Next week", "This weekend"],
      false,
      { bookingId: booking.id }
    );
  }

  const utterance = buildUtterance("reschedule", undefined, newDate, newTime);
  const parsedIntent = await parseIntent(utterance);
  const filledSlots = await fillMissingSlots(parsedIntent.slots, userId);

  const formattedDate = filledSlots.date
    ? new Date(filledSlots.date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "the new date";

  return createResponse(
    `I'll reschedule your booking with ${booking.worker.firstName} to ${formattedDate} at ${filledSlots.time || booking.scheduledTime}. Should I confirm?`,
    ["Yes, confirm", "No, cancel"],
    false,
    {
      awaitingConfirmation: true,
      actionType: "reschedule",
      bookingId: booking.id,
      newDate: filledSlots.date,
      newTime: filledSlots.time || booking.scheduledTime,
    }
  );
}

async function handleConfirmation(
  confirmed: boolean,
  sessionParams: Record<string, unknown>,
  userParams: Record<string, unknown>
): Promise<GoogleActionsResponse> {
  if (!confirmed) {
    return createResponse(
      "Okay, I've cancelled that action. Is there anything else I can help with?",
      ["Book a service", "Check availability", "That's all"],
      false,
      { awaitingConfirmation: false }
    );
  }

  const actionType = sessionParams.actionType as string;
  const userId = userParams.userId as string;

  if (!userId) {
    return createResponse("I couldn't verify your account. Please try again.", undefined, true);
  }

  try {
    if (actionType === "book") {
      const slots = sessionParams.slots as Record<string, unknown>;
      if (!slots) {
        return createResponse("I don't have enough information to complete the booking.", ["Start over"]);
      }

      await prisma.booking.create({
        data: {
          customerId: userId,
          workerId: slots.workerId as string,
          serviceId: (slots.serviceId as string) || null,
          scheduledDate: new Date(slots.date as string),
          scheduledTime: slots.time as string,
          duration: (slots.duration as number) || 60,
          address: (slots.address as string) || null,
          totalPrice: (slots.estimatedPrice as number) || 0,
          status: "PENDING",
        },
      });

      return createResponse(
        "Your booking has been created. You'll receive a confirmation once the worker accepts. Is there anything else?",
        ["That's all", "Book another"],
        false,
        { awaitingConfirmation: false }
      );
    }

    if (actionType === "cancel") {
      const bookingId = sessionParams.bookingId as string;
      if (!bookingId) {
        return createResponse("I couldn't find the booking to cancel.", ["Start over"]);
      }

      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      return createResponse(
        "Your booking has been cancelled. Is there anything else I can help with?",
        ["Book a service", "That's all"],
        false,
        { awaitingConfirmation: false }
      );
    }

    if (actionType === "reschedule") {
      const bookingId = sessionParams.bookingId as string;
      const newDate = sessionParams.newDate as string;
      const newTime = sessionParams.newTime as string;

      if (!bookingId || !newDate) {
        return createResponse("I couldn't complete the reschedule.", ["Start over"]);
      }

      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          scheduledDate: new Date(newDate),
          scheduledTime: newTime,
        },
      });

      return createResponse(
        "Your booking has been rescheduled. Is there anything else?",
        ["That's all", "Check status"],
        false,
        { awaitingConfirmation: false }
      );
    }
  } catch (error) {
    console.error("Confirmation action error:", error);
    return createResponse(
      "Sorry, I couldn't complete that action. Please try again or use the Servantana app.",
      ["Try again", "That's all"]
    );
  }

  return createResponse("I'm not sure what to confirm.", ["Start over"]);
}

async function handleNaturalLanguage(
  query: string,
  isLinked: boolean,
  userParams: Record<string, unknown>
): Promise<GoogleActionsResponse> {
  if (!isLinked) {
    return createAccountLinkingResponse();
  }

  const userId = userParams.userId as string;
  if (!userId) {
    return createAccountLinkingResponse();
  }

  // Parse natural language query
  const parsedIntent = await parseIntent(query);

  // Route to appropriate handler based on parsed intent
  const intent: GoogleActionsRequest["intent"] = {
    name: parsedIntent.intent,
    query,
    params: {},
  };

  switch (parsedIntent.intent) {
    case "BOOK_SERVICE":
      return handleBookService(intent, true, {}, userParams);
    case "CHECK_AVAILABILITY":
      return handleCheckAvailability(intent, true, userParams);
    case "CHECK_STATUS":
      return handleCheckStatus(true, userParams);
    case "CANCEL_BOOKING":
      return handleCancelBooking(true, {}, userParams);
    case "RESCHEDULE":
      return handleReschedule(intent, true, {}, userParams);
    default:
      return createResponse(
        parsedIntent.suggestedResponse ||
          "I can help you book professional services. What would you like to do?",
        ["Book a service", "Check availability", "My bookings"]
      );
  }
}

function createResponse(
  speech: string,
  suggestions?: string[],
  endSession?: boolean,
  sessionParams?: Record<string, unknown>
): GoogleActionsResponse {
  const response: GoogleActionsResponse = {
    prompt: {
      firstSimple: {
        speech,
        text: speech,
      },
    },
  };

  if (suggestions && suggestions.length > 0) {
    response.prompt!.suggestions = suggestions.map((s) => ({ title: s }));
  }

  if (sessionParams) {
    response.session = {
      params: sessionParams,
    };
  }

  if (endSession) {
    response.scene = {
      name: "actions.scene.END_CONVERSATION",
    };
  }

  return response;
}

function createAccountLinkingResponse(): GoogleActionsResponse {
  return {
    prompt: {
      firstSimple: {
        speech: "Please link your Servantana account to use this feature.",
        text: "Please link your account in the Google Home app.",
      },
    },
    scene: {
      name: "AccountLinking",
    },
  };
}

function buildUtterance(
  action: string,
  serviceType?: string,
  date?: string,
  time?: string,
  workerName?: string
): string {
  const parts = [action];

  if (serviceType) {
    parts.push(serviceType);
  }

  if (date) {
    parts.push(`for ${date}`);
  }

  if (time) {
    parts.push(`at ${time}`);
  }

  if (workerName) {
    parts.push(`with ${workerName}`);
  }

  return parts.join(" ");
}
