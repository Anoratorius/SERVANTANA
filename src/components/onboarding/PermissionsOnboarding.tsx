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
import { Bell, MapPin, Check, Sparkles, Shield } from "lucide-react";
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
    permissionsList: "This will enable:",
    notifFeature: "Notifications - booking updates & reminders",
    locationFeature: "Location - find cleaners near you",
  },
  de: {
    welcomeTitle: "Willkommen bei Servantana!",
    welcomeDesc: "Aktivieren Sie Funktionen für das beste Erlebnis",
    enableAll: "Alle Funktionen aktivieren",
    enablingFeatures: "Aktiviere...",
    allEnabled: "Alles bereit!",
    continueBtn: "Weiter",
    permissionsList: "Dies aktiviert:",
    notifFeature: "Benachrichtigungen - Buchungsupdates & Erinnerungen",
    locationFeature: "Standort - Reiniger in Ihrer Nähe finden",
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

    // Check for reset parameter (for testing)
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

    // Request notifications
    if ("Notification" in window) {
      try {
        const result = await Notification.requestPermission();
        newPermissions.notifications = result === "granted" ? "granted" : "denied";
      } catch {
        newPermissions.notifications = "denied";
      }
    }
    setPermissions({ ...newPermissions });

    // Request location
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

  const getIcon = (status: PermissionStatus) => {
    if (status === "granted") {
      return <Check className="h-5 w-5 text-green-500" />;
    }
    return <div className="h-5 w-5 rounded-full bg-gray-300" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
            {isDone ? (
              <Check className="h-10 w-10 text-white" />
            ) : (
              <Sparkles className="h-10 w-10 text-white" />
            )}
          </div>
          <DialogTitle className="text-2xl">
            {isDone ? t.allEnabled : t.welcomeTitle}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t.welcomeDesc}
          </DialogDescription>
        </DialogHeader>

        {/* Features List */}
        <div className="py-4">
          {!isDone && (
            <p className="text-sm text-gray-500 mb-3 text-center">{t.permissionsList}</p>
          )}

          <div className="space-y-3">
            {/* Notifications */}
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all",
              permissions.notifications === "granted" ? "bg-green-50" : "bg-gray-50"
            )}>
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                permissions.notifications === "granted" ? "bg-green-100" : "bg-blue-100"
              )}>
                <Bell className={cn(
                  "h-5 w-5",
                  permissions.notifications === "granted" ? "text-green-600" : "text-blue-600"
                )} />
              </div>
              <p className="flex-1 text-sm">{t.notifFeature}</p>
              {isDone && getIcon(permissions.notifications)}
            </div>

            {/* Location */}
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all",
              permissions.location === "granted" ? "bg-green-50" : "bg-gray-50"
            )}>
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                permissions.location === "granted" ? "bg-green-100" : "bg-green-100"
              )}>
                <MapPin className={cn(
                  "h-5 w-5",
                  permissions.location === "granted" ? "text-green-600" : "text-green-600"
                )} />
              </div>
              <p className="flex-1 text-sm">{t.locationFeature}</p>
              {isDone && getIcon(permissions.location)}
            </div>
          </div>
        </div>

        {/* Security Note */}
        {!isDone && (
          <div className="flex items-center gap-2 text-xs text-gray-400 justify-center mb-2">
            <Shield className="h-3 w-3" />
            <span>Your data stays private and secure</span>
          </div>
        )}

        {/* Single Action Button */}
        <Button
          onClick={isDone ? handleComplete : enableAllFeatures}
          disabled={isEnabling}
          className="w-full h-12 text-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          {isEnabling ? t.enablingFeatures : isDone ? t.continueBtn : t.enableAll}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
