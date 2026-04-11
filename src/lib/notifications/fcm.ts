/**
 * Firebase Cloud Messaging Service for Mobile Push Notifications
 */

import { prisma } from "@/lib/prisma";

// FCM v1 API endpoint
const FCM_API_URL = "https://fcm.googleapis.com/v1/projects";

interface FCMMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

interface FCMResult {
  success: boolean;
  successCount: number;
  failedCount: number;
  errors?: string[];
}

// Get access token using service account credentials
async function getAccessToken(): Promise<string | null> {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    const { GoogleAuth } = await import("google-auth-library");

    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token || null;
  } catch (error) {
    console.error("Error getting FCM access token:", error);
    return null;
  }
}

function getProjectId(): string | null {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return serviceAccount.project_id || null;
  } catch {
    return null;
  }
}

/**
 * Send push notification to a user's mobile devices via FCM
 */
export async function sendFCMNotification(
  userId: string,
  message: FCMMessage
): Promise<FCMResult> {
  const projectId = getProjectId();
  const accessToken = await getAccessToken();

  // Development mode - log notification
  if (!projectId || !accessToken) {
    console.log(`[FCM DEV] To: ${userId}, Message:`, message);
    return { success: true, successCount: 1, failedCount: 0 };
  }

  // Get user's FCM tokens from database
  const tokens = await prisma.mobileDeviceToken.findMany({
    where: { userId, isActive: true },
  });

  if (tokens.length === 0) {
    return { success: true, successCount: 0, failedCount: 0 };
  }

  const results = await Promise.allSettled(
    tokens.map(async (tokenRecord) => {
      const response = await fetch(
        `${FCM_API_URL}/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: tokenRecord.token,
              notification: {
                title: message.title,
                body: message.body,
                ...(message.imageUrl && { image: message.imageUrl }),
              },
              data: message.data || {},
              android: {
                priority: "high",
                notification: {
                  channelId: "servantana_default",
                  icon: "ic_notification",
                  color: "#3F517A",
                },
              },
              apns: {
                payload: {
                  aps: {
                    sound: "default",
                    badge: 1,
                  },
                },
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();

        // Handle invalid/expired tokens
        if (
          error.error?.code === 404 ||
          error.error?.details?.some(
            (d: { errorCode: string }) =>
              d.errorCode === "UNREGISTERED" || d.errorCode === "INVALID_ARGUMENT"
          )
        ) {
          // Mark token as inactive
          await prisma.mobileDeviceToken.update({
            where: { id: tokenRecord.id },
            data: { isActive: false },
          });
        }

        throw new Error(error.error?.message || "FCM send failed");
      }

      return response.json();
    })
  );

  const successCount = results.filter((r) => r.status === "fulfilled").length;
  const failedCount = results.filter((r) => r.status === "rejected").length;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => r.reason?.message || "Unknown error");

  return {
    success: successCount > 0,
    successCount,
    failedCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Send push notification to multiple users
 */
export async function sendFCMToMultipleUsers(
  userIds: string[],
  message: FCMMessage
): Promise<FCMResult> {
  const results = await Promise.all(
    userIds.map((userId) => sendFCMNotification(userId, message))
  );

  return {
    success: results.some((r) => r.success),
    successCount: results.reduce((sum, r) => sum + r.successCount, 0),
    failedCount: results.reduce((sum, r) => sum + r.failedCount, 0),
    errors: results.flatMap((r) => r.errors || []),
  };
}

/**
 * Send push notification by topic (for broadcasts)
 */
export async function sendFCMToTopic(
  topic: string,
  message: FCMMessage
): Promise<boolean> {
  const projectId = getProjectId();
  const accessToken = await getAccessToken();

  if (!projectId || !accessToken) {
    console.log(`[FCM DEV] Topic: ${topic}, Message:`, message);
    return true;
  }

  try {
    const response = await fetch(
      `${FCM_API_URL}/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            topic,
            notification: {
              title: message.title,
              body: message.body,
            },
            data: message.data || {},
          },
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("FCM topic send error:", error);
    return false;
  }
}
