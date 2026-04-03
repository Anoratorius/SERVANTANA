"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useLocation } from "@/hooks/useLocation";

export function HeroBackground() {
  const { location, isDetecting } = useLocation();
  const [loadedImageUrl, setLoadedImageUrl] = useState<string>("");

  useEffect(() => {
    if (isDetecting || !location?.city) return;

    const cityName = location.city;

    // Universal rule: Unsplash with city + skyline for all cities
    const unsplashUrl = `https://source.unsplash.com/1920x1080/?${encodeURIComponent(cityName)},skyline`;

    // Preload image - only show after fully loaded
    const img = new window.Image();
    img.onload = () => {
      setLoadedImageUrl(unsplashUrl);
    };
    img.onerror = () => {
      // Silently fail - no background
      setLoadedImageUrl("");
    };
    img.src = unsplashUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [location, isDetecting]);

  if (!loadedImageUrl) return null;

  return (
    <>
      <Image
        src={loadedImageUrl}
        alt="City"
        fill
        className="object-cover z-0"
        unoptimized
        priority
      />
      <div className="absolute inset-0 z-0 bg-white/60" />
    </>
  );
}
