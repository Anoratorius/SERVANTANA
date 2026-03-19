// Currency configuration based on country/location

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

// Map of country codes to currency configurations
export const COUNTRY_CURRENCIES: Record<string, CurrencyConfig> = {
  // Eurozone
  DE: { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  FR: { code: "EUR", symbol: "€", name: "Euro", locale: "fr-FR" },
  IT: { code: "EUR", symbol: "€", name: "Euro", locale: "it-IT" },
  ES: { code: "EUR", symbol: "€", name: "Euro", locale: "es-ES" },
  NL: { code: "EUR", symbol: "€", name: "Euro", locale: "nl-NL" },
  BE: { code: "EUR", symbol: "€", name: "Euro", locale: "nl-BE" },
  AT: { code: "EUR", symbol: "€", name: "Euro", locale: "de-AT" },
  PT: { code: "EUR", symbol: "€", name: "Euro", locale: "pt-PT" },
  IE: { code: "EUR", symbol: "€", name: "Euro", locale: "en-IE" },
  FI: { code: "EUR", symbol: "€", name: "Euro", locale: "fi-FI" },
  GR: { code: "EUR", symbol: "€", name: "Euro", locale: "el-GR" },
  LU: { code: "EUR", symbol: "€", name: "Euro", locale: "fr-LU" },

  // Non-Euro Europe
  GB: { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  CH: { code: "CHF", symbol: "CHF", name: "Swiss Franc", locale: "de-CH" },
  LI: { code: "CHF", symbol: "CHF", name: "Swiss Franc", locale: "de-LI" },
  PL: { code: "PLN", symbol: "zł", name: "Polish Zloty", locale: "pl-PL" },
  CZ: { code: "CZK", symbol: "Kč", name: "Czech Koruna", locale: "cs-CZ" },
  SE: { code: "SEK", symbol: "kr", name: "Swedish Krona", locale: "sv-SE" },
  NO: { code: "NOK", symbol: "kr", name: "Norwegian Krone", locale: "nb-NO" },
  DK: { code: "DKK", symbol: "kr", name: "Danish Krone", locale: "da-DK" },
  HU: { code: "HUF", symbol: "Ft", name: "Hungarian Forint", locale: "hu-HU" },
  RO: { code: "RON", symbol: "lei", name: "Romanian Leu", locale: "ro-RO" },

  // Americas
  US: { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  CA: { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  MX: { code: "MXN", symbol: "$", name: "Mexican Peso", locale: "es-MX" },
  BR: { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR" },

  // Asia-Pacific
  AU: { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  NZ: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", locale: "en-NZ" },
  JP: { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  SG: { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
  HK: { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", locale: "zh-HK" },
};

// Default currency (fallback)
export const DEFAULT_CURRENCY: CurrencyConfig = {
  code: "EUR",
  symbol: "€",
  name: "Euro",
  locale: "de-DE",
};

/**
 * Get currency configuration for a country
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Currency configuration
 */
export function getCurrencyForCountry(countryCode: string): CurrencyConfig {
  return COUNTRY_CURRENCIES[countryCode.toUpperCase()] || DEFAULT_CURRENCY;
}

/**
 * Get currency from Accept-Language or other locale hints
 * @param locale - Locale string (e.g., "de-DE", "en-US")
 * @returns Currency configuration
 */
export function getCurrencyFromLocale(locale: string): CurrencyConfig {
  // Extract country code from locale (e.g., "de-DE" -> "DE")
  const parts = locale.split("-");
  const countryCode = parts[1] || parts[0];

  return getCurrencyForCountry(countryCode.toUpperCase());
}

/**
 * Detect currency from request headers
 * @param headers - Request headers object
 * @returns Currency configuration
 */
export function detectCurrencyFromHeaders(
  headers: Headers
): CurrencyConfig {
  // Try CF-IPCountry header (Cloudflare)
  const cfCountry = headers.get("cf-ipcountry");
  if (cfCountry) {
    return getCurrencyForCountry(cfCountry);
  }

  // Try X-Vercel-IP-Country header (Vercel)
  const vercelCountry = headers.get("x-vercel-ip-country");
  if (vercelCountry) {
    return getCurrencyForCountry(vercelCountry);
  }

  // Fallback to Accept-Language
  const acceptLanguage = headers.get("accept-language");
  if (acceptLanguage) {
    // Parse first locale from Accept-Language
    const firstLocale = acceptLanguage.split(",")[0].split(";")[0].trim();
    return getCurrencyFromLocale(firstLocale);
  }

  return DEFAULT_CURRENCY;
}

/**
 * Get all supported currencies
 * @returns Array of unique currency configurations
 */
export function getSupportedCurrencies(): CurrencyConfig[] {
  const seen = new Set<string>();
  const currencies: CurrencyConfig[] = [];

  for (const config of Object.values(COUNTRY_CURRENCIES)) {
    if (!seen.has(config.code)) {
      seen.add(config.code);
      currencies.push(config);
    }
  }

  return currencies.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Format a price with the correct currency symbol and locale
 * @param amount - The price amount
 * @param currencyConfig - Currency configuration
 * @returns Formatted price string
 */
export function formatPrice(
  amount: number,
  currencyConfig: CurrencyConfig = DEFAULT_CURRENCY
): string {
  return new Intl.NumberFormat(currencyConfig.locale, {
    style: "currency",
    currency: currencyConfig.code,
    minimumFractionDigits: currencyConfig.code === "JPY" || currencyConfig.code === "HUF" ? 0 : 2,
    maximumFractionDigits: currencyConfig.code === "JPY" || currencyConfig.code === "HUF" ? 0 : 2,
  }).format(amount);
}

/**
 * Format price per hour
 * @param amount - Hourly rate
 * @param currencyConfig - Currency configuration
 * @param locale - App locale (en/de)
 * @returns Formatted price per hour string
 */
export function formatPricePerHour(
  amount: number,
  currencyConfig: CurrencyConfig = DEFAULT_CURRENCY,
  locale: string = "en"
): string {
  const price = formatPrice(amount, currencyConfig);
  return locale === "de" ? `${price}/Std.` : `${price}/hr`;
}

/**
 * Detect user's country from browser (client-side only)
 * @returns Country code or null
 */
export function detectUserCountry(): string | null {
  if (typeof window === "undefined") return null;

  // Try browser language
  const locale = navigator.language || navigator.languages?.[0];
  if (locale) {
    const parts = locale.split("-");
    if (parts.length > 1) {
      return parts[1].toUpperCase();
    }
  }

  // Try timezone-based detection
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timezoneCountryMap: Record<string, string> = {
    "Europe/Berlin": "DE",
    "Europe/Zurich": "CH",
    "Europe/Vienna": "AT",
    "Europe/Paris": "FR",
    "Europe/London": "GB",
    "Europe/Amsterdam": "NL",
    "Europe/Brussels": "BE",
    "Europe/Rome": "IT",
    "Europe/Madrid": "ES",
    "Europe/Lisbon": "PT",
    "Europe/Warsaw": "PL",
    "Europe/Prague": "CZ",
    "Europe/Stockholm": "SE",
    "Europe/Oslo": "NO",
    "Europe/Copenhagen": "DK",
    "America/New_York": "US",
    "America/Los_Angeles": "US",
    "America/Chicago": "US",
    "America/Toronto": "CA",
    "America/Mexico_City": "MX",
    "America/Sao_Paulo": "BR",
    "Asia/Tokyo": "JP",
    "Asia/Shanghai": "CN",
    "Asia/Singapore": "SG",
    "Asia/Hong_Kong": "HK",
    "Australia/Sydney": "AU",
    "Pacific/Auckland": "NZ",
  };

  if (timezone && timezoneCountryMap[timezone]) {
    return timezoneCountryMap[timezone];
  }

  return null;
}

/**
 * Get user's currency based on browser detection (client-side)
 * @returns Currency configuration
 */
export function detectUserCurrency(): CurrencyConfig {
  const country = detectUserCountry();
  if (country) {
    return getCurrencyForCountry(country);
  }
  return DEFAULT_CURRENCY;
}
