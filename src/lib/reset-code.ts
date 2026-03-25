import { prisma } from "./prisma";
import { Resend } from "resend";
import { randomInt } from "crypto";
import * as fs from "fs";
import * as path from "path";

const resend = new Resend(process.env.RESEND_API_KEY);

// From email for sending - using verified domain
const FROM_EMAIL = "Servantana <noreply@servantana.com>";

// Logo as base64 for CID attachment
const EMAIL_LOGO_BASE64 = "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";

// Generate a cryptographically secure 3-digit code
export function generateResetCode(): string {
  return randomInt(100, 1000).toString();
}

// Create a password reset token
export async function createResetToken(
  identifier: string,
  type: "email" | "phone"
): Promise<{ code: string; expires: Date }> {
  // Delete any existing unused tokens for this identifier
  await prisma.passwordResetToken.deleteMany({
    where: {
      identifier,
      used: false,
    },
  });

  const code = generateResetCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.passwordResetToken.create({
    data: {
      identifier,
      token: code,
      type,
      expires,
    },
  });

  return { code, expires };
}

// Verify a reset token
export async function verifyResetToken(
  identifier: string,
  code: string
): Promise<boolean> {
  const token = await prisma.passwordResetToken.findFirst({
    where: {
      identifier,
      token: code,
      used: false,
      expires: {
        gt: new Date(),
      },
    },
  });

  return !!token;
}

// Mark token as used
export async function markTokenUsed(identifier: string, code: string): Promise<void> {
  await prisma.passwordResetToken.updateMany({
    where: {
      identifier,
      token: code,
    },
    data: {
      used: true,
    },
  });
}

// Invalidate all tokens for an identifier (used after too many failed attempts)
export async function invalidateToken(identifier: string): Promise<void> {
  await prisma.passwordResetToken.updateMany({
    where: {
      identifier,
      used: false,
    },
    data: {
      used: true,
    },
  });
}

// Send password reset email via Resend
export async function sendResetEmail(
  email: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  // Check if API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return { success: false, message: "Email service not configured" };
  }

  console.log(`Sending password reset email to ${email} from ${FROM_EMAIL}`);

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Reset Your Servantana Password",
      attachments: [
        {
          filename: "logo.png",
          content: EMAIL_LOGO_BASE64,
          content_id: "logo",
        },
      ],
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="cid:logo" alt="SERVANTANA" width="200" style="display: block; margin: 0 auto;" />
          </div>

          <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            You requested to reset your password. Use the code below to complete the process:
          </p>

          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">${code}</span>
          </div>

          <p style="color: #555; font-size: 14px;">
            This code expires in <strong>15 minutes</strong>.
          </p>

          <p style="color: #888; font-size: 14px; margin-top: 30px;">
            If you didn't request this password reset, please ignore this email or contact support if you have concerns.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #aaa; font-size: 12px; text-align: center;">
            &copy; 2026 Servantana. All rights reserved.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, message: error.message || "Failed to send email" };
    }

    console.log("Email sent successfully:", data?.id);

    return {
      success: true,
      message: `Reset code sent to ${maskEmail(email)}`,
    };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, message: "Failed to send email" };
  }
}

// Simulated SMS sending (replace with real SMS service like Twilio, etc.)
export async function sendResetSMS(
  phone: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  // In production, integrate with SMS service:
  // - Twilio: https://twilio.com
  // - AWS SNS: https://aws.amazon.com/sns/
  // - Vonage: https://vonage.com

  console.log(`
    ========================================
    PASSWORD RESET SMS
    ========================================
    To: ${phone}

    Your Servantana password reset code is: ${code}
    Expires in 15 minutes.
    ========================================
  `);

  // For development, always succeed
  return {
    success: true,
    message: `Reset code sent to ${maskPhone(phone)}`,
  };
}

// Mask email for privacy (john@example.com -> j***@example.com)
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

// Mask phone for privacy (+1234567890 -> +1******890)
function maskPhone(phone: string): string {
  if (phone.length <= 4) return "***";
  return `${phone.slice(0, 2)}******${phone.slice(-3)}`;
}
