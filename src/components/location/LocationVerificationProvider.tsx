"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues
const LocationVerificationModal = dynamic(
  () => import("./LocationVerificationModal"),
  { ssr: false }
);

// Pages where location verification modal should NOT appear
const EXCLUDED_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/email-verification-required",
  "/auth",
];

export default function LocationVerificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkLocationVerification = async () => {
      // Don't check if not authenticated or still loading
      if (status !== "authenticated" || !session?.user) {
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
        const response = await fetch("/api/user/location");
        if (response.ok) {
          const data = await response.json();
          setNeedsVerification(!data.isVerified);
        }
      } catch (error) {
        console.error("Error checking location:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkLocationVerification();
  }, [session, status, pathname]);

  const handleLocationVerified = async () => {
    // Extract locale from current pathname (e.g., /en/dashboard -> en)
    const localeMatch = pathname.match(/^\/(en|de)/);
    const locale = localeMatch ? localeMatch[1] : "en";

    // Check if user is a worker who needs onboarding
    try {
      const response = await fetch("/api/cleaner/profile");
      if (response.ok) {
        const data = await response.json();
        if (!data.profile || data.profile.onboardingComplete !== true) {
          // Worker needs onboarding - use full page navigation to trigger middleware
          window.location.href = `/${locale}/worker/onboarding`;
          return;
        }
      }
    } catch {
      // On error, fall through to reload
    }

    // For customers or workers with completed onboarding, reload to refresh session
    window.location.reload();
  };

  // Don't render modal while checking or on excluded paths
  if (isChecking || status !== "authenticated") {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {needsVerification && (
        <LocationVerificationModal
          isOpen={needsVerification}
          onLocationVerified={handleLocationVerified}
        />
      )}
    </>
  );
}
