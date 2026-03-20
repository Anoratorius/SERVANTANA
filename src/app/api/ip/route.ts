import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Get IP from various headers (Vercel/Cloudflare)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  // x-forwarded-for can contain multiple IPs, take the first one
  const ip = cfConnectingIp || realIp || forwardedFor?.split(",")[0]?.trim() || "unknown";

  return NextResponse.json({
    ip,
    headers: {
      "x-forwarded-for": forwardedFor,
      "x-real-ip": realIp,
      "cf-connecting-ip": cfConnectingIp,
    }
  });
}
