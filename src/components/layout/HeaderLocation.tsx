"use client";

import { useState, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface GeoLocation {
  city: string;
  countryCode: string;
}

export function HeaderLocation() {
  const [isDetecting, setIsDetecting] = useState(true);
  const [location, setLocation] = useState<GeoLocation | null>(null);

  useEffect(() => {
    async function detectLocation() {
      try {
        const response = await fetch("http://ip-api.com/json/?fields=city,countryCode");
        if (response.ok) {
          const data = await response.json();
          if (data.city) {
            setLocation({
              city: data.city,
              countryCode: data.countryCode,
            });
          }
        }
      } catch (error) {
        console.error("Failed to detect location:", error);
      } finally {
        setIsDetecting(false);
      }
    }

    detectLocation();
  }, []);

  if (isDetecting) {
    return (
      <div className="flex items-center gap-2 text-base text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!location) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-sm sm:text-base font-semibold text-gray-700">
      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
      <span className="truncate max-w-[80px] sm:max-w-none">{location.city}</span>
    </div>
  );
}
