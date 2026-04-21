import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAnthropicClient, AI_MODEL, SYSTEM_PROMPTS } from "@/lib/ai/anthropic";
import { getKnowledgeBase } from "@/lib/ai/knowledge-base";
import { prisma } from "@/lib/prisma";
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit";
import { z } from "zod";

export const maxDuration = 30;

// Validation schema for conversation history
const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(10000),
});

const requestSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationHistory: z.array(chatMessageSchema).max(50).default([]),
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Common service types mapping
const SERVICE_KEYWORDS: Record<string, string[]> = {
  cleaning: ["clean", "cleaner", "cleaning", "maid", "housekeeping", "tidy"],
  plumbing: ["plumb", "plumber", "plumbing", "pipe", "leak", "drain", "faucet"],
  electrical: ["electric", "electrician", "wiring", "outlet", "power"],
  gardening: ["garden", "gardener", "lawn", "landscap", "yard", "mow"],
  painting: ["paint", "painter", "painting", "wall"],
  moving: ["mov", "mover", "moving", "relocat", "furniture"],
  handyman: ["handyman", "repair", "fix", "maintenance"],
  tutoring: ["tutor", "teach", "lesson", "homework", "education"],
  petcare: ["pet", "dog", "cat", "walk", "sitting"],
  babysitting: ["babysit", "nanny", "childcare", "kids"],
};

// Common cities (extend as needed)
const CITY_KEYWORDS = [
  "berlin", "munich", "hamburg", "frankfurt", "cologne", "düsseldorf",
  "stuttgart", "vienna", "zurich", "amsterdam", "london", "paris",
  "new york", "los angeles", "chicago", "boston", "seattle", "miami"
];

function extractSearchParams(userMessage: string, conversationHistory: ChatMessage[]): {
  service?: string;
  location?: string;
} {
  const fullContext = [
    ...conversationHistory.map(m => m.content),
    userMessage
  ].join(" ").toLowerCase();

  // Extract service type
  let service: string | undefined;
  for (const [serviceType, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (keywords.some(kw => fullContext.includes(kw))) {
      service = serviceType;
      break;
    }
  }

  // Extract location
  let location: string | undefined;
  for (const city of CITY_KEYWORDS) {
    if (fullContext.includes(city)) {
      location = city.charAt(0).toUpperCase() + city.slice(1);
      break;
    }
  }

  return { service, location };
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, "standard");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { message, conversationHistory } = parseResult.data;

    // Get user context for personalized responses
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstName: true,
        role: true,
        workerProfile: {
          select: {
            professions: {
              select: {
                profession: { select: { name: true } },
              },
            },
          },
        },
        bookingsAsCustomer: {
          take: 3,
          orderBy: { createdAt: "desc" },
          select: {
            status: true,
            scheduledDate: true,
            worker: { select: { firstName: true } },
          },
        },
      },
    });

    // Build context for the AI
    let userContext = `User: ${user?.firstName || "Guest"}`;
    if (user?.role === "WORKER") {
      const professions = user.workerProfile?.professions.map(p => p.profession.name).join(", ");
      userContext += ` (Worker - ${professions || "No professions set"})`;
    } else if (user?.role === "CUSTOMER") {
      const recentBookings = user.bookingsAsCustomer.length;
      userContext += ` (Customer - ${recentBookings} recent bookings)`;
    }

    // Format conversation history for Claude
    const messages: ChatMessage[] = [
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message },
    ];

    const client = getAnthropicClient();

    // Build system prompt with dynamic knowledge base
    const knowledgeBase = await getKnowledgeBase();
    const systemPrompt = [
      SYSTEM_PROMPTS.chat,
      "",
      knowledgeBase,
      "",
      `## Current User Context`,
      userContext,
    ].join("\n");

    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Handle empty or non-text responses
    if (!response.content || response.content.length === 0) {
      return NextResponse.json(
        { error: "AI returned empty response" },
        { status: 500 }
      );
    }

    const firstContent = response.content[0];
    if (firstContent.type !== "text" || !firstContent.text) {
      return NextResponse.json(
        { error: "AI returned unexpected response format" },
        { status: 500 }
      );
    }

    const assistantMessage = firstContent.text;

    // Extract search parameters from conversation
    const searchParams = extractSearchParams(message, conversationHistory);

    // Detect suggested actions with smart search URLs
    const suggestedActions = detectSuggestedActions(
      assistantMessage,
      user?.role,
      searchParams,
      message
    );

    return NextResponse.json({
      message: assistantMessage,
      suggestedActions,
      searchParams, // Include for debugging/future use
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to process chat message", details: errorMessage },
      { status: 500 }
    );
  }
}

interface SuggestedAction {
  label: string;
  type: "navigate" | "message";
  url?: string;
  message?: string;
}

