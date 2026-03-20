"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  CurrencyConfig,
  DEFAULT_CURRENCY,
  getCurrencyForCountry,
  formatPrice as formatPriceUtil,
  formatPricePerHour as formatPricePerHourUtil,
} from "@/lib/currency";

interface CurrencyContextType {
  currency: CurrencyConfig;
  setCurrency: (currency: CurrencyConfig) => void;
  setCountry: (countryCode: string) => void;
  formatPrice: (amount: number) => string;
  formatPricePerHour: (amount: number, locale?: string) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = "servantana-currency";
const COUNTRY_KEY = "servantana-country";

async function detectCountryFromIP(): Promise<string | null> {
  // Use AbortController for better browser support (AbortSignal.timeout not supported in older browsers)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    // Try ipwho.is first (free, no API key needed)
    const response = await fetch("https://ipwho.is/", {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log("[Currency] ipwho.is detected country:", data.country_code);
      if (data.country_code) {
        return data.country_code;
      }
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.log("[Currency] ipwho.is failed:", error);
  }

  // Fallback to ipinfo.io (runs if first attempt fails)
  const controller2 = new AbortController();
  const timeoutId2 = setTimeout(() => controller2.abort(), 3000);

  try {
    const response = await fetch("https://ipinfo.io/json", {
      signal: controller2.signal
    });
    clearTimeout(timeoutId2);

    if (response.ok) {
      const data = await response.json();
      console.log("[Currency] ipinfo.io fallback detected:", data.country);
      if (data.country) {
        return data.country;
      }
    }
  } catch (error) {
    clearTimeout(timeoutId2);
    console.log("[Currency] ipinfo.io fallback failed:", error);
  }

  console.log("[Currency] All detection methods failed, returning null");
  return null;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyConfig>(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function detectCurrency() {
      console.log("[Currency] Starting IP-based currency detection...");
      // Always detect from IP (fresh detection every session)
      const country = await detectCountryFromIP();
      console.log("[Currency] Detection result - country:", country);
      if (country) {
        const detected = getCurrencyForCountry(country);
        console.log("[Currency] Mapped to currency:", detected.code, detected.symbol);
        setCurrencyState(detected);
        localStorage.setItem(COUNTRY_KEY, country);
      } else {
        console.log("[Currency] Using default currency:", DEFAULT_CURRENCY.code);
      }
      setIsLoading(false);
    }

    detectCurrency();
  }, []);

  const setCurrency = (newCurrency: CurrencyConfig) => {
    setCurrencyState(newCurrency);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCurrency));
    localStorage.setItem(STORAGE_KEY + "-manual", "true");
  };

  const setCountry = (countryCode: string) => {
    const newCurrency = getCurrencyForCountry(countryCode);
    setCurrency(newCurrency);
  };

  const formatPrice = (amount: number) => {
    return formatPriceUtil(amount, currency);
  };

  const formatPricePerHour = (amount: number, locale: string = "en") => {
    return formatPricePerHourUtil(amount, currency, locale);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        setCountry,
        formatPrice,
        formatPricePerHour,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
