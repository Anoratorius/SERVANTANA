"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Bell, MapPin, Check, Sparkles } from "lucide-react";
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

    const timer = setTimeout(() => setIsOpen(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const enableAllFeatures = async () => {
    setIsEnabling(true);
    const newPermissions: PermissionState = { ...permissions };

    if ("Notification" in window) {
      try {
        const result = await Notification.requestPermission();
        newPermissions.notifications = result === "granted" ? "granted" : "denied";
      } catch {
        newPermissions.notifications = "denied";
      }
    }
    setPermissions({ ...newPermissions });

    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      newPermissions.location = "granted";
    } catch {
      newPermissions.location = "denied";
    }
    setPermissions({ ...newPermissions });

    setIsEnabling(false);
    setIsDone(true);
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm mx-4 p-5 [&>button]:hidden">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
            {isDone ? (
              <Check className="h-8 w-8 text-white" />
            ) : (
              <Sparkles className="h-8 w-8 text-white" />
            )}
          </div>
          <DialogTitle className="text-xl">
            {isDone ? t.allEnabled : t.welcomeTitle}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t.welcomeDesc}
          </DialogDescription>
        </DialogHeader>

        {/* Features - Compact */}
        <div className="flex justify-center gap-6 py-3">
          <div className={cn(
            "flex flex-col items-center gap-1",
            permissions.notifications === "granted" && "text-green-600"
          )}>
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              permissions.notifications === "granted" ? "bg-green-100" : "bg-blue-100"
            )}>
              {permissions.notifications === "granted" ? (
                <Check className="h-6 w-6 text-green-600" />
              ) : (
                <Bell className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <span className="text-xs font-medium">{t.notifFeature}</span>
          </div>

          <div className={cn(
            "flex flex-col items-center gap-1",
            permissions.location === "granted" && "text-green-600"
          )}>
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              permissions.location === "granted" ? "bg-green-100" : "bg-green-100"
            )}>
              {permissions.location === "granted" ? (
                <Check className="h-6 w-6 text-green-600" />
              ) : (
                <MapPin className="h-6 w-6 text-green-600" />
              )}
            </div>
            <span className="text-xs font-medium">{t.locationFeature}</span>
          </div>
        </div>

        {/* Button */}
        <Button
          onClick={isDone ? handleComplete : enableAllFeatures}
          disabled={isEnabling}
          className="w-full h-11 text-base bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          {isEnabling ? t.enablingFeatures : isDone ? t.continueBtn : t.enableAll}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
