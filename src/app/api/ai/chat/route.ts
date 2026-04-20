import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAnthropicClient, AI_MODEL, SYSTEM_PROMPTS } from "@/lib/ai/anthropic";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, conversationHistory = [] } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

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
            cleaner: { select: { firstName: true } },
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
      model: AI_MODEL,
      max_tokens: 1024,
      system: `${SYSTEM_PROMPTS.chat}\n\nCurrent user context: ${userContext}`,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    const assistantMessage = response.content[0].type === "text"
      ? response.content[0].text
      : "";

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

function detectSuggestedActions(message: string, role?: string): Array<{ label: string; action: string; url?: string }> {
  const actions: Array<{ label: string; action: string; url?: string }> = [];
  const lowerMessage = message.toLowerCase();

  // Common action detection
  if (lowerMessage.includes("book") || lowerMessage.includes("schedule")) {
    actions.push({ label: "Browse Workers", action: "navigate", url: "/search" });
  }
  if (lowerMessage.includes("booking") && (lowerMessage.includes("view") || lowerMessage.includes("check"))) {
    actions.push({ label: "My Bookings", action: "navigate", url: "/bookings" });
  }
  if (lowerMessage.includes("message") || lowerMessage.includes("contact")) {
    actions.push({ label: "Messages", action: "navigate", url: "/messages" });
  }
  if (lowerMessage.includes("payment") || lowerMessage.includes("invoice")) {
    actions.push({ label: "Invoices", action: "navigate", url: "/invoices" });
  }
  if (lowerMessage.includes("profile") || lowerMessage.includes("account")) {
    actions.push({ label: "My Profile", action: "navigate", url: "/dashboard" });
  }
  if (lowerMessage.includes("support") || lowerMessage.includes("help") || lowerMessage.includes("issue")) {
    actions.push({ label: "Support", action: "navigate", url: "/support" });
  }

  // Role-specific actions
  if (role === "WORKER") {
    if (lowerMessage.includes("earning") || lowerMessage.includes("payout")) {
      actions.push({ label: "Earnings", action: "navigate", url: "/dashboard/earnings" });
    }
    if (lowerMessage.includes("availability") || lowerMessage.includes("schedule")) {
      actions.push({ label: "Availability", action: "navigate", url: "/worker/availability" });
    }
  }

  return actions.slice(0, 3); // Max 3 suggested actions
}
