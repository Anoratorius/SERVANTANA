import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(), // GPS accuracy in meters
  heading: z.number().optional(), // Direction of travel
  speed: z.number().optional(), // Speed in m/s
});

// POST: Update worker's current location
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "WORKER") {
      return NextResponse.json(
        { error: "Only workers can update their location" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = updateLocationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { latitude, longitude } = validationResult.data;

    // Reverse geocode to get city/country (simplified - in production use a geocoding service)
    const locationCity = await reverseGeocodeCity(latitude, longitude);

    // Update worker profile location
    const profile = await prisma.workerProfile.update({
      where: { userId: session.user.id },
      data: {
        latitude,
        longitude,
      },
    });

    // Also update user's location for general tracking
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        latitude,
        longitude,
        locationCity: locationCity?.city,
        locationCountry: locationCity?.country,
        locationVerifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Location updated",
      location: {
        latitude: profile.latitude,
        longitude: profile.longitude,
        city: locationCity?.city,
        country: locationCity?.country,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating worker location:", error);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}

// GET: Get worker's current location (for their own profile)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "WORKER") {
      return NextResponse.json(
        { error: "Only workers can access this endpoint" },
        { status: 403 }
      );
    }

    const profile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        latitude: true,
        longitude: true,
        city: true,
        country: true,
        serviceRadius: true,
        availableNow: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Worker profile not found" },
        { status: 404 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        locationVerifiedAt: true,
      },
    });

    return NextResponse.json({
      location: {
        latitude: profile.latitude,
        longitude: profile.longitude,
        city: profile.city,
        country: profile.country,
        serviceRadius: profile.serviceRadius,
        availableNow: profile.availableNow,
        lastUpdated: user?.locationVerifiedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error getting worker location:", error);
    return NextResponse.json(
      { error: "Failed to get location" },
      { status: 500 }
    );
  }
}

// Simple reverse geocoding (in production, use a proper service like Google Maps, Mapbox, etc.)
async function reverseGeocodeCity(
  latitude: number,
  longitude: number
): Promise<{ city: string; country: string } | null> {
  try {
    // Using OpenStreetMap Nominatim (free, but rate-limited)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
      {
        headers: {
          "User-Agent": "Servantana App",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      city:
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.municipality ||
        "",
      country: data.address?.country || "",
    };
  } catch {
    return null;
  }
}
