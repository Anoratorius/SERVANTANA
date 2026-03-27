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
        cleanerProfile: {
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
      cleanerProfile: user?.cleanerProfile ? {
        exists: true,
        onboardingComplete: user.cleanerProfile.onboardingComplete,
        hourlyRate: user.cleanerProfile.hourlyRate,
        professionsCount: user.cleanerProfile.professions.length,
        availabilityCount: user.cleanerProfile.availability.length,
      } : {
        exists: false,
      },
      shouldRedirectToOnboarding:
        user?.role === "CLEANER" &&
        !!user?.locationVerifiedAt &&
        (!user?.cleanerProfile || user?.cleanerProfile?.onboardingComplete !== true),
    });
  } catch (error) {
    console.error("Debug status error:", error);
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }
}
