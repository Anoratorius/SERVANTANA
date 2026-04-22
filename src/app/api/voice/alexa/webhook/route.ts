import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseIntent } from "@/lib/voice/intent-parser";
import {
  fillMissingSlots,
  validateSlots,
  getEstimatedPrice,
  buildConfirmationMessage,
} from "@/lib/voice/slot-filler";
import * as crypto from "crypto";

// Certificate cache to avoid re-downloading
const certCache = new Map<string, { cert: string; expiresAt: number }>();

/**
 * Verify Alexa request signature according to Amazon's specification
 * https://developer.amazon.com/docs/custom-skills/host-a-custom-skill-as-a-web-service.html
 */
async function verifyAlexaSignature(
  request: NextRequest,
  rawBody: string
): Promise<{ valid: boolean; error?: string }> {
  const signatureCertChainUrl = request.headers.get("SignatureCertChainUrl");
  const signature = request.headers.get("Signature-256");

  if (!signatureCertChainUrl || !signature) {
    return { valid: false, error: "Missing signature headers" };
  }

  // Step 1: Verify the URL is from Amazon
  const certUrlValidation = validateCertUrl(signatureCertChainUrl);
  if (!certUrlValidation.valid) {
    return { valid: false, error: certUrlValidation.error };
  }

  // Step 2: Download and cache the certificate
  const certResult = await fetchCertificate(signatureCertChainUrl);
  if (!certResult.cert) {
    return { valid: false, error: certResult.error || "Failed to fetch certificate" };
  }

  // Step 3: Verify the certificate is valid for Alexa
  const certValidation = validateCertificate(certResult.cert);
  if (!certValidation.valid) {
    return { valid: false, error: certValidation.error };
  }

  // Step 4: Verify the request signature
  try {
    const signatureBuffer = Buffer.from(signature, "base64");
    const verifier = crypto.createVerify("SHA256");
    verifier.update(rawBody);
    const isValid = verifier.verify(certResult.cert, signatureBuffer);

    if (!isValid) {
      return { valid: false, error: "Invalid signature" };
    }
  } catch (error) {
    console.error("Signature verification error:", error);
    return { valid: false, error: "Signature verification failed" };
  }

  // Step 5: Verify timestamp (request must be within 150 seconds)
  try {
    const body = JSON.parse(rawBody);
    const timestamp = new Date(body.request?.timestamp);
    const now = new Date();
    const diffSeconds = Math.abs(now.getTime() - timestamp.getTime()) / 1000;

    if (diffSeconds > 150) {
      return { valid: false, error: "Request timestamp too old" };
    }
  } catch {
    return { valid: false, error: "Invalid timestamp" };
  }

  return { valid: true };
}

function validateCertUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url);

    // Must be HTTPS
    if (parsedUrl.protocol !== "https:") {
      return { valid: false, error: "Certificate URL must use HTTPS" };
    }

    // Must be from Amazon's domain
    if (parsedUrl.hostname.toLowerCase() !== "s3.amazonaws.com") {
      return { valid: false, error: "Certificate must be from s3.amazonaws.com" };
    }

    // Path must start with /echo.api/
    if (!parsedUrl.pathname.startsWith("/echo.api/")) {
      return { valid: false, error: "Certificate path must start with /echo.api/" };
    }

    // Port must be 443 or omitted
    if (parsedUrl.port && parsedUrl.port !== "443") {
      return { valid: false, error: "Certificate URL must use port 443" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid certificate URL" };
  }
}

async function fetchCertificate(
  url: string
): Promise<{ cert?: string; error?: string }> {
  // Check cache first
  const cached = certCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return { cert: cached.cert };
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { error: "Failed to download certificate" };
    }

    const cert = await response.text();

    // Cache for 24 hours
    certCache.set(url, {
      cert,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    return { cert };
  } catch (error) {
    console.error("Certificate fetch error:", error);
    return { error: "Failed to fetch certificate" };
  }
}

