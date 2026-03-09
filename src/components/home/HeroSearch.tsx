"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";

interface GeoLocation {
  city: string;
  countryCode: string;
}

export function HeroSearch() {
  const t = useTranslations();
  const router = useRouter();
  const [isDetecting, setIsDetecting] = useState(true);
  const [location, setLocation] = useState<GeoLocation | null>(null);

  useEffect(() => {
    async function detectLocation() {
      try {
        const response = await fetch("http://ip-api.com/json/?fields=city,countryCode");
        if (response.ok) {
          const data = await response.json();
          if (data.city) {
            setLocation({
              city: data.city,
              countryCode: data.countryCode,
            });
          }
        }
      } catch (error) {
        console.error("Failed to detect location:", error);
      } finally {
        setIsDetecting(false);
      }
    }

    detectLocation();
  }, []);

  const handleCategoryClick = () => {
    router.push("/categories");
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs sm:max-w-md mx-auto px-4 sm:px-0">
      {/* Categories Button */}
      <Button
        onClick={handleCategoryClick}
        className="w-full h-16 md:h-18 text-xl md:text-2xl bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all uppercase cursor-pointer"
        style={{ fontFamily: 'var(--font-logo)' }}
      >
        {t("admin.categories")}
      </Button>

      {/* Location */}
      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-600">
        {isDetecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : location ? (
          <>
            <MapPin className="h-4 w-4 text-blue-500" />
            <span>{location.city}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
