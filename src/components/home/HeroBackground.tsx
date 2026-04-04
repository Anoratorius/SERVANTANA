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

    // Use Teleport API for city photos (reliable, free, no key needed)
    async function fetchCityImage() {
      try {
        // Try Teleport API first (has curated city images)
        const slug = cityName.toLowerCase().replace(/\s+/g, "-");
        const teleportUrl = `https://api.teleport.org/api/urban_areas/slug:${slug}/images/`;
        const response = await fetch(teleportUrl);

        if (response.ok) {
          const data = await response.json();
          const imageUrl = data.photos?.[0]?.image?.web;
          if (imageUrl) {
            preloadImage(imageUrl);
            return;
          }
        }
      } catch {
        // Teleport failed, try Wikipedia
      }

      // Fallback: Wikipedia skyline search
      try {
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cityName + " skyline")}`;
        const response = await fetch(wikiUrl);

        if (response.ok) {
          const data = await response.json();
          const imageUrl = data.originalimage?.source || data.thumbnail?.source?.replace(/\/\d+px-/, '/1920px-');
          if (imageUrl && !imageUrl.toLowerCase().includes("flag")) {
            preloadImage(imageUrl);
            return;
          }
        }
      } catch {
        // Wikipedia failed too
      }

      // Final fallback: plain city Wikipedia
      try {
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cityName)}`;
        const response = await fetch(wikiUrl);

        if (response.ok) {
          const data = await response.json();
          const imageUrl = data.originalimage?.source || data.thumbnail?.source?.replace(/\/\d+px-/, '/1920px-');
          if (imageUrl && !imageUrl.toLowerCase().includes("flag") && !imageUrl.toLowerCase().includes("emblem")) {
            preloadImage(imageUrl);
          }
        }
      } catch {
        // All failed - no background
      }
    }

    function preloadImage(url: string) {
      const img = new window.Image();
      img.onload = () => setLoadedImageUrl(url);
      img.onerror = () => setLoadedImageUrl("");
      img.src = url;
    }

    fetchCityImage();
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
