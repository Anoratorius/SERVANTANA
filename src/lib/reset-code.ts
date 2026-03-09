import { prisma } from "./prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Generate a 6-digit code
export function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

// Send password reset email via Resend
export async function sendResetEmail(
  email: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await resend.emails.send({
      from: "Servantana <noreply@servantana.com>",
      to: email,
      subject: "Reset Your Servantana Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="background: linear-gradient(to right, #2563eb, #16a34a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px; margin: 0;">SERVANTANA</h1>
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
      return { success: false, message: "Failed to send email" };
    }

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
