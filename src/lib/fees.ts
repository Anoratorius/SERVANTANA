// Platform fee structure
// Default: 15% total platform fee (split between customer and worker)
// Pro subscribers: 10% total platform fee
// Business subscribers: 8% total platform fee

import { calculateTax, getVATRate } from "./tax";
import { prisma } from "./prisma";
import { SubscriptionStatus, SubscriptionTier } from "@prisma/client";
import { SUBSCRIPTION_TIERS } from "./subscriptions";

export const PLATFORM_FEES = {
  // Fixed service fee in cents (to avoid floating point issues)
  FIXED_FEE_CENTS: 99, // €0.99
  // Default percentage fee (as decimal) - used for customer side
  PERCENTAGE_FEE: 0.025, // 2.5% from customer
  // Default worker platform fee percentage
  DEFAULT_WORKER_FEE_PERCENT: 15, // 15% total from worker
} as const;

/**
 * Get the platform fee percentage for a worker based on their subscription
 * @param workerId - The worker's user ID
 * @returns Platform fee percentage (e.g., 15 for 15%)
 */
export async function getWorkerPlatformFee(workerId: string): Promise<number> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId: workerId },
    select: {
      tier: true,
      status: true,
      platformFeePercent: true,
    },
  });

  // If no subscription or not active, use default
  if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
    return PLATFORM_FEES.DEFAULT_WORKER_FEE_PERCENT;
  }

  // Return the cached platform fee from subscription
  return subscription.platformFeePercent;
}

/**
 * Get platform fee percentage by tier (without database lookup)
 * Useful when you already know the tier
 */
export function getPlatformFeeByTier(tier: SubscriptionTier): number {
  return SUBSCRIPTION_TIERS[tier].platformFeePercent;
}

export interface FeeBreakdown {
  // Original booking price (worker's rate)
  bookingPrice: number;
  // Customer fees
  customerFixedFee: number;
  customerPercentageFee: number;
  customerTotal: number; // What customer pays
  // Worker fees
  workerFixedFee: number;
  workerPercentageFee: number;
  workerReceives: number; // What worker gets
  // Platform
  platformTotal: number; // Total platform revenue before Stripe
  // Currency
  currency: string;
}

export interface FeeBreakdownWithTax extends FeeBreakdown {
  // Tax details
  taxRate: number;           // Percentage (e.g., 19)
  taxAmount: number;         // Tax on customer total
  customerTotalWithTax: number; // Final amount customer pays
  // Country info
  countryCode: string;
  taxLabel: string;          // "VAT", "GST", etc.
}

/**
 * Calculate fee breakdown for a booking (default fees)
 * @param bookingPrice - The worker's rate for the job (in currency units, e.g., euros)
 * @param currency - Currency code (e.g., "EUR", "USD")
 * @returns Detailed fee breakdown
 */
export function calculateFees(
  bookingPrice: number,
  currency: string = "EUR"
): FeeBreakdown {
  return calculateFeesWithWorkerRate(bookingPrice, currency, PLATFORM_FEES.DEFAULT_WORKER_FEE_PERCENT);
}

/**
 * Calculate fee breakdown with custom worker platform fee
 * @param bookingPrice - The worker's rate for the job
 * @param currency - Currency code
 * @param workerFeePercent - Worker's platform fee percentage (e.g., 15 for 15%)
 * @returns Detailed fee breakdown
 */
export function calculateFeesWithWorkerRate(
  bookingPrice: number,
  currency: string = "EUR",
  workerFeePercent: number = PLATFORM_FEES.DEFAULT_WORKER_FEE_PERCENT
): FeeBreakdown {
  const fixedFee = PLATFORM_FEES.FIXED_FEE_CENTS / 100;
  const customerPercentageFee = Math.round(bookingPrice * PLATFORM_FEES.PERCENTAGE_FEE * 100) / 100;

  // Worker fee is based on their subscription tier
  const workerPercentageFee = Math.round(bookingPrice * (workerFeePercent / 100) * 100) / 100;

  const customerTotal = bookingPrice + fixedFee + customerPercentageFee;
  const workerReceives = bookingPrice - workerPercentageFee;
  const platformTotal = fixedFee + customerPercentageFee + workerPercentageFee;

  return {
    bookingPrice,
    customerFixedFee: fixedFee,
    customerPercentageFee,
    customerTotal: Math.round(customerTotal * 100) / 100,
    workerFixedFee: 0, // No fixed fee for workers with subscription model
    workerPercentageFee,
    workerReceives: Math.round(workerReceives * 100) / 100,
    platformTotal: Math.round(platformTotal * 100) / 100,
    currency,
  };
}

/**
 * Calculate fees for a booking with worker's actual subscription rate
 * @param bookingPrice - The worker's rate for the job
 * @param workerId - The worker's user ID
 * @param currency - Currency code
 * @returns Detailed fee breakdown based on worker's subscription
 */
export async function calculateFeesForWorker(
  bookingPrice: number,
  workerId: string,
  currency: string = "EUR"
): Promise<FeeBreakdown> {
  const workerFeePercent = await getWorkerPlatformFee(workerId);
  return calculateFeesWithWorkerRate(bookingPrice, currency, workerFeePercent);
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

/**
 * Calculate fee breakdown with tax for a booking
 * @param bookingPrice - The worker's rate for the job
 * @param currency - Currency code
 * @param countryCode - ISO 3166-1 alpha-2 country code for tax calculation
 * @returns Detailed fee breakdown including tax
 */
export function calculateFeesWithTax(
  bookingPrice: number,
  currency: string = "EUR",
  countryCode: string = "DE"
): FeeBreakdownWithTax {
  // Calculate base fees
  const baseFees = calculateFees(bookingPrice, currency);

  // Calculate tax on customer total
  const taxBreakdown = calculateTax(baseFees.customerTotal, countryCode);

  return {
    ...baseFees,
    taxRate: taxBreakdown.taxRate,
    taxAmount: taxBreakdown.taxAmount,
    customerTotalWithTax: taxBreakdown.totalWithTax,
    countryCode: taxBreakdown.countryCode,
    taxLabel: taxBreakdown.taxLabel,
  };
}

/**
 * Calculate invoice amounts with proper tax handling
 * @param subtotal - Service subtotal (before fees)
 * @param tipAmount - Optional tip amount
 * @param countryCode - Country for tax calculation
 * @returns Invoice amounts breakdown
 */
export function calculateInvoiceAmounts(
  subtotal: number,
  tipAmount: number = 0,
  countryCode: string = "DE"
): {
  subtotal: number;
  tipAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  taxLabel: string;
} {
  const taxRate = getVATRate(countryCode);
  // Tax is calculated on the service subtotal (not on tips in most jurisdictions)
  const taxAmount = Math.round((subtotal * taxRate / 100) * 100) / 100;
  const totalAmount = Math.round((subtotal + tipAmount + taxAmount) * 100) / 100;

  const taxLabels: Record<string, string> = {
    DE: "VAT", FR: "VAT", IT: "VAT", ES: "VAT", // EU
    GB: "VAT", CH: "VAT", // Non-EU Europe
    US: "Tax", AU: "GST", CA: "GST", JP: "Tax",
  };

  return {
    subtotal,
    tipAmount,
    taxRate,
    taxAmount,
    totalAmount,
    taxLabel: taxLabels[countryCode.toUpperCase()] || "VAT",
  };
}
