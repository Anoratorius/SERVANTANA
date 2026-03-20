"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";

export function HeroSearch() {
  const t = useTranslations();
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);

  // Auto-detect location on mount
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = async () => {
    setIsDetecting(true);
    try {
      // Try IP-based detection first (faster, no permission needed)
      const response = await fetch("https://ipwho.is/");
      const data = await response.json();
      if (data.city) {
        setLocation(data.city);
      }
    } catch {
      // Fallback: try browser geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const geoResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
              );
              const geoData = await geoResponse.json();
              if (geoData.address?.city || geoData.address?.town || geoData.address?.village) {
                setLocation(geoData.address.city || geoData.address.town || geoData.address.village);
              }
            } catch {
              // Silently fail
            }
          },
          () => {
            // Permission denied or error - silently fail
          },
          { timeout: 5000 }
        );
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleCategoryClick = () => {
    if (location) {
      router.push(`/categories?location=${encodeURIComponent(location)}`);
    } else {
      router.push("/categories");
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs sm:max-w-md mx-auto px-4 sm:px-0">
      {/* Location Input - Mobile Only */}
      <div className="relative md:hidden">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">
          {isDetecting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <MapPin className="h-5 w-5" />
          )}
        </div>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={isDetecting ? t("home.hero.detectingLocation") : t("home.hero.searchPlaceholder")}
          className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none bg-white/90 backdrop-blur-sm text-gray-700 placeholder-gray-400 shadow-sm"
        />
      </div>

      {/* Categories Button */}
      <Button
        onClick={handleCategoryClick}
        className="w-full h-16 md:h-18 text-xl md:text-2xl bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all uppercase cursor-pointer"
        style={{ fontFamily: 'var(--font-logo)' }}
      >
        {t("admin.categories")}
      </Button>
    </div>
  );
}
