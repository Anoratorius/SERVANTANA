"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, MapPin, Check, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "servantana-onboarding-complete";

type PermissionStatus = "pending" | "granted" | "denied";

interface PermissionState {
  notifications: PermissionStatus;
  location: PermissionStatus;
}

const translations = {
  en: {
    welcomeTitle: "Welcome to Servantana!",
    welcomeDesc: "Enable features for the best experience",
    enableAll: "Enable All Features",
    enablingFeatures: "Enabling...",
    allEnabled: "All Set!",
    continueBtn: "Continue",
    notifFeature: "Notifications",
    locationFeature: "Location",
  },
  de: {
    welcomeTitle: "Willkommen bei Servantana!",
    welcomeDesc: "Aktivieren Sie Funktionen für das beste Erlebnis",
    enableAll: "Alle Funktionen aktivieren",
    enablingFeatures: "Aktiviere...",
    allEnabled: "Alles bereit!",
    continueBtn: "Weiter",
    notifFeature: "Benachrichtigungen",
    locationFeature: "Standort",
  },
};

interface PermissionsOnboardingProps {
  locale: string;
}

export function PermissionsOnboarding({ locale }: PermissionsOnboardingProps) {
  const t = translations[locale as keyof typeof translations] || translations.en;

  const [isOpen, setIsOpen] = useState(false);
  const [permissions, setPermissions] = useState<PermissionState>({
    notifications: "pending",
    location: "pending",
  });
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("reset") === "1") {
      localStorage.removeItem(STORAGE_KEY);
      urlParams.delete("reset");
      const newUrl = window.location.pathname + (urlParams.toString() ? "?" + urlParams.toString() : "");
      window.history.replaceState({}, "", newUrl);
    }

    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed) return;

    // Show immediately - no delay
    setIsOpen(true);
  }, []);

  const enableAllFeatures = async () => {
    setIsEnabling(true);
    const newPermissions: PermissionState = { ...permissions };

    // Request BOTH permissions in parallel
    const notificationPromise = (async () => {
      if ("Notification" in window) {
        try {
          const result = await Notification.requestPermission();
          newPermissions.notifications = result === "granted" ? "granted" : "denied";
        } catch {
          newPermissions.notifications = "denied";
        }
      }
    })();

    const locationPromise = (async () => {
      try {
        await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        newPermissions.location = "granted";
      } catch {
        newPermissions.location = "denied";
      }
    })();

    // Wait for both to complete
    await Promise.all([notificationPromise, locationPromise]);

    setPermissions({ ...newPermissions });
    setIsEnabling(false);
    setIsDone(true);
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[280px] p-4 text-center">
        {/* Icon */}
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
          {isDone ? (
            <Check className="h-7 w-7 text-white" />
          ) : (
            <Sparkles className="h-7 w-7 text-white" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold mb-1">
          {isDone ? t.allEnabled : t.welcomeTitle}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          {t.welcomeDesc}
        </p>

        {/* Features */}
        <div className="flex justify-center gap-8 mb-4">
          <div className={cn(
            "flex flex-col items-center gap-1",
            permissions.notifications === "granted" && "text-green-600"
          )}>
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              permissions.notifications === "granted" ? "bg-green-100" : "bg-blue-100"
            )}>
              {permissions.notifications === "granted" ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <Bell className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <span className="text-xs">{t.notifFeature}</span>
          </div>

          <div className={cn(
            "flex flex-col items-center gap-1",
            permissions.location === "granted" && "text-green-600"
          )}>
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              permissions.location === "granted" ? "bg-green-100" : "bg-green-100"
            )}>
              {permissions.location === "granted" ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <MapPin className="h-5 w-5 text-green-600" />
              )}
            </div>
            <span className="text-xs">{t.locationFeature}</span>
          </div>
        </div>

        {/* Button */}
        <Button
          onClick={isDone ? handleComplete : enableAllFeatures}
          disabled={isEnabling}
          className="w-full h-10 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          {isEnabling ? t.enablingFeatures : isDone ? t.continueBtn : t.enableAll}
        </Button>
      </div>
    </div>
  );
}
