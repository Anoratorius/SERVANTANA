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
import { Mic, Bell, MapPin, Check, X, Sparkles, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STORAGE_KEY = "servantana-onboarding-complete";

type PermissionStatus = "prompt" | "granted" | "denied" | "unsupported";

interface PermissionState {
  microphone: PermissionStatus;
  notifications: PermissionStatus;
  location: PermissionStatus;
}

const translations = {
  en: {
    welcomeTitle: "Welcome to Servantana!",
    welcomeDesc: "Let's set up a few things to give you the best experience.",
    micTitle: "Voice Search",
    micDesc: "Speak to find cleaners faster",
    notifTitle: "Notifications",
    notifDesc: "Get updates on your bookings",
    locationTitle: "Location",
    locationDesc: "Find cleaners near you",
    allow: "Allow",
    skip: "Skip",
    done: "Get Started",
    granted: "Enabled",
    denied: "Blocked",
    later: "Maybe Later",
    reset: "Reset",
    resetInstructions: "To enable: tap the lock icon (🔒) in your browser's address bar, then allow the permission.",
    tryAgain: "Try Again",
  },
  de: {
    welcomeTitle: "Willkommen bei Servantana!",
    welcomeDesc: "Lassen Sie uns einige Dinge einrichten, um Ihnen das beste Erlebnis zu bieten.",
    micTitle: "Sprachsuche",
    micDesc: "Sprechen Sie, um schneller Reiniger zu finden",
    notifTitle: "Benachrichtigungen",
    notifDesc: "Erhalten Sie Updates zu Ihren Buchungen",
    locationTitle: "Standort",
    locationDesc: "Finden Sie Reiniger in Ihrer Nähe",
    allow: "Erlauben",
    skip: "Überspringen",
    done: "Loslegen",
    granted: "Aktiviert",
    denied: "Blockiert",
    later: "Vielleicht später",
    reset: "Zurücksetzen",
    resetInstructions: "Zum Aktivieren: Tippen Sie auf das Schloss-Symbol (🔒) in der Adressleiste und erlauben Sie die Berechtigung.",
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
    microphone: "prompt",
    notifications: "prompt",
    location: "prompt",
  });
  const [isLoading, setIsLoading] = useState<string | null>(null);

  useEffect(() => {
    // Check if already completed onboarding on this device
    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed) return;

    // Check if running as installed PWA - still show onboarding for permissions
    // but we won't show install prompt

    // Small delay to let page load first
    const timer = setTimeout(() => {
      checkCurrentPermissions();
      setIsOpen(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const checkCurrentPermissions = async () => {
    const newState: PermissionState = {
      microphone: "prompt",
      notifications: "prompt",
      location: "prompt",
    };

    // Check microphone
    if (navigator.permissions) {
      try {
        const micPermission = await navigator.permissions.query({ name: "microphone" as PermissionName });
        newState.microphone = micPermission.state as PermissionStatus;
      } catch {
        // Microphone permission query not supported
      }
    }

    // Check notifications
    if ("Notification" in window) {
      newState.notifications = Notification.permission as PermissionStatus;
    } else {
      newState.notifications = "unsupported";
    }

    // Check location
    if (navigator.permissions) {
      try {
        const geoPermission = await navigator.permissions.query({ name: "geolocation" });
        newState.location = geoPermission.state as PermissionStatus;
      } catch {
        // Geolocation permission query not supported
      }
    }

    setPermissions(newState);
  };

  const requestMicrophone = async () => {
    setIsLoading("microphone");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, microphone: "granted" }));
    } catch {
      setPermissions(prev => ({ ...prev, microphone: "denied" }));
    }
    setIsLoading(null);
  };

  const requestNotifications = async () => {
    setIsLoading("notifications");
    try {
      const result = await Notification.requestPermission();
      setPermissions(prev => ({ ...prev, notifications: result as PermissionStatus }));
    } catch {
      setPermissions(prev => ({ ...prev, notifications: "denied" }));
    }
    setIsLoading(null);
  };

  const requestLocation = async () => {
    setIsLoading("location");
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      setPermissions(prev => ({ ...prev, location: "granted" }));
    } catch {
      setPermissions(prev => ({ ...prev, location: "denied" }));
    }
    setIsLoading(null);
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setIsOpen(false);
  };

  const handleSkipAll = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setIsOpen(false);
  };

  const getStatusIcon = (status: PermissionStatus) => {
    if (status === "granted") {
      return <Check className="h-5 w-5 text-green-500" />;
    }
    if (status === "denied") {
      return <X className="h-5 w-5 text-red-500" />;
    }
    return null;
  };

  const showResetInstructions = () => {
    toast.info(t.resetInstructions, { duration: 8000 });
  };

  const getButtonState = (status: PermissionStatus, type: string) => {
    if (isLoading === type) {
      return { disabled: true, text: "...", action: () => {} };
    }
    if (status === "granted") {
      return { disabled: true, text: t.granted, action: () => {} };
    }
    if (status === "denied") {
      return { disabled: false, text: t.reset, action: showResetInstructions };
    }
    if (status === "unsupported") {
      return { disabled: true, text: "N/A", action: () => {} };
    }
    return { disabled: false, text: t.allow, action: () => {} };
  };

  const allHandled =
    permissions.microphone !== "prompt" &&
    permissions.notifications !== "prompt" &&
    permissions.location !== "prompt";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkipAll()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl">{t.welcomeTitle}</DialogTitle>
          <DialogDescription className="text-base">
            {t.welcomeDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Microphone Permission */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <Mic className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">{t.micTitle}</p>
                <p className="text-sm text-gray-500">{t.micDesc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(permissions.microphone)}
              <Button
                size="sm"
                onClick={permissions.microphone === "denied" ? showResetInstructions : requestMicrophone}
                disabled={getButtonState(permissions.microphone, "microphone").disabled}
                className={cn(
                  "min-w-[80px]",
                  permissions.microphone === "granted" && "bg-green-500 hover:bg-green-500",
                  permissions.microphone === "denied" && "bg-orange-500 hover:bg-orange-600"
                )}
              >
                {permissions.microphone === "denied" && <Settings className="h-3 w-3 mr-1" />}
                {getButtonState(permissions.microphone, "microphone").text}
              </Button>
            </div>
          </div>

          {/* Notifications Permission */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">{t.notifTitle}</p>
                <p className="text-sm text-gray-500">{t.notifDesc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(permissions.notifications)}
              <Button
                size="sm"
                onClick={permissions.notifications === "denied" ? showResetInstructions : requestNotifications}
                disabled={getButtonState(permissions.notifications, "notifications").disabled}
                className={cn(
                  "min-w-[80px]",
                  permissions.notifications === "granted" && "bg-green-500 hover:bg-green-500",
                  permissions.notifications === "denied" && "bg-orange-500 hover:bg-orange-600"
                )}
              >
                {permissions.notifications === "denied" && <Settings className="h-3 w-3 mr-1" />}
                {getButtonState(permissions.notifications, "notifications").text}
              </Button>
            </div>
          </div>

          {/* Location Permission */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">{t.locationTitle}</p>
                <p className="text-sm text-gray-500">{t.locationDesc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(permissions.location)}
              <Button
                size="sm"
                onClick={permissions.location === "denied" ? showResetInstructions : requestLocation}
                disabled={getButtonState(permissions.location, "location").disabled}
                className={cn(
                  "min-w-[80px]",
                  permissions.location === "granted" && "bg-green-500 hover:bg-green-500",
                  permissions.location === "denied" && "bg-orange-500 hover:bg-orange-600"
                )}
              >
                {permissions.location === "denied" && <Settings className="h-3 w-3 mr-1" />}
                {getButtonState(permissions.location, "location").text}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSkipAll}
            className="flex-1"
          >
            {t.later}
          </Button>
          <Button
            onClick={handleComplete}
            className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            {allHandled ? t.done : t.skip}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
