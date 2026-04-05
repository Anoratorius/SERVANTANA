import Stripe from "stripe";

// Create a lazy-initialized Stripe instance
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return stripeInstance;
}

// Export stripe instance getter
export const stripe = getStripe;

// Helper to format amount for Stripe (converts to cents)
export function formatAmountForStripe(amount: number, currency: string): number {
  const zeroDecimalCurrencies = ["JPY", "KRW", "VND", "BIF", "CLP", "DJF", "GNF", "KMF", "MGA", "PYG", "RWF", "UGX", "VUV", "XAF", "XOF", "XPF"];

  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
}

// Helper to format amount from Stripe (converts from cents)
export function formatAmountFromStripe(amount: number, currency: string): number {
  const zeroDecimalCurrencies = ["JPY", "KRW", "VND", "BIF", "CLP", "DJF", "GNF", "KMF", "MGA", "PYG", "RWF", "UGX", "VUV", "XAF", "XOF", "XPF"];

  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return amount;
  }

  return amount / 100;
}

// ============================================
// Stripe Connect Functions (for worker payouts)
// ============================================

export type ConnectAccountStatus = "not_connected" | "pending" | "complete";

/**
 * Get the status of a connected Stripe account
 */
export async function getConnectAccountStatus(
  stripeAccountId: string | null
): Promise<ConnectAccountStatus> {
  if (!stripeAccountId) {
    return "not_connected";
  }

  try {
    const account = await getStripe().accounts.retrieve(stripeAccountId);

    if (account.charges_enabled && account.payouts_enabled) {
      return "complete";
    }

    return "pending";
  } catch {
    return "not_connected";
  }
}

/**
 * Create a new Stripe Connect Express account for a cleaner
 */
export async function createConnectAccount(
  email: string,
  country: string = "DE"
): Promise<Stripe.Account> {
  return getStripe().accounts.create({
    type: "express",
    email,
    country,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
}

/**
 * Create an onboarding link for a Connect account
 */
export async function createConnectOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  return getStripe().accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

/**
 * Create a login link for a connected account's dashboard
 */
export async function createConnectLoginLink(
  accountId: string
): Promise<Stripe.LoginLink> {
  return getStripe().accounts.createLoginLink(accountId);
}

// ============================================
// Payment Collection (money goes to platform)
// ============================================

/**
 * Create a checkout session for a booking payment
 * Money goes to platform account, NOT directly to cleaner
 */
export async function createCheckoutSession(params: {
  bookingId: string;
  customerEmail: string;
  amountTotal: number; // Total amount customer pays (in currency units)
  currency: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  const {
    bookingId,
    customerEmail,
    amountTotal,
    currency,
    successUrl,
    cancelUrl,
    metadata,
  } = params;

  return getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: formatAmountForStripe(amountTotal, currency),
          product_data: {
            name: "Cleaning Service Booking",
            description: `Booking #${bookingId}`,
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      metadata: {
        bookingId,
        ...metadata,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      bookingId,
      ...metadata,
    },
  });
}

/**
 * Retrieve a checkout session
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  return getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });
}

// ============================================
// Payout Functions (transfer to workers)
// ============================================

/**
 * Transfer funds to a connected Stripe account (for worker payouts)
 */
export async function createTransfer(params: {
  amount: number; // Amount in currency units
  currency: string;
  destinationAccountId: string;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Transfer> {
  const { amount, currency, destinationAccountId, description, metadata } = params;

  return getStripe().transfers.create({
    amount: formatAmountForStripe(amount, currency),
    currency: currency.toLowerCase(),
    destination: destinationAccountId,
    description,
    metadata,
  });
}

/**
 * Create a refund for a payment
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  currency?: string
): Promise<Stripe.Refund> {
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };

  if (amount !== undefined && currency) {
    refundParams.amount = formatAmountForStripe(amount, currency);
  }

  return getStripe().refunds.create(refundParams);
}

/**
 * Get platform balance
 */
export async function getPlatformBalance(): Promise<Stripe.Balance> {
  return getStripe().balance.retrieve();
}
