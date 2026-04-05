import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { headers } from "next/headers";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().optional(),
  country: z.string().optional(),
});

// POST - Save user's verified location
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = locationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid location data", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { latitude, longitude, city, country } = validation.data;

    // Get IP address for fraud detection
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0] || realIp || "unknown";

    // Update user location
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        latitude,
        longitude,
        locationCity: city || null,
        locationCountry: country || null,
        locationVerifiedAt: new Date(),
        lastKnownIp: ip,
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        locationCity: true,
        locationCountry: true,
        locationVerifiedAt: true,
      },
    });

    // If user is a worker, also update their cleaner profile
    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (workerProfile) {
      await prisma.workerProfile.update({
        where: { id: workerProfile.id },
        data: {
          latitude,
          longitude,
          city: city || workerProfile.city,
          country: country || workerProfile.country,
        },
      });
    }

    // Check if user is a worker who needs onboarding
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        workerProfile: {
          select: { onboardingComplete: true },
        },
      },
    });

    const isWorker = user?.role === "WORKER";
    const needsOnboarding = isWorker && user?.workerProfile?.onboardingComplete !== true;

    return NextResponse.json({
      success: true,
      user: updatedUser,
      redirectTo: needsOnboarding ? "/worker/onboarding" : null,
    });
  } catch (error) {
    console.error("Location verification error:", error);
    return NextResponse.json(
      { error: "Failed to save location" },
      { status: 500 }
    );
  }
}

// GET - Get user's current location
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        latitude: true,
        longitude: true,
        locationCity: true,
        locationCountry: true,
        locationVerifiedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      latitude: user.latitude,
      longitude: user.longitude,
      city: user.locationCity,
      country: user.locationCountry,
      verifiedAt: user.locationVerifiedAt,
      isVerified: !!user.locationVerifiedAt,
    });
  } catch (error) {
    console.error("Get location error:", error);
    return NextResponse.json(
      { error: "Failed to get location" },
      { status: 500 }
    );
  }
}
