import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Get IP from headers (same logic as middleware)
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  const ip = vercelForwardedFor?.split(",")[0]?.trim() ||
             forwardedFor?.split(",")[0]?.trim() ||
             realIp ||
             "unknown";

  return NextResponse.json({ ip });
}
