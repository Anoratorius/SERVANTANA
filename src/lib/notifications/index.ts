/**
 * Unified Notification Service
 * Sends notifications via Email, SMS, and Push based on user preferences
 */

import { prisma } from "@/lib/prisma";
import { NotificationType, NotificationChannel } from "@prisma/client";
import { getNotificationTemplate } from "./templates";
import { sendSMSWithTemplate } from "./sms";
import { sendPushNotification, PushPayload } from "./push";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Servantana <onboarding@resend.dev>";

interface NotificationData {
  bookingId?: string;
  customerName?: string;
  workerName?: string;
  serviceName?: string;
  bookingDate?: string;
  bookingTime?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  amount?: string;
  documentType?: string;
  reason?: string;
  senderName?: string;
  otherPartyName?: string;
  minutesUntil?: number;
}

interface NotificationResult {
  success: boolean;
  channels: {
    email?: { sent: boolean; error?: string };
    sms?: { sent: boolean; error?: string };
    push?: { sent: boolean; error?: string };
  };
}

export async function sendNotification(
  userId: string,
  type: NotificationType,
  data: NotificationData,
  options?: {
    forceChannels?: NotificationChannel[];
    actionUrl?: string;
  }
): Promise<NotificationResult> {
  const result: NotificationResult = {
    success: false,
    channels: {},
  };

  // Get user with notification preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      phone: true,
      firstName: true,
      notificationPreferences: {
        where: { type, enabled: true },
      },
    },
  });

  if (!user) {
    console.error(`User not found: ${userId}`);
    return result;
  }

  const { title, body } = getNotificationTemplate(type, data);

  // Determine which channels to use
  const enabledChannels = options?.forceChannels ||
    user.notificationPreferences.map((p) => p.channel);

  // If no preferences set, default to email
  const channelsToUse = enabledChannels.length > 0 ? enabledChannels : ["EMAIL" as NotificationChannel];

  // Send via each enabled channel
  const sendPromises: Promise<void>[] = [];

  if (channelsToUse.includes("EMAIL") && user.email) {
    sendPromises.push(
      sendEmailNotification(user.email, title, body, options?.actionUrl)
        .then((sent) => {
          result.channels.email = { sent };
        })
        .catch((error) => {
          result.channels.email = { sent: false, error: error.message };
        })
    );
  }

  if (channelsToUse.includes("SMS") && user.phone) {
    sendPromises.push(
      sendSMSWithTemplate(user.phone, title, body)
        .then((res) => {
          result.channels.sms = { sent: res.success, error: res.error };
        })
        .catch((error) => {
          result.channels.sms = { sent: false, error: error.message };
        })
    );
  }

  if (channelsToUse.includes("PUSH")) {
    const pushPayload: PushPayload = {
      title,
      body,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: type,
      data: {
        type,
        url: options?.actionUrl,
        ...data,
      },
    };

    sendPromises.push(
      sendPushNotification(userId, pushPayload)
        .then((res) => {
          result.channels.push = {
            sent: res.success,
            error: res.errors?.join(", "),
          };
        })
        .catch((error) => {
          result.channels.push = { sent: false, error: error.message };
        })
    );
  }

  await Promise.all(sendPromises);

  // Log notification
  await prisma.notificationLog.create({
    data: {
      userId,
      type,
      channel: channelsToUse[0], // Primary channel
      title,
      body,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
      sent: Object.values(result.channels).some((c) => c.sent),
      sentAt: new Date(),
    },
  });

  result.success = Object.values(result.channels).some((c) => c.sent);
  return result;
}

async function sendEmailNotification(
  to: string,
  title: string,
  body: string,
  actionUrl?: string
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL DEV] To: ${to}, Subject: ${title}, Body: ${body}`);
    return true;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="background: linear-gradient(to right, #2563eb, #16a34a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px; margin: 0;">SERVANTANA</h1>
          </div>

          <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>

          <p style="color: #555; font-size: 16px; line-height: 1.6;">${body}</p>

          ${actionUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${actionUrl}"
                 style="background: linear-gradient(to right, #2563eb, #16a34a); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                View Details
              </a>
            </div>
          ` : ""}

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #aaa; font-size: 12px; text-align: center;">
            &copy; ${new Date().getFullYear()} Servantana. All rights reserved.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Email notification error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email notification error:", error);
    return false;
  }
}

// Helper to get default preferences for a user
export async function createDefaultPreferences(userId: string): Promise<void> {
  const defaultPrefs: Array<{ type: NotificationType; channel: NotificationChannel }> = [
    { type: "BOOKING_CREATED", channel: "EMAIL" },
    { type: "BOOKING_CONFIRMED", channel: "EMAIL" },
    { type: "BOOKING_CANCELLED", channel: "EMAIL" },
    { type: "BOOKING_REMINDER", channel: "EMAIL" },
    { type: "BOOKING_REMINDER", channel: "PUSH" },
    { type: "BOOKING_COMPLETED", channel: "EMAIL" },
    { type: "PAYMENT_RECEIVED", channel: "EMAIL" },
    { type: "MESSAGE_RECEIVED", channel: "PUSH" },
    { type: "REVIEW_RECEIVED", channel: "EMAIL" },
  ];

  await prisma.notificationPreference.createMany({
    data: defaultPrefs.map((pref) => ({
      userId,
      ...pref,
      enabled: true,
    })),
    skipDuplicates: true,
  });
}

export { getVapidPublicKey } from "./push";