interface SearchParams {
  service?: string;
  location?: string;
}

function buildSearchUrl(params: SearchParams): string {
  const urlParams = new URLSearchParams();
  if (params.service) urlParams.set("service", params.service);
  if (params.location) urlParams.set("location", params.location);

  const queryString = urlParams.toString();
  return queryString ? `/search?${queryString}` : "/search";
}

function detectSuggestedActions(
  aiMessage: string,
  role?: string,
  searchParams?: SearchParams,
  userMessage?: string
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  const lowerAiMessage = aiMessage.toLowerCase();
  const lowerUserMessage = (userMessage || "").toLowerCase();

  // Check if user is looking for workers/services
  const isSearchingForWorker =
    lowerUserMessage.includes("need") ||
    lowerUserMessage.includes("find") ||
    lowerUserMessage.includes("looking for") ||
    lowerUserMessage.includes("want") ||
    lowerUserMessage.includes("hire") ||
    lowerUserMessage.includes("book") ||
    lowerAiMessage.includes("can help you find") ||
    lowerAiMessage.includes("search for") ||
    lowerAiMessage.includes("browse") ||
    lowerAiMessage.includes("available");

  // Smart search button with extracted parameters
  if (isSearchingForWorker && searchParams && (searchParams.service || searchParams.location)) {
    const searchUrl = buildSearchUrl(searchParams);

    // Build descriptive label
    let label = "View";
    if (searchParams.service) {
      const serviceLabel = searchParams.service.charAt(0).toUpperCase() + searchParams.service.slice(1);
      label += ` ${serviceLabel}`;
      if (serviceLabel === "Cleaning") label = "View Cleaners";
      else if (serviceLabel === "Plumbing") label = "View Plumbers";
      else if (serviceLabel === "Electrical") label = "View Electricians";
      else if (serviceLabel === "Gardening") label = "View Gardeners";
      else if (serviceLabel === "Painting") label = "View Painters";
      else if (serviceLabel === "Moving") label = "View Movers";
      else if (serviceLabel === "Tutoring") label = "View Tutors";
      else if (serviceLabel === "Petcare") label = "View Pet Sitters";
      else if (serviceLabel === "Babysitting") label = "View Babysitters";
      else label += " Workers";
    } else {
      label = "View Workers";
    }

    if (searchParams.location) {
      label += ` in ${searchParams.location}`;
    }

    actions.push({ label, type: "navigate", url: searchUrl });
  }
  // Fallback: general search if talking about finding/booking
  else if (lowerAiMessage.includes("book") || lowerAiMessage.includes("schedule") || lowerAiMessage.includes("find")) {
    actions.push({ label: "Browse All Workers", type: "navigate", url: "/search" });
  }

  // Check bookings
  if (lowerAiMessage.includes("booking") && (lowerAiMessage.includes("view") || lowerAiMessage.includes("check") || lowerAiMessage.includes("status"))) {
    actions.push({ label: "My Bookings", type: "navigate", url: "/bookings" });
  }

  // Messages
  if (lowerAiMessage.includes("message") || lowerAiMessage.includes("contact") || lowerAiMessage.includes("chat with")) {
    actions.push({ label: "Messages", type: "navigate", url: "/messages" });
  }

  // Payments
  if (lowerAiMessage.includes("payment") || lowerAiMessage.includes("invoice") || lowerAiMessage.includes("receipt")) {
    actions.push({ label: "Invoices", type: "navigate", url: "/invoices" });
  }

  // Profile
  if (lowerAiMessage.includes("profile") || lowerAiMessage.includes("account") || lowerAiMessage.includes("settings")) {
    actions.push({ label: "My Profile", type: "navigate", url: "/dashboard" });
  }

  // Support
  if (lowerAiMessage.includes("support") || lowerAiMessage.includes("issue") || lowerAiMessage.includes("problem")) {
    actions.push({ label: "Support", type: "navigate", url: "/support" });
  }

  // Price estimate
  if (lowerAiMessage.includes("price") || lowerAiMessage.includes("cost") || lowerAiMessage.includes("estimate")) {
    actions.push({ label: "Get Estimate", type: "navigate", url: "/ai/estimate" });
  }

  // Role-specific actions
  if (role === "WORKER") {
    if (lowerAiMessage.includes("earning") || lowerAiMessage.includes("payout") || lowerAiMessage.includes("money")) {
      actions.push({ label: "Earnings", type: "navigate", url: "/dashboard/earnings" });
    }
    if (lowerAiMessage.includes("availability") || lowerAiMessage.includes("calendar")) {
      actions.push({ label: "Calendar", type: "navigate", url: "/dashboard/calendar" });
    }
  }

  return actions.slice(0, 3); // Max 3 suggested actions
}
