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
import { Mic, Bell, MapPin, Check, Sparkles, Shield, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PermissionResetGuide } from "./PermissionResetGuide";

const STORAGE_KEY = "servantana-onboarding-complete";

type PermissionStatus = "pending" | "granted" | "denied";

interface PermissionState {
  microphone: PermissionStatus;
  notifications: PermissionStatus;
  location: PermissionStatus;
}

const translations = {
  en: {
    welcomeTitle: "Welcome to Servantana!",
    welcomeDesc: "Enable features for the best experience",
    enableAll: "Enable All Features",
    skipForNow: "Skip for Now",
    enablingFeatures: "Enabling...",
    allEnabled: "All Set!",
    continueBtn: "Continue",
    permissionsList: "This will enable:",
    micFeature: "Voice Search - find cleaners by speaking",
    notifFeature: "Notifications - booking updates & reminders",
    locationFeature: "Location - find cleaners near you",
    someBlocked: "Some features couldn't be enabled. You can still use the app!",
    blockedTitle: "Some features need your attention",
    blockedDesc: "A few features were previously blocked. Let's fix that!",
    fixBlocked: "Show Me How",
    tryAgain: "Try Again",
  },
  de: {
    welcomeTitle: "Willkommen bei Servantana!",
    welcomeDesc: "Aktivieren Sie Funktionen für das beste Erlebnis",
    enableAll: "Alle Funktionen aktivieren",
    skipForNow: "Jetzt überspringen",
    enablingFeatures: "Aktiviere...",
    allEnabled: "Alles bereit!",
    continueBtn: "Weiter",
    permissionsList: "Dies aktiviert:",
    micFeature: "Sprachsuche - Reiniger per Sprache finden",
    notifFeature: "Benachrichtigungen - Buchungsupdates & Erinnerungen",
    locationFeature: "Standort - Reiniger in Ihrer Nähe finden",
    someBlocked: "Einige Funktionen konnten nicht aktiviert werden. Sie können die App trotzdem nutzen!",
    blockedTitle: "Einige Funktionen brauchen Ihre Aufmerksamkeit",
    blockedDesc: "Einige Funktionen wurden zuvor blockiert. Lassen Sie uns das beheben!",
    fixBlocked: "Zeig mir wie",
    tryAgain: "Erneut versuchen",
  },
};

interface PermissionsOnboardingProps {
  locale: string;
}