function validateCertificate(pem: string): { valid: boolean; error?: string } {
  try {
    const cert = new crypto.X509Certificate(pem);

    // Check expiration
    const now = new Date();
    if (now < new Date(cert.validFrom) || now > new Date(cert.validTo)) {
      return { valid: false, error: "Certificate is expired or not yet valid" };
    }

    // Check Subject Alternative Name contains echo-api.amazon.com
    const san = cert.subjectAltName || "";
    if (!san.includes("echo-api.amazon.com")) {
      return { valid: false, error: "Certificate SAN must include echo-api.amazon.com" };
    }

    return { valid: true };
  } catch (error) {
    console.error("Certificate validation error:", error);
    return { valid: false, error: "Invalid certificate format" };
  }
}

export const maxDuration = 30;

// Alexa request types
interface AlexaRequest {
  version: string;
  session: {
    sessionId: string;
    application: { applicationId: string };
    user: { userId: string; accessToken?: string };
    new: boolean;
    attributes?: Record<string, unknown>;
  };
  context: {
    System: {
      user: { userId: string; accessToken?: string };
      device: { deviceId: string };
      application: { applicationId: string };
    };
  };
  request:
    | LaunchRequest
    | IntentRequest
    | SessionEndedRequest;
}

interface LaunchRequest {
  type: "LaunchRequest";
  requestId: string;
  timestamp: string;
  locale: string;
}

interface IntentRequest {
  type: "IntentRequest";
  requestId: string;
  timestamp: string;
  locale: string;
  intent: {
    name: string;
    slots?: Record<string, { name: string; value?: string }>;
    confirmationStatus?: "NONE" | "CONFIRMED" | "DENIED";
  };
}

interface SessionEndedRequest {
  type: "SessionEndedRequest";
  requestId: string;
  timestamp: string;
  locale: string;
  reason: "USER_INITIATED" | "ERROR" | "EXCEEDED_MAX_REPROMPTS";
  error?: { type: string; message: string };
}

// Alexa response types
interface AlexaResponse {
  version: string;
  sessionAttributes?: Record<string, unknown>;
  response: {
    outputSpeech?: {
      type: "PlainText" | "SSML";
      text?: string;
      ssml?: string;
    };
    reprompt?: {
      outputSpeech: {
        type: "PlainText" | "SSML";
        text?: string;
        ssml?: string;
      };
    };
    shouldEndSession: boolean;
    card?: {
      type: "Simple" | "Standard" | "LinkAccount";
      title?: string;
      content?: string;
      text?: string;
      image?: { smallImageUrl?: string; largeImageUrl?: string };
    };
    directives?: unknown[];
  };
}

