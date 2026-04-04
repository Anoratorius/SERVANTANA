"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useLocation } from "@/hooks/useLocation";

// Shuffle array randomly
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Check if URL is a flag/emblem image
function isBadImage(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes("flag") || lower.includes("emblem") || lower.includes("coat_of_arms");
}

type ImageSource = (city: string) => Promise<string | null>;

// Source 1: Teleport API
const fetchFromTeleport: ImageSource = async (city) => {
  const slug = city.toLowerCase().replace(/\s+/g, "-");
  const response = await fetch(`https://api.teleport.org/api/urban_areas/slug:${slug}/images/`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.photos?.[0]?.image?.web || null;
};

// Source 2: Wikipedia Skyline
const fetchFromWikiSkyline: ImageSource = async (city) => {
  const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city + " skyline")}`);
  if (!response.ok) return null;
  const data = await response.json();
  const url = data.originalimage?.source || data.thumbnail?.source?.replace(/\/\d+px-/, '/1920px-');
  return url && !isBadImage(url) ? url : null;
};

// Source 3: Wikipedia City
const fetchFromWikiCity: ImageSource = async (city) => {
  const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`);
  if (!response.ok) return null;
  const data = await response.json();
  const url = data.originalimage?.source || data.thumbnail?.source?.replace(/\/\d+px-/, '/1920px-');
  return url && !isBadImage(url) ? url : null;
};

// Source 4: Wikimedia Commons
const fetchFromWikimediaCommons: ImageSource = async (city) => {
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(city + " skyline OR cityscape")}&srnamespace=6&srlimit=5&format=json&origin=*`;
  const response = await fetch(searchUrl);
  if (!response.ok) return null;
  const data = await response.json();
  const results = data.query?.search || [];

  for (const result of results) {
    const title = result.title;
    if (isBadImage(title)) continue;

    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&iiurlwidth=1920&format=json&origin=*`;
    const infoResponse = await fetch(infoUrl);
    if (!infoResponse.ok) continue;

    const infoData = await infoResponse.json();
    const pages = infoData.query?.pages || {};
    const page = Object.values(pages)[0] as { imageinfo?: { thumburl?: string; url?: string }[] };
    const imageUrl = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url;

    if (imageUrl && !isBadImage(imageUrl)) return imageUrl;
  }
  return null;
};

// Source 5: Pexels API
const fetchFromPexels: ImageSource = async (city) => {
  const response = await fetch(`/api/images/pexels?city=${encodeURIComponent(city)}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.imageUrl || null;
};

// All sources
const allSources: ImageSource[] = [
  fetchFromTeleport,
  fetchFromWikiSkyline,
  fetchFromWikiCity,
  fetchFromWikimediaCommons,
  fetchFromPexels,
];

export function HeroBackground() {
  const { location, isDetecting } = useLocation();
  const [loadedImageUrl, setLoadedImageUrl] = useState<string>("");

  useEffect(() => {
    if (isDetecting || !location?.city) return;

    const cityName = location.city;

    async function fetchCityImage() {
      // Randomly shuffle all sources
      const shuffledSources = shuffleArray(allSources);

      // Try each source in random order until one works
      for (const source of shuffledSources) {
        try {
          const imageUrl = await source(cityName);
          if (imageUrl) {
            // Preload and set
            const img = new window.Image();
            img.onload = () => setLoadedImageUrl(imageUrl);
            img.src = imageUrl;
            return;
          }
        } catch {
          // This source failed, try next
        }
      }
      // All sources failed - no background
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
