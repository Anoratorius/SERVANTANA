import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Debug endpoint to check user status - remove in production
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({
        authenticated: false,
        message: "Not logged in"
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true,
        locationVerifiedAt: true,
        latitude: true,
        longitude: true,
        workerProfile: {
          select: {
            id: true,
            onboardingComplete: true,
            hourlyRate: true,
            professions: {
              select: { id: true },
            },
            availability: {
              select: { id: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      authenticated: true,
      sessionRole: session.user.role,
      user: {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        emailVerified: !!user?.emailVerified,
        locationVerified: !!user?.locationVerifiedAt,
        hasLocation: !!(user?.latitude && user?.longitude),
      },
      workerProfile: user?.workerProfile ? {
        exists: true,
        onboardingComplete: user.workerProfile.onboardingComplete,
        hourlyRate: user.workerProfile.hourlyRate,
        professionsCount: user.workerProfile.professions.length,
        availabilityCount: user.workerProfile.availability.length,
      } : {
        exists: false,
      },
      shouldRedirectToOnboarding:
        user?.role === "CLEANER" &&
        !!user?.locationVerifiedAt &&
        (!user?.workerProfile || user?.workerProfile?.onboardingComplete !== true),
    });
  } catch (error) {
    console.error("Debug status error:", error);
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }
}
