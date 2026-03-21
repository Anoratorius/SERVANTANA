"use client";

import { MapPin, Loader2 } from "lucide-react";
import { useLocation } from "@/hooks/useLocation";

export function HeaderLocation() {
  const { location, isDetecting } = useLocation();

  if (isDetecting) {
    return (
      <div className="flex items-center text-muted-foreground">
        <Loader2 className="h-5 w-5 md:h-5 md:w-5 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!location) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 md:gap-1.5 text-base md:text-lg font-semibold text-gray-700">
      <MapPin className="h-5 w-5 md:h-6 md:w-6 text-blue-500 flex-shrink-0" />
      <span className="truncate max-w-[150px] md:max-w-none">{location.city}</span>
    </div>
  );
}
