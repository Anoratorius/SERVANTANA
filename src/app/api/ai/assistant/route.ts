import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SearchParams {
  ready: boolean;
  serviceType?: string;
  location?: string;
  date?: string;
  duration?: number;
  priceRange?: { min?: number; max?: number };
}

const SYSTEM_PROMPT = `You are a helpful assistant for Servantana, a cleaning service marketplace. Your job is to help users find the right cleaner for their needs.

When a user describes what they need, extract the following information:
1. Service type (regular_cleaning, deep_cleaning, move_in_out, office_cleaning, window_cleaning, carpet_cleaning, post_construction, airbnb_turnover, laundry_ironing, organizing)
2. Location/City
3. Preferred date/time
4. Duration (in hours)
5. Any special requirements

If the user hasn't provided all necessary information, ask follow-up questions ONE AT A TIME. Be conversational and friendly.

IMPORTANT: When you have enough information to search (at minimum: service type OR location), respond with a JSON block at the END of your message like this:
<search_params>
{
  "ready": true,
  "serviceType": "deep_cleaning",
  "location": "Berlin",
  "date": "2024-03-25",
  "duration": 4
}
</search_params>

If you still need more information, set "ready": false or don't include the JSON block.

Keep responses short and helpful. Use a friendly tone. Don't mention that you're an AI - just help them find a cleaner.`;

export async function POST(request: NextRequest) {
  try {
    const { messages, locale = "en" } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Get available services for context
    const services = await prisma.service.findMany({
      where: { isActive: true },
      select: { name: true },
    });

    const serviceNames = services.map((s) => s.name).join(", ");

    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 500,
      system: `${SYSTEM_PROMPT}\n\nAvailable services: ${serviceNames}\n\nRespond in ${locale === "de" ? "German" : "English"}.`,
      messages: messages.map((m: Message) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract search params if present
    let searchParams: SearchParams | null = null;
    const paramsMatch = assistantMessage.match(
      /<search_params>\s*([\s\S]*?)\s*<\/search_params>/
    );

    if (paramsMatch) {
      try {
        searchParams = JSON.parse(paramsMatch[1]);
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Clean the message (remove the JSON block from display)
    const cleanMessage = assistantMessage
      .replace(/<search_params>[\s\S]*?<\/search_params>/, "")
      .trim();

    return NextResponse.json({
      message: cleanMessage,
      searchParams,
    });
  } catch (error) {
    console.error("AI Assistant error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to process request", details: errorMessage },
      { status: 500 }
    );
  }
}
