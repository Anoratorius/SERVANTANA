"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Also show banner after delay even without the event
    const timer = setTimeout(() => {
      if (!isInstalled) setShowBanner(true);
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, [isInstalled]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Native install available
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback - tell user to use browser menu
      alert("To install: tap the browser menu (3 dots) and select 'Add to Home Screen'");
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-lg">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Download className="h-6 w-6 flex-shrink-0" />
          <div>
            <p className="font-bold text-lg">Install Servantana</p>
            <p className="text-sm text-white/90">Add to home screen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleInstall}
            variant="secondary"
            className="bg-white text-blue-600 hover:bg-white/90 font-bold"
          >
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
