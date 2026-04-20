/**
 * Stripe Subscription Webhook
 * Handles subscription lifecycle events from Stripe
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import {
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
} from "@/lib/subscriptions";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      console.error("STRIPE_SUBSCRIPTION_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    let event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        // Use type assertion to access properties that may vary by API version
        const subData = subscription as unknown as Record<string, unknown>;
        await handleSubscriptionUpdated({
          id: subData.id as string,
          status: subData.status as string,
          current_period_start: (subData.current_period_start ?? subData.currentPeriodStart) as number,
          current_period_end: (subData.current_period_end ?? subData.currentPeriodEnd) as number,
          cancel_at_period_end: (subData.cancel_at_period_end ?? subData.cancelAtPeriodEnd) as boolean,
          canceled_at: (subData.canceled_at ?? subData.canceledAt) as number | null,
          metadata: (subData.metadata || {}) as Record<string, string>,
          items: {
            data: ((subData.items as { data: Array<{ price: { id: string } }> })?.data || []).map((item) => ({
              price: { id: item.price.id },
            })),
          },
          customer: (typeof subData.customer === "string" ? subData.customer : (subData.customer as { id: string })?.id) as string,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription.id);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const invData = invoice as unknown as Record<string, unknown>;
        const subscriptionId = invData.subscription as string | null;
        if (subscriptionId) {
          await handleInvoicePaid({
            id: invData.id as string,
            subscription: subscriptionId,
            customer: (typeof invData.customer === "string" ? invData.customer : (invData.customer as { id: string })?.id) as string,
            amount_due: (invData.amount_due ?? invData.amountDue ?? 0) as number,
            amount_paid: (invData.amount_paid ?? invData.amountPaid ?? 0) as number,
            currency: invData.currency as string,
            status: (invData.status as string) || "paid",
            paid: invData.paid as boolean,
            period_start: (invData.period_start ?? invData.periodStart ?? 0) as number,
            period_end: (invData.period_end ?? invData.periodEnd ?? 0) as number,
            hosted_invoice_url: (invData.hosted_invoice_url ?? invData.hostedInvoiceUrl) as string | null,
            invoice_pdf: (invData.invoice_pdf ?? invData.invoicePdf) as string | null,
            payment_intent: (typeof invData.payment_intent === "string" ? invData.payment_intent : null) as string | null,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        // Subscription will automatically go to past_due status
        // which is handled by customer.subscription.updated
        console.log("Invoice payment failed:", event.data.object);
        break;
      }

      default:
        // Unhandled event type
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