export function PermissionsOnboarding({ locale }: PermissionsOnboardingProps) {
  const t = translations[locale as keyof typeof translations] || translations.en;

  const [isOpen, setIsOpen] = useState(false);
  const [permissions, setPermissions] = useState<PermissionState>({
    microphone: "pending",
    notifications: "pending",
    location: "pending",
  });
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [showResetGuide, setShowResetGuide] = useState(false);
  const [hasBlockedPermissions, setHasBlockedPermissions] = useState(false);

  useEffect(() => {
    // Check if running in browser
    if (typeof window === "undefined") return;

    // Check for reset parameter (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("reset") === "1") {
      localStorage.removeItem(STORAGE_KEY);
      console.log("[Onboarding] Reset triggered via URL param");
      // Remove the param from URL without reload
      urlParams.delete("reset");
      const newUrl = window.location.pathname + (urlParams.toString() ? "?" + urlParams.toString() : "");
      window.history.replaceState({}, "", newUrl);
    }

    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed) {
      console.log("[Onboarding] Already completed, skipping");
      return;
    }

    console.log("[Onboarding] Starting...");

    const checkPermissions = async () => {
      let blocked = false;

      try {
        // Check microphone
        if (navigator.permissions) {
          try {
            const micPerm = await navigator.permissions.query({ name: "microphone" as PermissionName });
            if (micPerm.state === "denied") blocked = true;
          } catch (e) {
            console.log("[Onboarding] Mic permission query not supported");
          }
        }

        // Check notifications
        if ("Notification" in window && Notification.permission === "denied") {
          blocked = true;
        }

        // Check location
        if (navigator.permissions) {
          try {
            const geoPerm = await navigator.permissions.query({ name: "geolocation" });
            if (geoPerm.state === "denied") blocked = true;
          } catch (e) {
            console.log("[Onboarding] Geo permission query not supported");
          }
        }
      } catch (e) {
        console.log("[Onboarding] Permission check error:", e);
      }

      setHasBlockedPermissions(blocked);
      console.log("[Onboarding] Opening dialog, blocked:", blocked);
      setIsOpen(true);
    };

    const timer = setTimeout(checkPermissions, 1000);

    return () => clearTimeout(timer);
  }, []);

  const enableAllFeatures = async () => {
    setIsEnabling(true);
    const newPermissions: PermissionState = { ...permissions };

    // Request microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      newPermissions.microphone = "granted";
    } catch {
      newPermissions.microphone = "denied";
    }
    setPermissions({ ...newPermissions });

    // Request notifications
    if ("Notification" in window) {
      try {
        const result = await Notification.requestPermission();
        newPermissions.notifications = result === "granted" ? "granted" : "denied";
      } catch {
        newPermissions.notifications = "denied";
      }
    } else {
      newPermissions.notifications = "denied";
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

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setIsOpen(false);
  };

  const getIcon = (status: PermissionStatus) => {
    if (status === "granted") {
      return <Check className="h-5 w-5 text-green-500" />;
    }
    if (status === "denied") {
      return <div className="h-5 w-5 rounded-full bg-gray-300" />;
    }
    return <div className="h-5 w-5 rounded-full bg-gray-200 animate-pulse" />;
  };

  const allGranted =
    permissions.microphone === "granted" &&
    permissions.notifications === "granted" &&
    permissions.location === "granted";

  const someGranted =
    permissions.microphone === "granted" ||
    permissions.notifications === "granted" ||
    permissions.location === "granted";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className={cn(
            "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full",
            hasBlockedPermissions && !isDone
              ? "bg-gradient-to-r from-orange-500 to-red-500"
              : "bg-gradient-to-r from-purple-500 to-blue-500"
          )}>
            {isDone ? (
              <Check className="h-10 w-10 text-white" />
            ) : hasBlockedPermissions ? (
              <AlertCircle className="h-10 w-10 text-white" />
            ) : (
              <Sparkles className="h-10 w-10 text-white" />
            )}
          </div>
          <DialogTitle className="text-2xl">
            {isDone ? t.allEnabled : hasBlockedPermissions ? t.blockedTitle : t.welcomeTitle}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isDone && !allGranted ? t.someBlocked : hasBlockedPermissions ? t.blockedDesc : t.welcomeDesc}
          </DialogDescription>
        </DialogHeader>

        {/* Features List */}
        <div className="py-4">
          {!isDone && (
            <p className="text-sm text-gray-500 mb-3 text-center">{t.permissionsList}</p>
          )}

          <div className="space-y-3">
            {/* Microphone */}
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all",
              permissions.microphone === "granted" ? "bg-green-50" : "bg-gray-50"
            )}>
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                permissions.microphone === "granted" ? "bg-green-100" : "bg-purple-100"
              )}>
                <Mic className={cn(
                  "h-5 w-5",
                  permissions.microphone === "granted" ? "text-green-600" : "text-purple-600"
                )} />
              </div>
              <p className="flex-1 text-sm">{t.micFeature}</p>
              {isDone && getIcon(permissions.microphone)}
            </div>

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

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {!isDone ? (
            <>
              {hasBlockedPermissions ? (
                <>
                  <Button
                    onClick={() => setShowResetGuide(true)}
                    className="w-full h-12 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    {t.fixBlocked}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={enableAllFeatures}
                    disabled={isEnabling}
                    className="w-full"
                  >
                    {isEnabling ? t.enablingFeatures : t.tryAgain}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={enableAllFeatures}
                  disabled={isEnabling}
                  className="w-full h-12 text-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  {isEnabling ? t.enablingFeatures : t.enableAll}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isEnabling}
                className="w-full text-gray-500"
              >
                {t.skipForNow}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleComplete}
              className="w-full h-12 text-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {t.continueBtn}
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Visual Reset Guide Overlay */}
      {showResetGuide && (
        <PermissionResetGuide
          locale={locale}
          onClose={() => setShowResetGuide(false)}
        />
      )}
    </Dialog>
  );
}
