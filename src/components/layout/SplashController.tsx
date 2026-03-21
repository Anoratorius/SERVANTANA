"use client";

import { useEffect } from "react";
import { useLocation } from "@/hooks/useLocation";

declare global {
  interface Window {
    hideSplash?: () => void;
  }
}

export function SplashController() {
  const { isDetecting } = useLocation();

  useEffect(() => {
    // Hide splash when location detection is complete
    if (!isDetecting && typeof window !== "undefined" && window.hideSplash) {
      // Small delay for smooth transition
      setTimeout(() => {
        window.hideSplash?.();
      }, 100);
    }
  }, [isDetecting]);

  return null;
}
