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
  try {
    // Try ipwho.is first (free, no API key needed)
    const response = await fetch("https://ipwho.is/", {
      signal: AbortSignal.timeout(3000)
    });
    if (response.ok) {
      const data = await response.json();
      if (data.country_code) {
        return data.country_code;
      }
    }
  } catch {
    // Fallback to ipinfo.io
    try {
      const response = await fetch("https://ipinfo.io/json", {
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.country) {
          return data.country;
        }
      }
    } catch {
      // IP detection failed
    }
  }
  return null;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyConfig>(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function detectCurrency() {
      // Check if user manually set currency (don't override)
      const manuallySet = localStorage.getItem(STORAGE_KEY + "-manual");
      if (manuallySet === "true") {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            setCurrencyState(JSON.parse(stored));
            setIsLoading(false);
            return;
          } catch {
            // Continue with detection
          }
        }
      }

      // Detect country from IP
      const country = await detectCountryFromIP();
      if (country) {
        const detected = getCurrencyForCountry(country);
        setCurrencyState(detected);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(detected));
        localStorage.setItem(COUNTRY_KEY, country);
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
