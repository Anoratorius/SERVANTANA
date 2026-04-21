import { getAnthropicClient, AI_MODEL } from "@/lib/ai/anthropic";

// Voice intent types
export type VoiceIntent =
  | "BOOK_SERVICE"
  | "CHECK_AVAILABILITY"
  | "CANCEL_BOOKING"
  | "CHECK_STATUS"
  | "RESCHEDULE"
  | "UNKNOWN";

// Extracted slots from voice command
export interface VoiceSlots {
  serviceType?: string;
  professionType?: string;
  date?: string; // ISO date string or relative ("tomorrow", "next monday")
  time?: string; // "14:00" or relative ("afternoon", "morning")
  workerPreference?: string; // Worker name or "same as last time", "my favorite"
  address?: string;
  duration?: number; // in minutes
  bookingId?: string; // For cancel/status/reschedule
}

export interface ParsedIntent {
  intent: VoiceIntent;
  slots: VoiceSlots;
  confidence: number; // 0-100
  originalUtterance: string;
  clarificationNeeded?: string;
  suggestedResponse?: string;
}

const VOICE_NLU_SYSTEM_PROMPT = `You are Servantana's voice assistant NLU (Natural Language Understanding) engine.
Your task is to parse voice commands and extract intent and relevant information.

Available services on our platform include: cleaning, plumbing, electrical, gardening, painting, moving, handyman, tutoring, pet care, babysitting.

INTENTS:
- BOOK_SERVICE: User wants to book a service (e.g., "book a cleaner", "I need a plumber tomorrow")
- CHECK_AVAILABILITY: User wants to check if workers are available (e.g., "is there a cleaner available on Friday?")
- CANCEL_BOOKING: User wants to cancel an existing booking (e.g., "cancel my appointment")
- CHECK_STATUS: User wants to check booking status (e.g., "what's the status of my booking?", "when is my next appointment?")
- RESCHEDULE: User wants to change booking time/date (e.g., "move my appointment to next week")
- UNKNOWN: Cannot determine intent

SLOT EXTRACTION:
- serviceType: The type of service (cleaning, plumbing, etc.)
- professionType: Type of worker needed (cleaner, plumber, electrician, etc.)
- date: Extract date in ISO format (YYYY-MM-DD) or keep relative terms for processing
- time: Extract time in 24h format (HH:MM) or keep relative terms (morning, afternoon, evening)
- workerPreference: Any preference for specific worker ("my usual cleaner", "same person as last time", specific name)
- address: Location if mentioned
- duration: Duration in minutes if specified
- bookingId: Booking reference if mentioned

Return ONLY valid JSON, no other text.`;

/**
 * Parse a voice utterance to extract intent and slots using Claude NLU
 */
export async function parseIntent(utterance: string): Promise<ParsedIntent> {
  if (!utterance || utterance.trim().length === 0) {
    return {
      intent: "UNKNOWN",
      slots: {},
      confidence: 0,
      originalUtterance: utterance,
      clarificationNeeded: "I didn't catch that. Could you please repeat?",
    };
  }

  try {
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: VOICE_NLU_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Parse this voice command and extract the intent and slots:

"${utterance}"

Return a JSON object with:
{
  "intent": "BOOK_SERVICE" | "CHECK_AVAILABILITY" | "CANCEL_BOOKING" | "CHECK_STATUS" | "RESCHEDULE" | "UNKNOWN",
  "slots": {
    "serviceType": "string or null",
    "professionType": "string or null",
    "date": "YYYY-MM-DD or relative term or null",
    "time": "HH:MM or relative term or null",
    "workerPreference": "string or null",
    "address": "string or null",
    "duration": "number in minutes or null",
    "bookingId": "string or null"
  },
  "confidence": 0-100,
  "clarificationNeeded": "question to ask if slots are missing or null",
  "suggestedResponse": "natural language response to the user"
}

Return ONLY valid JSON.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Clean up null values in slots
      const cleanedSlots: VoiceSlots = {};
      if (parsed.slots) {
        for (const [key, value] of Object.entries(parsed.slots)) {
          if (value !== null && value !== undefined && value !== "") {
            (cleanedSlots as Record<string, unknown>)[key] = value;
          }
        }
      }

      return {
        intent: parsed.intent || "UNKNOWN",
        slots: cleanedSlots,
        confidence: parsed.confidence || 50,
        originalUtterance: utterance,
        clarificationNeeded: parsed.clarificationNeeded || undefined,
        suggestedResponse: parsed.suggestedResponse || undefined,
      };
    }

    // Fallback if JSON parsing fails
    return {
      intent: "UNKNOWN",
      slots: {},
      confidence: 30,
      originalUtterance: utterance,
      clarificationNeeded:
        "I'm having trouble understanding. Could you try again?",
    };
  } catch (error) {
    console.error("Voice intent parsing error:", error);
    return {
      intent: "UNKNOWN",
      slots: {},
      confidence: 0,
      originalUtterance: utterance,
      clarificationNeeded:
        "Sorry, I encountered an error. Please try again.",
    };
  }
}

