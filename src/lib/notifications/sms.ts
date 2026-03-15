/**
 * SMS Notification Service using Twilio
 */

import twilio from "twilio";
import { formatPhoneNumber } from "./templates";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio | null {
  if (!accountSid || !authToken) {
    console.warn("Twilio credentials not configured");
    return null;
  }

  if (!client) {
    client = twilio(accountSid, authToken);
  }

  return client;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS(
  to: string,
  body: string
): Promise<SMSResult> {
  const twilioClient = getClient();

  if (!twilioClient || !fromNumber) {
    console.log(`[SMS DEV] To: ${to}, Body: ${body}`);
    return { success: true, messageId: "dev-mode" };
  }

  try {
    const formattedTo = formatPhoneNumber(to);

    const message = await twilioClient.messages.create({
      body,
      from: fromNumber,
      to: formattedTo,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    console.error("Twilio SMS error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send SMS",
    };
  }
}

export async function sendSMSWithTemplate(
  to: string,
  title: string,
  body: string
): Promise<SMSResult> {
  // Combine title and body for SMS
  const message = `${title}\n\n${body}`;
  return sendSMS(to, message);
}
