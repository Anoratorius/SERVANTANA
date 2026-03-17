// Platform fee structure
// Fixed: €0.99 from customer + €0.99 from cleaner
// Percentage: 2.5% from customer + 2.5% from cleaner

export const PLATFORM_FEES = {
  // Fixed service fee in cents (to avoid floating point issues)
  FIXED_FEE_CENTS: 99, // €0.99
  // Percentage fee (as decimal)
  PERCENTAGE_FEE: 0.025, // 2.5%
} as const;

export interface FeeBreakdown {
  // Original booking price (cleaner's rate)
  bookingPrice: number;
  // Customer fees
  customerFixedFee: number;
  customerPercentageFee: number;
  customerTotal: number; // What customer pays
  // Cleaner fees
  cleanerFixedFee: number;
  cleanerPercentageFee: number;
  cleanerReceives: number; // What cleaner gets
  // Platform
  platformTotal: number; // Total platform revenue before Stripe
  // Currency
  currency: string;
}

/**
 * Calculate fee breakdown for a booking
 * @param bookingPrice - The cleaner's rate for the job (in currency units, e.g., euros)
 * @param currency - Currency code (e.g., "EUR", "USD")
 * @returns Detailed fee breakdown
 */
export function calculateFees(
  bookingPrice: number,
  currency: string = "EUR"
): FeeBreakdown {
  const fixedFee = PLATFORM_FEES.FIXED_FEE_CENTS / 100;
  const percentageFee = bookingPrice * PLATFORM_FEES.PERCENTAGE_FEE;

  // Round to 2 decimal places
  const roundedPercentageFee = Math.round(percentageFee * 100) / 100;

  const customerTotal = bookingPrice + fixedFee + roundedPercentageFee;
  const cleanerReceives = bookingPrice - fixedFee - roundedPercentageFee;
  const platformTotal = (fixedFee + roundedPercentageFee) * 2;

  return {
    bookingPrice,
    customerFixedFee: fixedFee,
    customerPercentageFee: roundedPercentageFee,
    customerTotal: Math.round(customerTotal * 100) / 100,
    cleanerFixedFee: fixedFee,
    cleanerPercentageFee: roundedPercentageFee,
    cleanerReceives: Math.round(cleanerReceives * 100) / 100,
    platformTotal: Math.round(platformTotal * 100) / 100,
    currency,
  };
}

/**
 * Convert amount to Stripe's smallest currency unit (cents)
 * @param amount - Amount in currency units (e.g., 50.00 EUR)
 * @param currency - Currency code
 * @returns Amount in smallest unit (e.g., 5000 for 50 EUR)
 */
export function toStripeAmount(amount: number, currency: string): number {
  // Most currencies use 2 decimal places
  // Some currencies like JPY use 0 decimal places
  const zeroDecimalCurrencies = ["JPY", "KRW", "VND"];

  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
}

/**
 * Convert Stripe amount back to currency units
 * @param stripeAmount - Amount in smallest unit (e.g., 5000)
 * @param currency - Currency code
 * @returns Amount in currency units (e.g., 50.00)
 */
export function fromStripeAmount(stripeAmount: number, currency: string): number {
  const zeroDecimalCurrencies = ["JPY", "KRW", "VND"];

  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return stripeAmount;
  }

  return stripeAmount / 100;
}

/**
 * Format price with currency symbol
 * @param amount - Amount in currency units
 * @param currency - Currency code
 * @param locale - Locale for formatting (optional)
 * @returns Formatted price string
 */
export function formatPrice(
  amount: number,
  currency: string,
  locale?: string
): string {
  return new Intl.NumberFormat(locale || "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}
