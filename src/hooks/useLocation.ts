"use client";

import { useState, useEffect } from "react";

interface GeoLocation {
  city: string;
  countryCode: string;
}

// Shared location cache - reset on each page load
let cachedLocation: GeoLocation | null = null;
let locationPromise: Promise<GeoLocation | null> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30000; // 30 seconds - refresh location periodically

async function fetchLocation(): Promise<GeoLocation | null> {
  try {
    // Try ipinfo.io first
    const response = await fetch("https://ipinfo.io/json", { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (data.city) {
        return {
          city: data.city,
          countryCode: data.country || "",
        };
      }
    }
  } catch {
    // Try ipwho.is as fallback
    try {
      const response = await fetch("https://ipwho.is/", { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data.city) {
          return {
            city: data.city,
            countryCode: data.country_code || "",
          };
        }
      }
    } catch {
      // Ignore
    }
  }
  return null;
}

export function useLocation() {
  const [location, setLocation] = useState<GeoLocation | null>(cachedLocation);
  const [isDetecting, setIsDetecting] = useState(!cachedLocation);

  useEffect(() => {
    const now = Date.now();
    const cacheValid = cachedLocation && (now - cacheTimestamp) < CACHE_DURATION;

    if (cacheValid) {
      setLocation(cachedLocation);
      setIsDetecting(false);
      return;
    }

    // Reset cache
    cachedLocation = null;
    locationPromise = null;

    // Fetch fresh location
    locationPromise = fetchLocation();

    locationPromise.then((result) => {
      cachedLocation = result;
      cacheTimestamp = Date.now();
      setLocation(result);
      setIsDetecting(false);
    });
  }, []);

  return { location, isDetecting };
}
