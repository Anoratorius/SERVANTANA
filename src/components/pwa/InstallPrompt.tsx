"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function checkIfInstalled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window.navigator as any).standalone === true) return true;
  if (document.referrer.includes("android-app://")) return true;
  if (localStorage.getItem("pwa-installed") === "true") return true;
  return false;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check for reset parameter first
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("reset") === "1") {
      localStorage.removeItem("pwa-install-dismissed");
      localStorage.removeItem("pwa-installed");
      urlParams.delete("reset");
      const newUrl = window.location.pathname + (urlParams.toString() ? "?" + urlParams.toString() : "");
      window.history.replaceState({}, "", newUrl);
    }

    setIsInstalled(checkIfInstalled());

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        localStorage.setItem("pwa-installed", "true");
      }
    };
    mediaQuery.addEventListener("change", handleChange);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem("pwa-installed", "true");
      setShowPrompt(false);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    // Show prompt immediately for testing, skip all checks
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Show immediately
    setShowPrompt(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    }
  }, []);

  const handleInstall = async () => {
    if (isIOS()) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      // Try to show native install prompt anyway
      setShowIOSInstructions(true);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
      localStorage.setItem("pwa-installed", "true");
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // DEBUG: Always render something visible
  if (!showPrompt) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] p-4 bg-red-600 text-white text-center font-bold">
        DEBUG: showPrompt is FALSE
      </div>
    );
  }

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
        <div className="bg-white rounded-t-2xl w-full max-w-md p-5 text-center animate-in slide-in-from-bottom">
          <h3 className="text-lg font-bold mb-3">Install Servantana</h3>
          <div className="space-y-3 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Share className="h-6 w-6 text-blue-500" />
              <span>1. Tap the <strong>Share</strong> button in your browser</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Download className="h-6 w-6 text-green-500" />
              <span>2. Select <strong>"Add to Home Screen"</strong></span>
            </div>
          </div>
          <Button onClick={handleDismiss} className="w-full">
            Got it
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-lg">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Download className="h-6 w-6 flex-shrink-0" />
          <div>
            <p className="font-bold text-lg" style={{ fontFamily: 'var(--font-logo)' }}>
              Install Servantana
            </p>
            <p className="text-sm text-white/90">
              Add to your home screen for the best experience
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
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
