"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useLocation } from "@/hooks/useLocation";

// Check if URL looks like a flag image
function isFlagImage(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes("flag") ||
    lowerUrl.includes("banner") ||
    lowerUrl.includes("coat_of_arms") ||
    lowerUrl.includes("emblem")
  );
}

// Extract valid city image URL from Wikipedia data
function extractImageUrl(data: { originalimage?: { source: string }; thumbnail?: { source: string } }): string | null {
  if (data.originalimage?.source && !isFlagImage(data.originalimage.source)) {
    return data.originalimage.source;
  }
  if (data.thumbnail?.source && !isFlagImage(data.thumbnail.source)) {
    return data.thumbnail.source.replace(/\/\d+px-/, '/1920px-');
  }
  return null;
}

export function HeroBackground() {
  const { location, isDetecting } = useLocation();
  const [imageUrl, setImageUrl] = useState<string>("");

  useEffect(() => {
    if (isDetecting || !location?.city) return;

    const cityName = location.city;

    async function fetchCityImage() {
      // Try different search terms in order of preference
      const searchTerms = [
        `${cityName} skyline`,
        `${cityName} cityscape`,
        cityName,
      ];

      for (const searchTerm of searchTerms) {
        try {
          const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`;
          const response = await fetch(wikiUrl);

          if (response.ok) {
            const data = await response.json();
            const imgUrl = extractImageUrl(data);

            if (imgUrl) {
              setImageUrl(imgUrl);
              return;
            }
          }
        } catch (error) {
          console.error(`Failed to fetch image for ${searchTerm}:`, error);
        }
      }

      // No valid city image found
    }

    fetchCityImage();
  }, [location, isDetecting]);

  if (!imageUrl) return null;

  return (
    <>
      <Image
        src={imageUrl}
        alt="City"
        fill
        className="object-cover z-0"
        onError={() => setImageUrl("")}
        unoptimized
      />
      <div className="absolute inset-0 z-0 bg-white/60" />
    </>
  );
}
