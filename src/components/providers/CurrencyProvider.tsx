"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  CurrencyConfig,
  DEFAULT_CURRENCY,
  detectUserCurrency,
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

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyConfig>(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCurrencyState(parsed);
        setIsLoading(false);
        return;
      } catch {
        // Invalid stored value, continue with detection
      }
    }

    // Auto-detect currency
    const detected = detectUserCurrency();
    setCurrencyState(detected);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(detected));
    setIsLoading(false);
  }, []);

  const setCurrency = (newCurrency: CurrencyConfig) => {
    setCurrencyState(newCurrency);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCurrency));
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
