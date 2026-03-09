"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronRight, Loader2 } from "lucide-react";

interface GeoLocation {
  city: string;
  country: string;
  countryCode: string;
}

export function LocationSearch() {
  const t = useTranslations();
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [isDetecting, setIsDetecting] = useState(true);
  const [detectedLocation, setDetectedLocation] = useState<GeoLocation | null>(null);

  useEffect(() => {
    async function detectLocation() {
      try {
        // Using ip-api.com - free, no API key required
        const response = await fetch("http://ip-api.com/json/?fields=city,country,countryCode");
        if (response.ok) {
          const data = await response.json();
          if (data.city) {
            setDetectedLocation({
              city: data.city,
              country: data.country,
              countryCode: data.countryCode,
            });
            setLocation(data.city);
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

  const handleSearch = () => {
    if (location.trim()) {
      router.push(`/search?location=${encodeURIComponent(location.trim())}`);
    } else {
      router.push("/search");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
      <div className="relative flex-1">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
        {isDetecting ? (
          <div className="flex items-center h-12 pl-10 pr-4 border rounded-md bg-white">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
            <span className="text-muted-foreground text-sm">
              {t("home.hero.detectingLocation")}
            </span>
          </div>
        ) : (
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("home.hero.searchPlaceholder")}
            className="pl-10 h-12"
          />
        )}
        {detectedLocation && !isDetecting && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-green-600">
            <span className="hidden sm:inline">{detectedLocation.countryCode}</span>
          </div>
        )}
      </div>
      <Button
        size="lg"
        className="h-12 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
        onClick={handleSearch}
        disabled={isDetecting}
      >
        {t("home.hero.searchButton")}
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
