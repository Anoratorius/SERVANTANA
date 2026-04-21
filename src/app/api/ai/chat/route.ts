import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAnthropicClient, AI_MODEL_FAST, SYSTEM_PROMPTS } from "@/lib/ai/anthropic";
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

// Rate limit config for AI chat (20 per minute)
const aiChatLimit = { maxRequests: 20, windowMs: 60 * 1000 };

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

    const response = await client.messages.create({
      model: AI_MODEL_FAST,
      max_tokens: 1024,
      system: `${SYSTEM_PROMPTS.chat}\n\nCurrent user context: ${userContext}`,
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

    // Detect suggested actions from the response
    const suggestedActions = detectSuggestedActions(assistantMessage, user?.role);

    return NextResponse.json({
      message: assistantMessage,
      suggestedActions,
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

function detectSuggestedActions(aiMessage: string, role?: string): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  const lowerMessage = aiMessage.toLowerCase();

  // Common action detection - navigation buttons
  if (lowerMessage.includes("book") || lowerMessage.includes("schedule") || lowerMessage.includes("find")) {
    actions.push({ label: "Browse Workers", type: "navigate", url: "/search" });
  }
  if (lowerMessage.includes("booking") && (lowerMessage.includes("view") || lowerMessage.includes("check") || lowerMessage.includes("status"))) {
    actions.push({ label: "My Bookings", type: "navigate", url: "/bookings" });
  }
  if (lowerMessage.includes("message") || lowerMessage.includes("contact") || lowerMessage.includes("chat with")) {
    actions.push({ label: "Messages", type: "navigate", url: "/messages" });
  }
  if (lowerMessage.includes("payment") || lowerMessage.includes("invoice") || lowerMessage.includes("receipt")) {
    actions.push({ label: "Invoices", type: "navigate", url: "/invoices" });
  }
  if (lowerMessage.includes("profile") || lowerMessage.includes("account") || lowerMessage.includes("settings")) {
    actions.push({ label: "My Profile", type: "navigate", url: "/dashboard" });
  }
  if (lowerMessage.includes("support") || lowerMessage.includes("help") || lowerMessage.includes("issue") || lowerMessage.includes("problem")) {
    actions.push({ label: "Support", type: "navigate", url: "/support" });
  }
  if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("estimate")) {
    actions.push({ label: "Get Estimate", type: "navigate", url: "/ai/estimate" });
  }

  // Role-specific actions
  if (role === "WORKER") {
    if (lowerMessage.includes("earning") || lowerMessage.includes("payout") || lowerMessage.includes("money")) {
      actions.push({ label: "Earnings", type: "navigate", url: "/dashboard/earnings" });
    }
    if (lowerMessage.includes("availability") || lowerMessage.includes("calendar")) {
      actions.push({ label: "Calendar", type: "navigate", url: "/dashboard/calendar" });
    }
  }

  // If no navigation actions detected, suggest follow-up messages
  if (actions.length === 0) {
    if (lowerMessage.includes("question") || lowerMessage.includes("help")) {
      actions.push({ label: "Tell me more", type: "message", message: "Can you explain more?" });
    }
  }

  return actions.slice(0, 3); // Max 3 suggested actions
}
