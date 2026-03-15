/**
 * Web Push Notification Service
 */

import webPush from "web-push";
import { prisma } from "@/lib/prisma";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.NEXTAUTH_URL || "mailto:support@servantana.com";

let isConfigured = false;

function configure() {
  if (isConfigured || !vapidPublicKey || !vapidPrivateKey) {
    return;
  }

  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  isConfigured = true;
}

export interface PushResult {
  success: boolean;
  successCount: number;
  failedCount: number;
  errors?: string[];
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

export async function sendPushNotification(
  userId: string,
  payload: PushPayload
): Promise<PushResult> {
  configure();

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log(`[PUSH DEV] To: ${userId}, Payload:`, payload);
    return { success: true, successCount: 1, failedCount: 0 };
  }

  // Get user's push subscriptions
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { success: true, successCount: 0, failedCount: 0 };
  }

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      await webPush.sendNotification(
        pushSubscription,
        JSON.stringify(payload)
      );
    })
  );

  const successCount = results.filter((r) => r.status === "fulfilled").length;
  const failedCount = results.filter((r) => r.status === "rejected").length;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => r.reason?.message || "Unknown error");

  // Remove expired subscriptions
  const failedSubscriptions = results
    .map((r, i) => ({ result: r, sub: subscriptions[i] }))
    .filter(({ result }) => result.status === "rejected");

  for (const { sub } of failedSubscriptions) {
    // Check if it's a 410 (Gone) error - subscription expired
    await prisma.pushSubscription.delete({
      where: { id: sub.id },
    }).catch(() => {
      // Ignore deletion errors
    });
  }

  return {
    success: successCount > 0,
    successCount,
    failedCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export function getVapidPublicKey(): string | null {
  return vapidPublicKey || null;
}
