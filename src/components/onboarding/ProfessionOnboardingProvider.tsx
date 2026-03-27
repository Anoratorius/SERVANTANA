"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

// Pages where worker onboarding redirect should NOT happen
const EXCLUDED_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/email-verification-required",
  "/auth",
  "/admin",
  "/worker/onboarding", // Don't redirect from onboarding page
];

export default function ProfessionOnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [locationVerified, setLocationVerified] = useState<boolean | null>(null);

  const checkProfessionOnboarding = useCallback(async () => {
    // Don't check if not authenticated or still loading
    if (status !== "authenticated" || !session?.user) {
      setIsChecking(false);
      return;
    }

    // Only check for workers (CLEANER role)
    if (session.user.role !== "CLEANER") {
      setIsChecking(false);
      return;
    }

    // Don't redirect on excluded paths
    const isExcludedPath = EXCLUDED_PATHS.some((path) =>
      pathname.includes(path)
    );
    if (isExcludedPath) {
      setIsChecking(false);
      return;
    }

    try {
      // First check if location is verified - don't redirect until location is done
      const locationResponse = await fetch("/api/user/location");
      if (locationResponse.ok) {
        const locationData = await locationResponse.json();
        setLocationVerified(locationData.isVerified);
        if (!locationData.isVerified) {
          // Location not verified yet, don't redirect
          setIsChecking(false);
          return;
        }
      }

      // Check if worker has completed onboarding
      const response = await fetch("/api/cleaner/profile");
      if (response.ok) {
        const data = await response.json();
        // If onboarding not complete, redirect to onboarding wizard
        if (!data.profile?.onboardingComplete) {
          router.push("/worker/onboarding");
          return;
        }
      } else if (response.status === 404) {
        // No profile yet, needs onboarding
        router.push("/worker/onboarding");
        return;
      }
    } catch (error) {
      console.error("Error checking professions:", error);
    } finally {
      setIsChecking(false);
    }
  }, [session, status, pathname, router]);

  useEffect(() => {
    checkProfessionOnboarding();
  }, [checkProfessionOnboarding]);

  // Re-check when location becomes verified (polling while location modal is open)
  useEffect(() => {
    if (locationVerified === false && status === "authenticated" && session?.user?.role === "CLEANER") {
      // Location not verified, poll for changes
      const interval = setInterval(async () => {
        try {
          const response = await fetch("/api/user/location");
          if (response.ok) {
            const data = await response.json();
            if (data.isVerified) {
              setLocationVerified(true);
              // Re-run the full check
              checkProfessionOnboarding();
            }
          }
        } catch {
          // Ignore errors
        }
      }, 2000); // Check every 2 seconds

      return () => clearInterval(interval);
    }
  }, [locationVerified, status, session?.user?.role, checkProfessionOnboarding]);

  // While checking, just render children
  if (isChecking || status !== "authenticated") {
    return <>{children}</>;
  }

  return <>{children}</>;
}
