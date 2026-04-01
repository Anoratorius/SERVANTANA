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
    // Try ip-api.com as fallback (free for non-commercial use)
    try {
      const response = await fetch("http://ip-api.com/json/?fields=city,countryCode", { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data.city) {
          return {
            city: data.city,
            countryCode: data.countryCode || "",
          };
        }
      }
    } catch {
      // Ignore
    }
  }
  return null;
}

function getInitialLocation(): { location: GeoLocation | null; cacheValid: boolean } {
  const now = Date.now();
  const cacheValid = cachedLocation !== null && (now - cacheTimestamp) < CACHE_DURATION;
  return { location: cacheValid ? cachedLocation : null, cacheValid };
}

export function useLocation() {
  const initial = getInitialLocation();
  const [location, setLocation] = useState<GeoLocation | null>(initial.location);
  const [isDetecting, setIsDetecting] = useState(!initial.cacheValid);

  useEffect(() => {
    // Skip if cache was valid during initialization
    if (initial.cacheValid) return;

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
  }, [initial.cacheValid]);

  return { location, isDetecting };
}
