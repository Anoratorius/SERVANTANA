import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserDevices,
  trustDevice,
  removeDevice,
} from "@/lib/device-fingerprint";
import { getClientIP } from "@/lib/rate-limit";

// Get all devices
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const devices = await getUserDevices(session.user.id);

  return NextResponse.json({ devices });
}

// Trust or remove a device
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { deviceId, action } = body;

  if (!deviceId || !action) {
    return NextResponse.json(
      { error: "Device ID and action are required" },
      { status: 400 }
    );
  }

  const ip = getClientIP(request);

  if (action === "trust") {
    const success = await trustDevice(deviceId, session.user.id);
    if (!success) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: "Device trusted successfully",
    });
  }

  if (action === "remove") {
    const success = await removeDevice(deviceId, session.user.id, ip);
    if (!success) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: "Device removed and sessions revoked",
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
