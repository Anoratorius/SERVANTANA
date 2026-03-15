import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserSessions,
  revokeSession,
  revokeAllSessions,
} from "@/lib/session-manager";
import { getClientIP } from "@/lib/rate-limit";

// Get all active sessions
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await getUserSessions(session.user.id);

  return NextResponse.json({ sessions });
}

// Revoke a session or all sessions
export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, revokeAll } = body;
  const ip = getClientIP(request);

  if (revokeAll) {
    // Revoke all other sessions
    const count = await revokeAllSessions(session.user.id, undefined, ip);
    return NextResponse.json({
      success: true,
      message: `Revoked ${count} session(s)`,
    });
  }

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID is required" },
      { status: 400 }
    );
  }

  const success = await revokeSession(sessionId, session.user.id, ip);

  if (!success) {
    return NextResponse.json(
      { error: "Session not found or already revoked" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Session revoked successfully",
  });
}
