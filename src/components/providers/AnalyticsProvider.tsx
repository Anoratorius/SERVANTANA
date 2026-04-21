"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initEventTracking, trackPageView, cleanupEventTracking } from "@/lib/event-tracking";

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize tracking on mount
  useEffect(() => {
    initEventTracking();

    return () => {
      cleanupEventTracking();
    };
  }, []);

  // Track page views on route change
  useEffect(() => {
    // Track page view for each navigation
    trackPageView({
      pagePath: pathname,
      pageUrl: `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
    });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
