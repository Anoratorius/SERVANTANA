import { prisma } from "./prisma";

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

// Simulated email sending (replace with real email service like SendGrid, Resend, etc.)
export async function sendResetEmail(
  email: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  // In production, integrate with email service:
  // - SendGrid: https://sendgrid.com
  // - Resend: https://resend.com
  // - AWS SES: https://aws.amazon.com/ses/

  console.log(`
    ========================================
    PASSWORD RESET EMAIL
    ========================================
    To: ${email}
    Subject: Reset Your Servantana Password

    Your password reset code is: ${code}

    This code expires in 15 minutes.

    If you didn't request this, please ignore this email.
    ========================================
  `);

  // For development, always succeed
  return {
    success: true,
    message: `Reset code sent to ${maskEmail(email)}`,
  };
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
