"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
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
    <div className="h-[400px] bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface LocationVerificationModalProps {
  isOpen: boolean;
  onLocationVerified: (redirectTo: string | null) => void;
}

export default function LocationVerificationModal({
  isOpen,
  onLocationVerified,
}: LocationVerificationModalProps) {
  const t = useTranslations();
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
        onLocationVerified(result.redirectTo || null);
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
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-full">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <DialogTitle className="text-xl">{t("location.verifyYourLocation")}</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {t("location.verificationExplanation")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">{t("location.whyRequired")}</p>
              <ul className="mt-1 space-y-1 list-disc list-inside text-amber-700">
                <li>{t("location.reason1")}</li>
                <li>{t("location.reason2")}</li>
                <li>{t("location.reason3")}</li>
              </ul>
            </div>
          </div>

          <LocationPicker
            onLocationSelect={handleLocationSelect}
            height="350px"
          />

          {selectedLocation && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">{t("location.selectedLocation")}:</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                {selectedLocation.city && selectedLocation.country
                  ? `${selectedLocation.city}, ${selectedLocation.country}`
                  : `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleConfirmLocation}
            disabled={!selectedLocation || isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <MapPin className="h-4 w-4 mr-2" />
            )}
            {t("location.confirmLocation")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
