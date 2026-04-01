"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Shield } from "lucide-react";
import { toast } from "sonner";

// Dynamic import for Leaflet (SSR issues)
const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface LocationVerificationModalProps {
  isOpen: boolean;
  onLocationVerified: () => void;
}

export default function LocationVerificationModal({
  isOpen,
  onLocationVerified,
}: LocationVerificationModalProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    city?: string;
    country?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleLocationSelect = (lat: number, lng: number, city?: string, country?: string) => {
    setSelectedLocation({ lat, lng, city, country });
  };

  const handleConfirmLocation = async () => {
    if (!selectedLocation) {
      toast.error(t("location.pleaseSelectLocation"));
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/user/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          city: selectedLocation.city,
          country: selectedLocation.country,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(t("location.locationVerified"));

        // Extract locale and redirect directly
        const localeMatch = pathname.match(/^\/(en|de)/);
        const locale = localeMatch ? localeMatch[1] : "en";

        if (result.redirectTo) {
          window.location.href = `/${locale}${result.redirectTo}`;
        } else {
          window.location.reload();
        }
        return; // Exit early, navigation is happening
      } else {
        const data = await response.json();
        toast.error(data.error || t("location.verificationFailed"));
      }
    } catch (error) {
      console.error("Location verification error:", error);
      toast.error(t("location.verificationFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[420px] max-h-[85vh] overflow-y-auto p-4"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-100 rounded-full">
              <MapPin className="h-4 w-4 text-blue-600" />
            </div>
            <DialogTitle className="text-base">{t("location.verifyYourLocation")}</DialogTitle>
          </div>
          <DialogDescription className="text-left text-xs">
            {t("location.verificationExplanation")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
            <Shield className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800">
              <p className="font-medium">{t("location.whyRequired")}</p>
              <ul className="mt-1 space-y-0.5 list-disc list-inside text-amber-700">
                <li>{t("location.reason1")}</li>
                <li>{t("location.reason2")}</li>
                <li>{t("location.reason3")}</li>
              </ul>
            </div>
          </div>

          <LocationPicker
            onLocationSelect={handleLocationSelect}
            height="200px"
          />

          {selectedLocation && (
            <div className="p-2 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-1.5 text-green-800">
                <MapPin className="h-3 w-3" />
                <span className="font-medium text-xs">{t("location.selectedLocation")}:</span>
              </div>
              <p className="text-xs text-green-700 mt-0.5">
                {selectedLocation.city && selectedLocation.country
                  ? `${selectedLocation.city}, ${selectedLocation.country}`
                  : `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button
            onClick={handleConfirmLocation}
            disabled={!selectedLocation || isSaving}
            size="sm"
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
            ) : (
              <MapPin className="h-3 w-3 mr-1.5" />
            )}
            {t("location.confirmLocation")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
