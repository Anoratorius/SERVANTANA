/**
 * Payment Validation Schemas
 * Zod schemas for payment-related API inputs
 */

import { z } from "zod";

/**
 * Supported payment providers
 */
export const paymentProviderSchema = z.enum(["STRIPE", "PAYPAL", "CRYPTO"]);
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;

/**
 * Create payment intent validation
 */
export const createPaymentIntentSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  provider: paymentProviderSchema,
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3, "Currency must be 3-letter code").default("EUR"),
  tipAmount: z.number().min(0).optional().default(0),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;

/**
 * Confirm payment validation
 */
export const confirmPaymentSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  paymentIntentId: z.string().optional(), // Stripe
  orderId: z.string().optional(), // PayPal
  chargeId: z.string().optional(), // Coinbase
});

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;

/**
 * Refund request validation
 */
export const createRefundSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  amount: z.number().positive("Amount must be positive").optional(), // Partial refund
  reason: z.string().max(500).optional(),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;

/**
 * Payout request validation (for workers)
 */
export const requestPayoutSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  method: z.enum(["BANK_TRANSFER", "PAYPAL", "CRYPTO"]),
  destination: z.string().min(1, "Destination is required"), // Account number, email, wallet address
});

export type RequestPayoutInput = z.infer<typeof requestPayoutSchema>;

/**
 * Tip validation
 */
export const addTipSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  amount: z.number().positive("Tip amount must be positive").max(1000, "Tip cannot exceed 1000"),
  provider: paymentProviderSchema,
});

export type AddTipInput = z.infer<typeof addTipSchema>;

/**
 * Payment method validation (for saving payment methods)
 */
export const savePaymentMethodSchema = z.object({
  provider: paymentProviderSchema,
  token: z.string().min(1, "Payment token is required"),
  isDefault: z.boolean().optional().default(false),
  nickname: z.string().max(50).optional(), // "My Visa ****4242"
});

export type SavePaymentMethodInput = z.infer<typeof savePaymentMethodSchema>;

/**
 * Invoice request validation
 */
export const generateInvoiceSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  includeVAT: z.boolean().optional().default(true),
  billingAddress: z.object({
    name: z.string().min(1),
    street: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().length(2, "Country must be 2-letter code"),
    vatNumber: z.string().optional(),
  }).optional(),
});

export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
