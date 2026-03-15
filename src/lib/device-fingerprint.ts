/**
 * Device Fingerprinting Service
 * Detect and track user devices for suspicious login detection
 */

import { prisma } from "./prisma";
import { writeAuditLog } from "./audit-log";
import { createHash } from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Servantana <onboarding@resend.dev>";

/**
 * Device fingerprint data collected from client
 */
export interface DeviceFingerprint {
  userAgent: string;
  language?: string;
  platform?: string;
  screenResolution?: string;
  timezone?: string;
  colorDepth?: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
}

/**
 * Parse user agent to extract browser and OS info
 */
function parseUserAgent(userAgent: string): {
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet";
} {
  const ua = userAgent.toLowerCase();

  // Detect browser
  let browser = "Unknown";
  if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("edg")) browser = "Edge";
  else if (ua.includes("chrome")) browser = "Chrome";
  else if (ua.includes("safari")) browser = "Safari";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";

  // Detect OS
  let os = "Unknown";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os") || ua.includes("macos")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  // Detect device type
  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    deviceType = "mobile";
  } else if (ua.includes("tablet") || ua.includes("ipad")) {
    deviceType = "tablet";
  }

  return { browser, os, deviceType };
}

/**
 * Generate a fingerprint hash from device data
 */
export function generateFingerprintHash(data: DeviceFingerprint): string {
  const fingerprintString = [
    data.userAgent,
    data.language,
    data.platform,
    data.screenResolution,
    data.timezone,
    data.colorDepth,
    data.hardwareConcurrency,
    data.deviceMemory,
  ]
    .filter(Boolean)
    .join("|");

  return createHash("sha256").update(fingerprintString).digest("hex").substring(0, 32);
}

/**
 * Generate a human-readable device name
 */
function generateDeviceName(browser: string, os: string, deviceType: string): string {
  const typeEmoji = deviceType === "mobile" ? "📱" : deviceType === "tablet" ? "📱" : "💻";
  return `${typeEmoji} ${browser} on ${os}`;
}

/**
 * Check if device is known, create if new, return device info
 */
export async function checkDevice(
  userId: string,
  fingerprint: DeviceFingerprint,
  ip?: string,
  country?: string
): Promise<{
  isNewDevice: boolean;
  isTrusted: boolean;
  deviceId: string;
  deviceName: string;
}> {
  const fingerprintHash = generateFingerprintHash(fingerprint);
  const { browser, os, deviceType } = parseUserAgent(fingerprint.userAgent);
  const deviceName = generateDeviceName(browser, os, deviceType);

  // Check if device exists
  let device = await prisma.userDevice.findUnique({
    where: {
      userId_fingerprint: {
        userId,
        fingerprint: fingerprintHash,
      },
    },
  });

  if (device) {
    // Update last seen
    await prisma.userDevice.update({
      where: { id: device.id },
      data: {
        lastSeenAt: new Date(),
        lastIp: ip,
        lastCountry: country,
      },
    });

    return {
      isNewDevice: false,
      isTrusted: device.isTrusted,
      deviceId: device.id,
      deviceName: device.name || deviceName,
    };
  }

  // New device - create it
  device = await prisma.userDevice.create({
    data: {
      userId,
      fingerprint: fingerprintHash,
      name: deviceName,
      browser,
      os,
      deviceType,
      lastIp: ip,
      lastCountry: country,
    },
  });

  // Audit log for new device
  await writeAuditLog({
    action: "LOGIN_NEW_DEVICE",
    actorId: userId,
    targetId: device.id,
    targetType: "Device",
    ip,
    details: { browser, os, deviceType, country },
  });

  return {
    isNewDevice: true,
    isTrusted: false,
    deviceId: device.id,
    deviceName,
  };
}

/**
 * Send new device login notification email
 */
export async function sendNewDeviceAlert(
  userId: string,
  email: string,
  firstName: string,
  deviceInfo: {
    deviceName: string;
    ip?: string;
    country?: string;
    city?: string;
  }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[DEV] New device alert for ${email}:`, deviceInfo);
    return;
  }

  try {
    const loginTime = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const location = [deviceInfo.city, deviceInfo.country].filter(Boolean).join(", ") || "Unknown location";

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "New device login to your Servantana account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="background: linear-gradient(to right, #2563eb, #16a34a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px; margin: 0;">SERVANTANA</h1>
          </div>

          <h2 style="color: #333; margin-bottom: 20px;">New Device Login Detected</h2>

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Hi ${firstName}, we noticed a login to your account from a new device:
          </p>

          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>Device:</strong> ${deviceInfo.deviceName}</p>
            <p style="margin: 8px 0;"><strong>Location:</strong> ${location}</p>
            <p style="margin: 8px 0;"><strong>IP Address:</strong> ${deviceInfo.ip || "Unknown"}</p>
            <p style="margin: 8px 0;"><strong>Time:</strong> ${loginTime}</p>
          </div>

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            If this was you, you can ignore this email. If you don't recognize this login, please:
          </p>

          <ol style="color: #555; font-size: 16px; line-height: 1.8;">
            <li>Change your password immediately</li>
            <li>Review your active sessions in Settings</li>
            <li>Contact our support team if needed</li>
          </ol>

          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>Security Tip:</strong> Never share your password or login credentials with anyone.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #aaa; font-size: 12px; text-align: center;">
            &copy; ${new Date().getFullYear()} Servantana. All rights reserved.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send new device alert:", error);
  }
}

/**
 * Get all devices for a user
 */
export async function getUserDevices(userId: string) {
  return prisma.userDevice.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      name: true,
      browser: true,
      os: true,
      deviceType: true,
      isTrusted: true,
      lastSeenAt: true,
      lastIp: true,
      lastCountry: true,
      createdAt: true,
    },
  });
}

/**
 * Trust a device (user confirms it's theirs)
 */
export async function trustDevice(deviceId: string, userId: string): Promise<boolean> {
  const device = await prisma.userDevice.findFirst({
    where: { id: deviceId, userId },
  });

  if (!device) return false;

  await prisma.userDevice.update({
    where: { id: deviceId },
    data: { isTrusted: true },
  });

  return true;
}

/**
 * Remove a device (and revoke its sessions)
 */
export async function removeDevice(
  deviceId: string,
  userId: string,
  ip?: string
): Promise<boolean> {
  const device = await prisma.userDevice.findFirst({
    where: { id: deviceId, userId },
  });

  if (!device) return false;

  // Revoke all sessions for this device
  await prisma.userSession.updateMany({
    where: { deviceId },
    data: { isValid: false },
  });

  // Delete the device
  await prisma.userDevice.delete({
    where: { id: deviceId },
  });

  // Audit log
  await writeAuditLog({
    action: "ADMIN_ACTION",
    actorId: userId,
    targetId: deviceId,
    targetType: "Device",
    ip,
    details: { action: "device_removed", deviceName: device.name },
  });

  return true;
}
