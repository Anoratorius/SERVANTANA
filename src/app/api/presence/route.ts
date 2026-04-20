/**
 * Presence API
 * Handles heartbeat, online status, and typing indicators
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  updatePresence,
  isUserOnline,
  getPresenceForUsers,
  removePresence,
  setTyping,
  getTypingUsers,
  isPresenceAvailable,
} from "@/lib/presence";

// POST - Heartbeat / Update presence
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, conversationId, isTyping } = body;

    // Handle typing indicator
    if (action === "typing" && conversationId) {
      await setTyping(session.user.id, conversationId, isTyping === true);
      return NextResponse.json({ success: true });
    }

    // Handle logout
    if (action === "logout") {
      await removePresence(session.user.id);
      return NextResponse.json({ success: true });
    }

    // Default: heartbeat
    await updatePresence(session.user.id);

    return NextResponse.json({
      success: true,
      available: isPresenceAvailable(),
    });
  } catch (error) {
    console.error("Presence error:", error);
    return NextResponse.json(
      { error: "Failed to update presence" },
      { status: 500 }
    );
  }
}

// GET - Check presence status
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIds = searchParams.get("userIds")?.split(",").filter(Boolean) || [];
    const conversationId = searchParams.get("conversationId");

    // Get presence for specific users
    if (userIds.length > 0) {
      const presenceMap = await getPresenceForUsers(userIds);
      const presence = Array.from(presenceMap.values());
      return NextResponse.json({ presence });
    }

    // Get typing users in a conversation
    if (conversationId) {
      const typingUsers = await getTypingUsers(conversationId);
      return NextResponse.json({ typingUsers });
    }

    // Check if a single user is online
    const userId = searchParams.get("userId");
    if (userId) {
      const online = await isUserOnline(userId);
      return NextResponse.json({ userId, online });
    }

    return NextResponse.json({
      available: isPresenceAvailable(),
    });
  } catch (error) {
    console.error("Presence check error:", error);
    return NextResponse.json(
      { error: "Failed to check presence" },
      { status: 500 }
    );
  }
}
