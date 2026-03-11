"use client";

import { useState, useEffect } from "react";

export function HeroBackground() {
  const [imageUrl, setImageUrl] = useState<string>("");

  useEffect(() => {
    async function detectLocationAndGetImage() {
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          if (data.city) {
            // Search Wikimedia Commons for city skyline/view images (namespace 6 = files)
            const cityName = data.city;
            const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=File:${encodeURIComponent(cityName)}%20skyline&gsrlimit=20&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=1920&format=json&origin=*`;

            const wikiResponse = await fetch(searchUrl);
            if (wikiResponse.ok) {
              const wikiData = await wikiResponse.json();
              const pages = wikiData.query?.pages;

              if (pages) {
                const pageList = Object.values(pages) as Array<{ title?: string; imageinfo?: Array<{ thumburl?: string }> }>;
                for (const page of pageList) {
                  const title = page.title || "";
                  const lowerTitle = title.toLowerCase();
                  const thumburl = page.imageinfo?.[0]?.thumburl;

                  // MUST contain the city name in the title
                  if (!lowerTitle.includes(cityName.toLowerCase())) continue;

                  // Skip non-photo formats and non-landmark images
                  if (!thumburl) continue;
                  if (lowerTitle.includes('.svg')) continue;
                  if (lowerTitle.includes('.gif')) continue;
                  if (lowerTitle.includes('wapen')) continue;
                  if (lowerTitle.includes('coat')) continue;
                  if (lowerTitle.includes('vlag')) continue;
                  if (lowerTitle.includes('flag')) continue;
                  if (lowerTitle.includes('piramide')) continue;
                  if (lowerTitle.includes('map')) continue;
                  if (lowerTitle.includes('logo')) continue;
                  if (lowerTitle.includes('icon')) continue;
                  if (lowerTitle.includes('diagram')) continue;
                  if (lowerTitle.includes('chart')) continue;

                  setImageUrl(thumburl);
                  return;
                }
              }
            }

            // Fallback: Use Unsplash
            setImageUrl(`https://source.unsplash.com/1920x1080/?${encodeURIComponent(data.city)},city`);
          }
        }
      } catch (error) {
        console.error("Failed to detect location:", error);
      }
    }

    detectLocationAndGetImage();
  }, []);

  if (!imageUrl) return null;

  return (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="absolute inset-0 bg-white/80" />
    </>
  );
}
