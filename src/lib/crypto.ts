import crypto from "crypto";

// Coinbase Commerce API integration for cryptocurrency payments

const COINBASE_COMMERCE_API = "https://api.commerce.coinbase.com";

interface CryptoChargeData {
  name: string;
  description: string;
  pricing_type: "fixed_price";
  local_price: {
    amount: string;
    currency: string;
  };
  metadata: {
    bookingId: string;
    customerId: string;
    workerId: string;
  };
  redirect_url: string;
  cancel_url: string;
}

interface CryptoCharge {
  id: string;
  code: string;
  name: string;
  description: string;
  hosted_url: string;
  created_at: string;
  expires_at: string;
  pricing: {
    local: { amount: string; currency: string };
    bitcoin?: { amount: string; currency: string };
    ethereum?: { amount: string; currency: string };
    litecoin?: { amount: string; currency: string };
  };
  payments: Array<{
    network: string;
    transaction_id: string;
    status: string;
    value: { amount: string; currency: string };
  }>;
  timeline: Array<{
    time: string;
    status: string;
  }>;
}

export async function createCryptoCharge(data: CryptoChargeData): Promise<CryptoCharge> {
  const apiKey = process.env.COINBASE_COMMERCE_API_KEY;

  if (!apiKey) {
    throw new Error("COINBASE_COMMERCE_API_KEY is not configured");
  }

  const response = await fetch(`${COINBASE_COMMERCE_API}/charges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CC-Api-Key": apiKey,
      "X-CC-Version": "2018-03-22",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to create crypto charge");
  }

  const result = await response.json();
  return result.data as CryptoCharge;
}

export async function getCryptoCharge(chargeId: string): Promise<CryptoCharge> {
  const apiKey = process.env.COINBASE_COMMERCE_API_KEY;

  if (!apiKey) {
    throw new Error("COINBASE_COMMERCE_API_KEY is not configured");
  }

  const response = await fetch(`${COINBASE_COMMERCE_API}/charges/${chargeId}`, {
    method: "GET",
    headers: {
      "X-CC-Api-Key": apiKey,
      "X-CC-Version": "2018-03-22",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to get crypto charge");
  }

  const result = await response.json();
  return result.data as CryptoCharge;
}

// Verify webhook signature from Coinbase Commerce
export function verifyCoinbaseWebhook(
  payload: string,
  signature: string,
  webhookSecret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

// Supported cryptocurrencies
export const SUPPORTED_CRYPTOS = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC", icon: "₿" },
  { id: "ethereum", name: "Ethereum", symbol: "ETH", icon: "Ξ" },
  { id: "litecoin", name: "Litecoin", symbol: "LTC", icon: "Ł" },
] as const;

export type CryptoType = typeof SUPPORTED_CRYPTOS[number]["id"];
