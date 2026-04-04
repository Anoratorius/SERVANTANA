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
const CACHE_DURATION = 300000; // 5 minutes - GPS location doesn't change often

// Reverse geocode coordinates to city name
async function reverseGeocode(lat: number, lng: number): Promise<GeoLocation | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: { "Accept-Language": "en" },
      }
    );
    if (response.ok) {
      const data = await response.json();
      const address = data.address || {};
      const city = address.city || address.town || address.village || address.municipality || address.county || "";
      const countryCode = address.country_code?.toUpperCase() || "";
      if (city) {
        return { city, countryCode };
      }
    }
  } catch {
    // Reverse geocode failed
  }
  return null;
}

// Get precise GPS location
async function getGPSLocation(): Promise<GeoLocation | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const location = await reverseGeocode(latitude, longitude);
        resolve(location);
      },
      () => {
        // GPS denied or failed
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

// Fallback: IP-based location
async function getIPLocation(): Promise<GeoLocation | null> {
  try {
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
    // IP detection failed
  }
  return null;
}

// Main location fetch: GPS first, then IP fallback
async function fetchLocation(): Promise<GeoLocation | null> {
  // Try GPS first (precise)
  const gpsLocation = await getGPSLocation();
  if (gpsLocation) {
    return gpsLocation;
  }

  // Fallback to IP-based (approximate)
  return await getIPLocation();
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

    locationPromise
      .then((result) => {
        cachedLocation = result;
        cacheTimestamp = Date.now();
        setLocation(result);
      })
      .catch(() => {
        // Ignore errors - just means no location
      })
      .finally(() => {
        setIsDetecting(false);
      });
  }, [initial.cacheValid]);

  return { location, isDetecting };
}
