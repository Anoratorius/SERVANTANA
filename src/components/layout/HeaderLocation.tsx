"use client";

import { MapPin, Loader2 } from "lucide-react";
import { useLocation } from "@/hooks/useLocation";

export function HeaderLocation() {
  const { location, isDetecting } = useLocation();

  if (isDetecting) {
    return (
      <div className="flex items-center text-muted-foreground">
        <Loader2 className="h-3 w-3 md:h-5 md:w-5 animate-spin" />
      </div>
    );
  }

  if (!location) {
    return null;
  }

  return (
    <div className="flex items-center gap-0.5 md:gap-1.5 text-[11px] md:text-lg font-semibold text-gray-700">
      <MapPin className="h-3 w-3 md:h-6 md:w-6 text-blue-500 flex-shrink-0" />
      <span className="truncate max-w-[50px] md:max-w-none">{location.city}</span>
    </div>
  );
}
