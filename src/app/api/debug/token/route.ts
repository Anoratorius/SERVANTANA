import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";

// Debug endpoint to check JWT token contents
export async function GET() {
  try {
    const session = await auth();

    // Get raw token from cookie
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('authjs.session-token')
      || cookieStore.get('next-auth.session-token')
      || cookieStore.get('__Secure-authjs.session-token');

    let rawToken = null;
    if (tokenCookie?.value) {
      try {
        rawToken = jwtDecode(tokenCookie.value);
      } catch {
        rawToken = "Failed to decode";
      }
    }

    // Get database state
    let dbState = null;
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          role: true,
          locationVerifiedAt: true,
          workerProfile: {
            select: { onboardingComplete: true }
          }
        }
      });
      dbState = {
        role: user?.role,
        locationVerifiedAt: user?.locationVerifiedAt,
        locationVerified: !!user?.locationVerifiedAt,
        onboardingComplete: user?.workerProfile?.onboardingComplete ?? false,
      };
    }

    return NextResponse.json({
      session: session ? {
        userId: session.user?.id,
        role: session.user?.role,
      } : null,
      rawToken,
      dbState,
      shouldRedirect: dbState ? (
        dbState.role === 'CLEANER' &&
        dbState.locationVerified === true &&
        dbState.onboardingComplete !== true
      ) : false,
    });
  } catch (error) {
    console.error("Debug token error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
