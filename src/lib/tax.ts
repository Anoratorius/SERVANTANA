/**
 * Tax Calculation Module
 * Handles VAT rates by country and tax calculations
 */

// EU VAT rates (standard rates as of 2024)
// Source: https://ec.europa.eu/taxation_customs/vat-rates_en
export const VAT_RATES: Record<string, number> = {
  // EU Member States
  AT: 20,   // Austria
  BE: 21,   // Belgium
  BG: 20,   // Bulgaria
  HR: 25,   // Croatia
  CY: 19,   // Cyprus
  CZ: 21,   // Czech Republic
  DK: 25,   // Denmark
  EE: 22,   // Estonia
  FI: 24,   // Finland
  FR: 20,   // France
  DE: 19,   // Germany
  GR: 24,   // Greece
  HU: 27,   // Hungary (highest in EU)
  IE: 23,   // Ireland
  IT: 22,   // Italy
  LV: 21,   // Latvia
  LT: 21,   // Lithuania
  LU: 17,   // Luxembourg (lowest in EU)
  MT: 18,   // Malta
  NL: 21,   // Netherlands
  PL: 23,   // Poland
  PT: 23,   // Portugal
  RO: 19,   // Romania
  SK: 20,   // Slovakia
  SI: 22,   // Slovenia
  ES: 21,   // Spain
  SE: 25,   // Sweden

  // Non-EU European countries
  CH: 8.1,  // Switzerland (not EU, but often used)
  GB: 20,   // United Kingdom (post-Brexit)
  NO: 25,   // Norway

  // Other major markets (for reference)
  US: 0,    // No federal VAT (state sales tax varies)
  CA: 5,    // Canada GST (provinces add PST/HST)
  AU: 10,   // Australia GST
  NZ: 15,   // New Zealand GST
  JP: 10,   // Japan consumption tax
};

// Reduced VAT rates for services (some countries apply reduced rates to certain services)
export const REDUCED_VAT_RATES: Record<string, number> = {
  DE: 7,    // Germany reduced rate
  FR: 10,   // France reduced rate
  IT: 10,   // Italy reduced rate
  ES: 10,   // Spain reduced rate
  NL: 9,    // Netherlands reduced rate
  BE: 6,    // Belgium reduced rate
  AT: 10,   // Austria reduced rate
  PT: 6,    // Portugal reduced rate
};

// Country names for display
export const COUNTRY_NAMES: Record<string, string> = {
  AT: "Austria",
  BE: "Belgium",
  BG: "Bulgaria",
  HR: "Croatia",
  CY: "Cyprus",
  CZ: "Czech Republic",
  DK: "Denmark",
  EE: "Estonia",
  FI: "Finland",
  FR: "France",
  DE: "Germany",
  GR: "Greece",
  HU: "Hungary",
  IE: "Ireland",
  IT: "Italy",
  LV: "Latvia",
  LT: "Lithuania",
  LU: "Luxembourg",
  MT: "Malta",
  NL: "Netherlands",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  SK: "Slovakia",
  SI: "Slovenia",
  ES: "Spain",
  SE: "Sweden",
  CH: "Switzerland",
  GB: "United Kingdom",
  NO: "Norway",
  US: "United States",
  CA: "Canada",
  AU: "Australia",
  NZ: "New Zealand",
  JP: "Japan",
};

export interface TaxBreakdown {
  // Input
  subtotal: number;
  countryCode: string;
  countryName: string;

  // Tax calculation
  taxRate: number;        // Percentage (e.g., 19 for 19%)
  taxAmount: number;      // Actual tax amount
  totalWithTax: number;   // Subtotal + tax

  // Metadata
  isEU: boolean;
  taxLabel: string;       // "VAT", "GST", etc.
}

/**
 * Check if a country is in the EU
 */
export function isEUCountry(countryCode: string): boolean {
  const euCountries = [
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  ];
  return euCountries.includes(countryCode.toUpperCase());
}

/**
 * Get VAT rate for a country
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @param useReducedRate - Whether to use reduced rate if available
 * @returns VAT rate as percentage (e.g., 19 for 19%)
 */
export function getVATRate(countryCode: string, useReducedRate: boolean = false): number {
  const code = countryCode.toUpperCase();

  if (useReducedRate && REDUCED_VAT_RATES[code] !== undefined) {
    return REDUCED_VAT_RATES[code];
  }

  return VAT_RATES[code] ?? 0;
}

/**
 * Get tax label for a country
 */
export function getTaxLabel(countryCode: string): string {
  const code = countryCode.toUpperCase();

  if (isEUCountry(code) || code === "GB" || code === "NO" || code === "CH") {
    return "VAT";
  }

  if (code === "AU" || code === "NZ" || code === "CA") {
    return "GST";
  }

  if (code === "JP") {
    return "Consumption Tax";
  }

  if (code === "US") {
    return "Sales Tax";
  }

  return "Tax";
}

/**
 * Calculate tax for an amount
 * @param subtotal - Amount before tax
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @param useReducedRate - Whether to use reduced rate
 * @returns Tax breakdown
 */
export function calculateTax(
  subtotal: number,
  countryCode: string,
  useReducedRate: boolean = false
): TaxBreakdown {
  const code = countryCode.toUpperCase();
  const taxRate = getVATRate(code, useReducedRate);
  const taxAmount = Math.round((subtotal * taxRate / 100) * 100) / 100;
  const totalWithTax = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    subtotal,
    countryCode: code,
    countryName: COUNTRY_NAMES[code] || code,
    taxRate,
    taxAmount,
    totalWithTax,
    isEU: isEUCountry(code),
    taxLabel: getTaxLabel(code),
  };
}

/**
 * Calculate tax from a total (reverse calculation)
 * Useful when you have the final price and need to extract the tax
 * @param totalWithTax - Amount including tax
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Tax breakdown
 */
export function calculateTaxFromTotal(
  totalWithTax: number,
  countryCode: string,
  useReducedRate: boolean = false
): TaxBreakdown {
  const code = countryCode.toUpperCase();
  const taxRate = getVATRate(code, useReducedRate);

  // Reverse calculation: subtotal = total / (1 + rate/100)
  const subtotal = Math.round((totalWithTax / (1 + taxRate / 100)) * 100) / 100;
  const taxAmount = Math.round((totalWithTax - subtotal) * 100) / 100;

  return {
    subtotal,
    countryCode: code,
    countryName: COUNTRY_NAMES[code] || code,
    taxRate,
    taxAmount,
    totalWithTax,
    isEU: isEUCountry(code),
    taxLabel: getTaxLabel(code),
  };
}

/**
 * Format tax rate for display
 */
export function formatTaxRate(rate: number): string {
  // Handle rates like 8.1% (Switzerland)
  if (rate % 1 !== 0) {
    return `${rate.toFixed(1)}%`;
  }
  return `${rate}%`;
}

/**
 * Get all supported countries with their VAT rates
 * Useful for dropdowns
 */
export function getAllTaxRates(): Array<{ code: string; name: string; rate: number }> {
  return Object.entries(VAT_RATES)
    .map(([code, rate]) => ({
      code,
      name: COUNTRY_NAMES[code] || code,
      rate,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get EU countries with their VAT rates
 */
export function getEUTaxRates(): Array<{ code: string; name: string; rate: number }> {
  return getAllTaxRates().filter(({ code }) => isEUCountry(code));
}
