"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show banner after 2 seconds
    const timer = setTimeout(() => setShowBanner(true), 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS || !deferredPrompt) {
      setShowIOSModal(true);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSModal(false);
    localStorage.setItem("pwa-dismissed", Date.now().toString());
  };

  if (!showBanner) return null;

  if (showIOSModal) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm p-5 text-center">
          <h3 className="text-lg font-bold mb-3">Install Servantana</h3>
          <div className="space-y-3 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Share className="h-6 w-6 text-blue-500 flex-shrink-0" />
              <span className="text-left">1. Tap the <strong>Share</strong> button</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Download className="h-6 w-6 text-green-500 flex-shrink-0" />
              <span className="text-left">2. Select <strong>Add to Home Screen</strong></span>
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
