"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ArrowUp, RefreshCw } from "lucide-react";

const translations = {
  en: {
    title: "Enable Features",
    step1: "Tap the lock icon above",
    step2: "Allow permissions",
    step3: "Refresh the page",
    tapHere: "Tap here",
    gotIt: "Got it",
    refresh: "Refresh Now",
  },
  de: {
    title: "Funktionen aktivieren",
    step1: "Tippen Sie oben auf das Schloss",
    step2: "Berechtigungen erlauben",
    step3: "Seite aktualisieren",
    tapHere: "Hier tippen",
    gotIt: "Verstanden",
    refresh: "Jetzt aktualisieren",
  },
};

interface PermissionResetGuideProps {
  locale: string;
  onClose: () => void;
}

export function PermissionResetGuide({ locale, onClose }: PermissionResetGuideProps) {
  const t = translations[locale as keyof typeof translations] || translations.en;
  const [step, setStep] = useState(1);

  useEffect(() => {
    // Auto-advance steps for animation effect
    if (step < 3) {
      const timer = setTimeout(() => setStep(step + 1), 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col">
      {/* Top section - Arrow pointing to address bar */}
      <div className="flex-shrink-0 pt-2 px-4 flex flex-col items-center">
        {/* Animated arrow pointing up to lock icon */}
        <div className="animate-bounce">
          <ArrowUp className="h-12 w-12 text-white" strokeWidth={3} />
        </div>

        {/* Pulsing circle indicator */}
        <div className="relative -mt-2">
          <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75" style={{ width: 60, height: 60 }} />
          <div className="relative bg-green-500 text-white rounded-full w-[60px] h-[60px] flex items-center justify-center text-sm font-bold">
            {t.tapHere}
          </div>
        </div>
      </div>

      {/* Middle section - Steps */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <h2 className="text-xl font-bold text-center mb-6">{t.title}</h2>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${step >= 1 ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50'}`}>
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${step >= 1 ? 'bg-green-500' : 'bg-gray-300'}`}>
                1
              </div>
              <div className="flex-1">
                <p className={`font-medium ${step >= 1 ? 'text-green-700' : 'text-gray-500'}`}>
                  {t.step1}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl">🔒</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-sm text-gray-500">Site settings</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${step >= 2 ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50'}`}>
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${step >= 2 ? 'bg-green-500' : 'bg-gray-300'}`}>
                2
              </div>
              <div className="flex-1">
                <p className={`font-medium ${step >= 2 ? 'text-green-700' : 'text-gray-500'}`}>
                  {t.step2}
                </p>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <span>🎤 Microphone</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-600 font-medium">Allow ✓</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${step >= 3 ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50'}`}>
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${step >= 3 ? 'bg-green-500' : 'bg-gray-300'}`}>
                3
              </div>
              <div className="flex-1">
                <p className={`font-medium ${step >= 3 ? 'text-green-700' : 'text-gray-500'}`}>
                  {t.step3}
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {t.gotIt}
            </Button>
            <Button
              onClick={handleRefresh}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t.refresh}
            </Button>
          </div>
        </div>
      </div>

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:bg-white/20"
      >
        <X className="h-6 w-6" />
      </Button>
    </div>
  );
}
