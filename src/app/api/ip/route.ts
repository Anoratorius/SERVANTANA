import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Get IP from Vercel's trusted header only
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  const ip = vercelForwardedFor?.split(",")[0]?.trim() || "unknown";

  // Only return IP, no debug headers (security)
  return NextResponse.json({ ip });
}
