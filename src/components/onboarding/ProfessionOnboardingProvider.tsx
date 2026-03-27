"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const checkProfessionOnboarding = async () => {
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
    };

    checkProfessionOnboarding();
  }, [session, status, pathname]);

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
