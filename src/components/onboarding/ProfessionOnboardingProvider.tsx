"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues
const ProfessionOnboardingModal = dynamic(
  () => import("./ProfessionOnboardingModal"),
  { ssr: false }
);

// Pages where profession onboarding should NOT appear
const EXCLUDED_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/email-verification-required",
  "/auth",
  "/admin",
];

export default function ProfessionOnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
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

    // Don't show on excluded paths
    const isExcludedPath = EXCLUDED_PATHS.some((path) =>
      pathname.includes(path)
    );
    if (isExcludedPath) {
      setIsChecking(false);
      return;
    }

    try {
      // First check if location is verified - don't show profession modal until location is done
      const locationResponse = await fetch("/api/user/location");
      if (locationResponse.ok) {
        const locationData = await locationResponse.json();
        setLocationVerified(locationData.isVerified);
        if (!locationData.isVerified) {
          // Location not verified yet, don't show profession modal
          setIsChecking(false);
          return;
        }
      }

      // Check if worker has any professions
      const response = await fetch("/api/cleaner/professions");
      if (response.ok) {
        const professions = await response.json();
        // If no professions, show onboarding
        setNeedsOnboarding(professions.length === 0);
      }
    } catch (error) {
      console.error("Error checking professions:", error);
    } finally {
      setIsChecking(false);
    }
  }, [session, status, pathname]);

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

  const handleComplete = () => {
    setNeedsOnboarding(false);
  };

  // Don't render modal while checking or if not a worker
  if (isChecking || status !== "authenticated") {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {needsOnboarding && (
        <ProfessionOnboardingModal
          isOpen={needsOnboarding}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
