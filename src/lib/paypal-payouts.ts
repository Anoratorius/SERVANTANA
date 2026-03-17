/**
 * PayPal Payouts API Integration
 * Used for paying cleaners who have PayPal set up
 */

interface PayPalAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayoutItem {
  recipient_type: "EMAIL";
  receiver: string;
  amount: {
    value: string;
    currency: string;
  };
  note?: string;
  sender_item_id: string;
}

interface PayoutResponse {
  batch_header: {
    payout_batch_id: string;
    batch_status: string;
  };
}

// Cache for access token
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get PayPal API base URL
 */
function getPayPalBaseUrl(): string {
  return process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

/**
 * Get PayPal access token
 */
async function getAccessToken(): Promise<string> {
  // Check cache
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal access token: ${error}`);
  }

  const data: PayPalAccessToken = await response.json();

  // Cache token (with 5 minute buffer before expiry)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  return data.access_token;
}

/**
 * Create a payout batch to multiple recipients
 */
export async function createPayoutBatch(
  items: Array<{
    email: string;
    amount: number;
    currency: string;
    note?: string;
    referenceId: string; // e.g., payout ID or cleaner ID
  }>
): Promise<PayoutResponse> {
  const accessToken = await getAccessToken();

  const payoutItems: PayoutItem[] = items.map((item) => ({
    recipient_type: "EMAIL",
    receiver: item.email,
    amount: {
      value: item.amount.toFixed(2),
      currency: item.currency.toUpperCase(),
    },
    note: item.note || "Servantana Cleaner Payout",
    sender_item_id: item.referenceId,
  }));

  const response = await fetch(`${getPayPalBaseUrl()}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: `payout_${Date.now()}`,
        email_subject: "You have received a payment from Servantana",
        email_message: "Your earnings have been deposited to your PayPal account.",
      },
      items: payoutItems,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`PayPal payout failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Create a single payout to one recipient
 */
export async function createSinglePayout(
  email: string,
  amount: number,
  currency: string,
  referenceId: string,
  note?: string
): Promise<PayoutResponse> {
  return createPayoutBatch([
    {
      email,
      amount,
      currency,
      referenceId,
      note,
    },
  ]);
}

/**
 * Get payout batch status
 */
export async function getPayoutBatchStatus(
  batchId: string
): Promise<{
  batch_header: {
    payout_batch_id: string;
    batch_status: string;
    time_completed?: string;
    amount: { value: string; currency: string };
    fees: { value: string; currency: string };
  };
  items: Array<{
    payout_item_id: string;
    transaction_status: string;
    payout_item: {
      receiver: string;
      amount: { value: string; currency: string };
    };
  }>;
}> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${getPayPalBaseUrl()}/v1/payments/payouts/${batchId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get payout status: ${JSON.stringify(error)}`);
  }

  return response.json();
}
