"use client";

import { useState, useEffect } from "react";
import { useLocation } from "@/hooks/useLocation";

export function HeroBackground() {
  const { location, isDetecting } = useLocation();
  const [imageUrl, setImageUrl] = useState<string>("");

  useEffect(() => {
    if (isDetecting || !location?.city) return;

    const cityName = location.city;

    async function fetchCityImage() {

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

      // No fallback - keep empty if city image not found
    }

    fetchCityImage();
  }, [location, isDetecting]);

  if (!imageUrl) return null;

  return (
    <>
      <img
        src={imageUrl}
        alt="City"
        className="absolute inset-0 w-full h-full object-cover z-0"
        onError={() => setImageUrl("")}
      />
      <div className="absolute inset-0 z-0 bg-white/60" />
    </>
  );
}
