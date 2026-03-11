"use client";

import { useState, useEffect } from "react";
import { useLocation } from "@/hooks/useLocation";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1920";

export function HeroBackground() {
  const { location, isDetecting } = useLocation();
  const [imageUrl, setImageUrl] = useState<string>(FALLBACK_IMAGE);

  useEffect(() => {
    if (isDetecting || !location?.city) return;

    async function fetchCityImage() {
      const cityName = location.city;

      try {
        // Get city image from Wikipedia
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cityName)}`;
        const response = await fetch(wikiUrl);

        if (response.ok) {
          const data = await response.json();

          // Try original image first, then thumbnail
          if (data.originalimage?.source) {
            setImageUrl(data.originalimage.source);
            return;
          }
          if (data.thumbnail?.source) {
            // Get higher resolution
            const highRes = data.thumbnail.source.replace(/\/\d+px-/, '/1920px-');
            setImageUrl(highRes);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to fetch city image:", error);
      }

      // Keep fallback
      setImageUrl(FALLBACK_IMAGE);
    }

    fetchCityImage();
  }, [location, isDetecting]);

  return (
    <>
      <img
        src={imageUrl}
        alt="City"
        className="absolute inset-0 w-full h-full object-cover z-0"
        onError={() => setImageUrl(FALLBACK_IMAGE)}
      />
      <div className="absolute inset-0 z-0 bg-white/60" />
    </>
  );
}