/**
 * POST /api/voice/alexa/webhook
 * Alexa skill fulfillment endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify Alexa signature (required in production)
    const isProduction = process.env.NODE_ENV === "production";
    const verification = await verifyAlexaSignature(request, rawBody);

    if (!verification.valid) {
      console.warn("Alexa signature verification failed:", verification.error);
      if (isProduction) {
        return NextResponse.json(
          { error: "Invalid request signature" },
          { status: 400 }
        );
      }
      // In development, log warning but continue
      console.warn("Continuing despite invalid signature (dev mode)");
    }

    // Parse the verified body
    const body: AlexaRequest = JSON.parse(rawBody);

    const alexaUserId = body.session?.user?.userId || body.context?.System?.user?.userId;
    const accessToken = body.session?.user?.accessToken || body.context?.System?.user?.accessToken;

    // Process based on request type
    let response: AlexaResponse;

    switch (body.request.type) {
      case "LaunchRequest":
        response = await handleLaunchRequest(accessToken);
        break;

      case "IntentRequest":
        response = await handleIntentRequest(
          body.request as IntentRequest,
          accessToken,
          body.session.attributes
        );
        break;

      case "SessionEndedRequest":
        response = handleSessionEndedRequest();
        break;

      default:
        response = createResponse(
          "I'm not sure how to handle that request.",
          true
        );
    }

    // Add session attributes
    if (body.session?.attributes || response.sessionAttributes) {
      response.sessionAttributes = {
        ...body.session?.attributes,
        ...response.sessionAttributes,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Alexa webhook error:", error);
    return NextResponse.json(
      createResponse(
        "Sorry, I encountered an error processing your request. Please try again.",
        true
      )
    );
  }
}

async function handleLaunchRequest(
  accessToken?: string
): Promise<AlexaResponse> {
  if (!accessToken) {
    return {
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: "Welcome to Servantana. To use voice booking, please link your account in the Alexa app.",
        },
        card: {
          type: "LinkAccount",
        },
        shouldEndSession: true,
      },
    };
  }

  // Verify the user is linked
  const voiceLink = await getUserFromToken(accessToken);

  if (!voiceLink) {
    return {
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: "Your account needs to be linked. Please link your Servantana account in the Alexa app.",
        },
        card: {
          type: "LinkAccount",
        },
        shouldEndSession: true,
      },
    };
  }

  return createResponse(
    "Welcome to Servantana! You can book a service, check availability, view your booking status, or reschedule an appointment. What would you like to do?",
    false,
    "You can say things like 'book a cleaner for tomorrow' or 'what's my next appointment?'"
  );
}

async function handleIntentRequest(
  request: IntentRequest,
  accessToken?: string,
  sessionAttributes?: Record<string, unknown>
): Promise<AlexaResponse> {
  const intentName = request.intent.name;

  // Handle built-in intents
  if (intentName === "AMAZON.HelpIntent") {
    return createResponse(
      "You can use Servantana to book professional services. Try saying 'book a cleaner for tomorrow at 10 AM', 'check my booking status', or 'cancel my appointment'. What would you like to do?",
      false
    );
  }

  if (intentName === "AMAZON.CancelIntent" || intentName === "AMAZON.StopIntent") {
    return createResponse("Goodbye! Thank you for using Servantana.", true);
  }

  if (intentName === "AMAZON.FallbackIntent") {
    return createResponse(
      "I'm not sure what you meant. You can book a service, check availability, or manage your bookings. What would you like to do?",
      false
    );
  }

  // Handle confirmation/denial for pending actions
  if (intentName === "AMAZON.YesIntent" && sessionAttributes?.awaitingConfirmation) {
    return await handleConfirmation(accessToken, sessionAttributes);
  }

  if (intentName === "AMAZON.NoIntent" && sessionAttributes?.awaitingConfirmation) {
    return createResponse(
      "Okay, I've cancelled that action. Is there anything else I can help with?",
      false,
      undefined,
      { awaitingConfirmation: false }
    );
  }

  // Require account linking for custom intents
  if (!accessToken) {
    return {
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: "Please link your Servantana account to use this feature.",
        },
        card: {
          type: "LinkAccount",
        },
        shouldEndSession: true,
      },
    };
  }

  const voiceLink = await getUserFromToken(accessToken);
  if (!voiceLink) {
    return {
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: "I couldn't verify your account. Please re-link your Servantana account in the Alexa app.",
        },
        card: {
          type: "LinkAccount",
        },
        shouldEndSession: true,
      },
    };
  }

  // Convert Alexa slots to utterance for processing
  const utterance = buildUtteranceFromSlots(intentName, request.intent.slots);

  // Parse the intent
  const parsedIntent = await parseIntent(utterance);

  // Fill missing slots
  const filledSlots = await fillMissingSlots(parsedIntent.slots, voiceLink.userId);
  const estimatedPrice = await getEstimatedPrice(filledSlots);
  if (estimatedPrice) {
    filledSlots.estimatedPrice = estimatedPrice;
  }

  // Validate slots
  const validation = await validateSlots(filledSlots);

  if (!validation.isValid && parsedIntent.intent === "BOOK_SERVICE") {
    return createResponse(
      validation.clarificationPrompt || "I need more information. " + parsedIntent.clarificationNeeded,
      false,
      undefined,
      { lastIntent: parsedIntent.intent, lastSlots: parsedIntent.slots }
    );
  }

  // Build response based on intent
  switch (parsedIntent.intent) {
    case "BOOK_SERVICE": {
      const confirmMessage = buildConfirmationMessage(filledSlots);
      return createResponse(confirmMessage, false, "Say yes to confirm or no to cancel.", {
        awaitingConfirmation: true,
        actionType: "book",
        slots: filledSlots,
      });
    }

    case "CHECK_STATUS":
    case "CHECK_AVAILABILITY":
    case "CANCEL_BOOKING":
    case "RESCHEDULE":
      return createResponse(
        parsedIntent.suggestedResponse || "I'm processing your request.",
        false
      );

    default:
      return createResponse(
        "I'm not sure what you'd like to do. You can book a service, check availability, or manage your bookings.",
        false
      );
  }
}

async function handleConfirmation(
  accessToken?: string,
  sessionAttributes?: Record<string, unknown>
): Promise<AlexaResponse> {
  if (!accessToken) {
    return createResponse("Please link your account first.", true);
  }

  const voiceLink = await getUserFromToken(accessToken);
  if (!voiceLink) {
    return createResponse("I couldn't verify your account.", true);
  }

  const actionType = sessionAttributes?.actionType as string;
  const slots = sessionAttributes?.slots as Record<string, unknown>;

  if (actionType === "book" && slots) {
    // Create the booking
    try {
      const booking = await prisma.booking.create({
        data: {
          customerId: voiceLink.userId,
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
        `Great! I've created your booking for ${new Date(slots.date as string).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${slots.time}. You'll receive a confirmation once the worker accepts. Is there anything else I can help with?`,
        false,
        undefined,
        { awaitingConfirmation: false }
      );
    } catch (error) {
      console.error("Booking creation error:", error);
      return createResponse(
        "Sorry, I couldn't create the booking. Please try again or use the Servantana app.",
        false
      );
    }
  }

  return createResponse(
    "I'm not sure what action to confirm. Can you try again?",
    false,
    undefined,
    { awaitingConfirmation: false }
  );
}

function handleSessionEndedRequest(): AlexaResponse {
  // Session ended, no response needed
  return {
    version: "1.0",
    response: {
      shouldEndSession: true,
    },
  };
}

function createResponse(
  text: string,
  shouldEndSession: boolean,
  repromptText?: string,
  sessionAttributes?: Record<string, unknown>
): AlexaResponse {
  const response: AlexaResponse = {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "PlainText",
        text,
      },
      shouldEndSession,
    },
  };

  if (repromptText) {
    response.response.reprompt = {
      outputSpeech: {
        type: "PlainText",
        text: repromptText,
      },
    };
  }

  if (sessionAttributes) {
    response.sessionAttributes = sessionAttributes;
  }

  return response;
}

async function getUserFromToken(
  accessToken: string
): Promise<{ userId: string } | null> {
  // In production, this would verify the OAuth token
  // For now, we look up the voice link by platform account ID or token

  const voiceLink = await prisma.voiceAssistantLink.findFirst({
    where: {
      platform: "ALEXA",
      linked: true,
      // In production, verify accessToken maps to a valid user
    },
    select: {
      userId: true,
    },
  });

  return voiceLink;
}

function buildUtteranceFromSlots(
  intentName: string,
  slots?: Record<string, { name: string; value?: string }>
): string {
  const parts: string[] = [];

  // Map intent name to action verb
  if (intentName.includes("Book") || intentName.includes("Schedule")) {
    parts.push("book");
  } else if (intentName.includes("Cancel")) {
    parts.push("cancel");
  } else if (intentName.includes("Check") || intentName.includes("Status")) {
    parts.push("check status");
  } else if (intentName.includes("Reschedule")) {
    parts.push("reschedule");
  } else if (intentName.includes("Availability")) {
    parts.push("check availability");
  }

  // Add slot values
  if (slots) {
    if (slots.ServiceType?.value) {
      parts.push(slots.ServiceType.value);
    }
    if (slots.Date?.value) {
      parts.push(`for ${slots.Date.value}`);
    }
    if (slots.Time?.value) {
      parts.push(`at ${slots.Time.value}`);
    }
    if (slots.WorkerName?.value) {
      parts.push(`with ${slots.WorkerName.value}`);
    }
  }

  return parts.join(" ");
}
