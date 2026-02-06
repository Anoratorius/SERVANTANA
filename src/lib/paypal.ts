import {
  Client,
  Environment,
  LogLevel,
  OrdersController,
  PaymentsController,
} from "@paypal/paypal-server-sdk";

// Lazy-initialize PayPal client
let paypalClient: Client | null = null;

export function getPayPalClient(): Client {
  if (!paypalClient) {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("PayPal credentials are not configured");
    }

    const environment =
      process.env.NODE_ENV === "production"
        ? Environment.Production
        : Environment.Sandbox;

    paypalClient = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: clientId,
        oAuthClientSecret: clientSecret,
      },
      timeout: 0,
      environment,
      logging: {
        logLevel: LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logHeaders: true },
      },
    });
  }

  return paypalClient;
}

export function getOrdersController(): OrdersController {
  return new OrdersController(getPayPalClient());
}

export function getPaymentsController(): PaymentsController {
  return new PaymentsController(getPayPalClient());
}
