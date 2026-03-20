"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share } from "lucide-react";

export function InstallPrompt() {
  const [showBanner, setShowBanner] = useState(true);
  const [showIOSModal, setShowIOSModal] = useState(false);

  const handleInstall = () => {
    setShowIOSModal(true);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSModal(false);
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
              <span className="text-left">1. Tap browser menu (3 dots)</span>
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
