"use client";

import { useEffect, useState, useRef } from "react";
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
  "/worker/onboarding",
];

export default function ProfessionOnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [hasChecked, setHasChecked] = useState(false);
  const isRedirecting = useRef(false);

  useEffect(() => {
    async function checkWorkerOnboarding() {
      // Don't check if already redirecting
      if (isRedirecting.current) return;

      // Wait for session to load
      if (status === "loading") return;

      // Not authenticated - nothing to check
      if (status !== "authenticated" || !session?.user) {
        setHasChecked(true);
        return;
      }

      // Only check for workers (CLEANER role)
      if (session.user.role !== "WORKER") {
        setHasChecked(true);
        return;
      }

      // Don't redirect on excluded paths
      const isExcludedPath = EXCLUDED_PATHS.some((path) =>
        pathname.includes(path)
      );
      if (isExcludedPath) {
        setHasChecked(true);
        return;
      }

      try {
        // First check if location is verified
        const locationResponse = await fetch("/api/user/location");
        if (locationResponse.ok) {
          const locationData = await locationResponse.json();
          if (!locationData.isVerified) {
            // Location modal will handle this, don't redirect yet
            setHasChecked(true);
            return;
          }
        }

        // Check if worker has completed onboarding
        const response = await fetch("/api/worker/profile");
        if (response.ok) {
          const data = await response.json();
          // If no profile or onboarding not complete, redirect
          if (!data.profile || data.profile.onboardingComplete !== true) {
            isRedirecting.current = true;
            router.push("/worker/onboarding");
            return;
          }
        } else {
          // Any error (403, 404, 500) - assume needs onboarding
          isRedirecting.current = true;
          router.push("/worker/onboarding");
          return;
        }
      } catch (error) {
        console.error("Error checking worker onboarding:", error);
      }

      setHasChecked(true);
    }

    checkWorkerOnboarding();
  }, [session, status, pathname, router]);

  // Poll for location verification if worker hasn't completed onboarding
  useEffect(() => {
    if (
      status !== "authenticated" ||
      session?.user?.role !== "WORKER" ||
      hasChecked
    ) {
      return;
    }

    const interval = setInterval(async () => {
      if (isRedirecting.current) {
        clearInterval(interval);
        return;
      }

      try {
        const locationResponse = await fetch("/api/user/location");
        if (locationResponse.ok) {
          const locationData = await locationResponse.json();
          if (locationData.isVerified) {
            // Location now verified, check onboarding status
            const profileResponse = await fetch("/api/worker/profile");
            if (profileResponse.ok) {
              const data = await profileResponse.json();
              if (!data.profile || data.profile.onboardingComplete !== true) {
                isRedirecting.current = true;
                router.push("/worker/onboarding");
                clearInterval(interval);
              }
            }
          }
        }
      } catch {
        // Ignore errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status, session?.user?.role, hasChecked, router]);

  return <>{children}</>;
}
