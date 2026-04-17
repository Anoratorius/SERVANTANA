import { describe, it, expect } from "vitest";
import {
  getCurrencyForCountry,
  getCurrencyFromLocale,
  formatPrice,
  formatPricePerHour,
  getSupportedCurrencies,
  DEFAULT_CURRENCY,
  COUNTRY_CURRENCIES,
} from "./currency";

describe("getCurrencyForCountry", () => {
  it("returns EUR for Germany", () => {
    const result = getCurrencyForCountry("DE");
    expect(result.code).toBe("EUR");
    expect(result.symbol).toBe("€");
  });

  it("returns USD for United States", () => {
    const result = getCurrencyForCountry("US");
    expect(result.code).toBe("USD");
    expect(result.symbol).toBe("$");
  });

  it("returns GBP for United Kingdom", () => {
    const result = getCurrencyForCountry("GB");
    expect(result.code).toBe("GBP");
    expect(result.symbol).toBe("£");
  });

  it("handles lowercase country codes", () => {
    const result = getCurrencyForCountry("de");
    expect(result.code).toBe("EUR");
  });

  it("returns default currency for unknown country", () => {
    const result = getCurrencyForCountry("XX");
    expect(result).toEqual(DEFAULT_CURRENCY);
  });
});

describe("getCurrencyFromLocale", () => {
  it("extracts country from locale with region", () => {
    const result = getCurrencyFromLocale("en-US");
    expect(result.code).toBe("USD");
  });

  it("extracts country from German locale", () => {
    const result = getCurrencyFromLocale("de-DE");
    expect(result.code).toBe("EUR");
  });

  it("handles locale without region", () => {
    const result = getCurrencyFromLocale("de");
    expect(result).toEqual(DEFAULT_CURRENCY);
  });

  it("handles Japanese locale", () => {
    const result = getCurrencyFromLocale("ja-JP");
    expect(result.code).toBe("JPY");
    expect(result.symbol).toBe("¥");
  });
});

describe("formatPrice", () => {
  it("formats EUR correctly", () => {
    const result = formatPrice(50, { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" });
    expect(result).toContain("50");
    expect(result).toContain("€");
  });

  it("formats USD correctly", () => {
    const result = formatPrice(50, { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" });
    expect(result).toContain("$");
    expect(result).toContain("50");
  });

  it("formats JPY without decimal places", () => {
    const result = formatPrice(5000, { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" });
    // Unicode yen symbol can be either ¥ (U+00A5) or ￥ (U+FFE5)
    expect(result.includes("¥") || result.includes("￥")).toBe(true);
    expect(result).toContain("5,000");
  });

  it("uses default currency when none provided", () => {
    const result = formatPrice(100);
    expect(result).toContain("€");
  });
});

describe("formatPricePerHour", () => {
  it("adds /hr suffix in English", () => {
    const result = formatPricePerHour(25, DEFAULT_CURRENCY, "en");
    expect(result).toContain("/hr");
  });

  it("adds /Std. suffix in German", () => {
    const result = formatPricePerHour(25, DEFAULT_CURRENCY, "de");
    expect(result).toContain("/Std.");
  });
});

describe("getSupportedCurrencies", () => {
  it("returns an array of currencies", () => {
    const currencies = getSupportedCurrencies();
    expect(Array.isArray(currencies)).toBe(true);
    expect(currencies.length).toBeGreaterThan(0);
  });

  it("returns unique currencies only", () => {
    const currencies = getSupportedCurrencies();
    const codes = currencies.map((c) => c.code);
    const uniqueCodes = [...new Set(codes)];
    expect(codes.length).toBe(uniqueCodes.length);
  });

  it("includes common currencies", () => {
    const currencies = getSupportedCurrencies();
    const codes = currencies.map((c) => c.code);
    expect(codes).toContain("EUR");
    expect(codes).toContain("USD");
    expect(codes).toContain("GBP");
  });

  it("is sorted alphabetically by name", () => {
    const currencies = getSupportedCurrencies();
    const names = currencies.map((c) => c.name);
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sortedNames);
  });
});

describe("COUNTRY_CURRENCIES", () => {
  it("has all Eurozone countries mapped to EUR", () => {
    const eurozoneCountries = ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "IE", "FI"];
    eurozoneCountries.forEach((country) => {
      expect(COUNTRY_CURRENCIES[country].code).toBe("EUR");
    });
  });

  it("has proper locale formats", () => {
    Object.entries(COUNTRY_CURRENCIES).forEach(([code, config]) => {
      expect(config.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    });
  });
});