/**
 * Normalize relative date references to ISO date strings
 */
export function normalizeDate(dateString: string): string | null {
  if (!dateString) return null;

  const lower = dateString.toLowerCase().trim();
  const today = new Date();

  // Handle common relative terms
  if (lower === "today") {
    return today.toISOString().split("T")[0];
  }

  if (lower === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  // Handle "next [day]" patterns
  const daysOfWeek = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  for (let i = 0; i < daysOfWeek.length; i++) {
    if (lower.includes(daysOfWeek[i])) {
      const targetDay = i;
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;

      // If the day has passed this week, go to next week
      if (daysUntil <= 0) {
        daysUntil += 7;
      }

      // If "next" is mentioned, add another week
      if (lower.includes("next") && daysUntil < 7) {
        daysUntil += 7;
      }

      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysUntil);
      return targetDate.toISOString().split("T")[0];
    }
  }

  // Handle "this weekend", "next week", etc.
  if (lower.includes("weekend") || lower === "this weekend") {
    // Find next Saturday
    const currentDay = today.getDay();
    let daysUntilSaturday = 6 - currentDay;
    if (daysUntilSaturday <= 0) daysUntilSaturday += 7;

    const saturday = new Date(today);
    saturday.setDate(saturday.getDate() + daysUntilSaturday);
    return saturday.toISOString().split("T")[0];
  }

  if (lower === "next week") {
    // Return next Monday
    const currentDay = today.getDay();
    let daysUntilMonday = 1 - currentDay;
    if (daysUntilMonday <= 0) daysUntilMonday += 7;

    const monday = new Date(today);
    monday.setDate(monday.getDate() + daysUntilMonday);
    return monday.toISOString().split("T")[0];
  }

  // If it's already in ISO format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // Try to parse other date formats
  const parsed = Date.parse(dateString);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split("T")[0];
  }

  return null;
}

/**
 * Normalize relative time references to 24h format
 */
export function normalizeTime(timeString: string): string | null {
  if (!timeString) return null;

  const lower = timeString.toLowerCase().trim();

  // Handle relative time references
  if (lower === "morning" || lower === "in the morning") {
    return "09:00";
  }

  if (lower === "afternoon" || lower === "in the afternoon") {
    return "14:00";
  }

  if (lower === "evening" || lower === "in the evening") {
    return "18:00";
  }

  if (lower === "noon" || lower === "midday") {
    return "12:00";
  }

  // Handle "at X" or "at X o'clock"
  const atMatch = lower.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (atMatch) {
    let hours = parseInt(atMatch[1], 10);
    const minutes = atMatch[2] ? parseInt(atMatch[2], 10) : 0;
    const period = atMatch[3]?.toLowerCase();

    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  // Already in 24h format
  if (/^\d{1,2}:\d{2}$/.test(timeString)) {
    const [hours, minutes] = timeString.split(":");
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  }

  return null;
}

/**
 * Map service type to profession type
 */
export function mapServiceToProfession(serviceType: string): string {
  const serviceMap: Record<string, string> = {
    cleaning: "Cleaner",
    clean: "Cleaner",
    cleaner: "Cleaner",
    plumbing: "Plumber",
    plumber: "Plumber",
    electrical: "Electrician",
    electrician: "Electrician",
    gardening: "Gardener",
    gardener: "Gardener",
    painting: "Painter",
    painter: "Painter",
    moving: "Mover",
    mover: "Mover",
    handyman: "Handyman",
    tutoring: "Tutor",
    tutor: "Tutor",
    "pet care": "Pet Sitter",
    "pet sitter": "Pet Sitter",
    babysitting: "Babysitter",
    babysitter: "Babysitter",
  };

  const lower = serviceType.toLowerCase().trim();
  return serviceMap[lower] || serviceType;
}
