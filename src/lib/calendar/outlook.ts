/**
 * Microsoft Outlook Calendar Integration
 */

import { Client } from "@microsoft/microsoft-graph-client";
import { encrypt, decrypt } from "@/lib/encryption";

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/calendar/connect/outlook/callback`;
const SCOPES = ["Calendars.ReadWrite", "User.Read", "offline_access"];

export function getOutlookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(" "),
    state,
    prompt: "consent",
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

export async function getOutlookTokensFromCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}> {
  const tokenResponse = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID!,
        client_secret: MICROSOFT_CLIENT_SECRET!,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    }
  );

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    throw new Error(tokens.error_description || tokens.error);
  }

  // Get user email
  const client = getOutlookClient(tokens.access_token);
  const user = await client.api("/me").select("mail,userPrincipalName").get();

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  return {
    accessToken: encrypt(tokens.access_token),
    refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : "",
    expiresAt,
    email: user.mail || user.userPrincipalName || "",
  };
}

export async function refreshOutlookToken(encryptedRefreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const refreshToken = decrypt(encryptedRefreshToken);

  const tokenResponse = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID!,
        client_secret: MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    }
  );

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    throw new Error(tokens.error_description || tokens.error);
  }

  return {
    accessToken: encrypt(tokens.access_token),
    refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : encryptedRefreshToken,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  };
}

export function getOutlookClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

export interface CalendarEventData {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
}

export async function createOutlookCalendarEvent(
  encryptedAccessToken: string,
  eventData: CalendarEventData
): Promise<string> {
  const accessToken = decrypt(encryptedAccessToken);
  const client = getOutlookClient(accessToken);

  const event = {
    subject: eventData.title,
    body: {
      contentType: "text",
      content: eventData.description || "",
    },
    start: {
      dateTime: eventData.startTime.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: eventData.endTime.toISOString(),
      timeZone: "UTC",
    },
    location: eventData.location ? { displayName: eventData.location } : undefined,
    reminderMinutesBeforeStart: 60,
  };

  const response = await client.api("/me/events").post(event);

  return response.id;
}

export async function updateOutlookCalendarEvent(
  encryptedAccessToken: string,
  eventId: string,
  eventData: Partial<CalendarEventData>
): Promise<void> {
  const accessToken = decrypt(encryptedAccessToken);
  const client = getOutlookClient(accessToken);

  const event: Record<string, unknown> = {};

  if (eventData.title) event.subject = eventData.title;
  if (eventData.description) {
    event.body = { contentType: "text", content: eventData.description };
  }
  if (eventData.location) {
    event.location = { displayName: eventData.location };
  }
  if (eventData.startTime) {
    event.start = { dateTime: eventData.startTime.toISOString(), timeZone: "UTC" };
  }
  if (eventData.endTime) {
    event.end = { dateTime: eventData.endTime.toISOString(), timeZone: "UTC" };
  }

  await client.api(`/me/events/${eventId}`).patch(event);
}

export async function deleteOutlookCalendarEvent(
  encryptedAccessToken: string,
  eventId: string
): Promise<void> {
  const accessToken = decrypt(encryptedAccessToken);
  const client = getOutlookClient(accessToken);

  await client.api(`/me/events/${eventId}`).delete();
}

export async function listOutlookCalendars(
  encryptedAccessToken: string
): Promise<Array<{ id: string; name: string; primary: boolean }>> {
  const accessToken = decrypt(encryptedAccessToken);
  const client = getOutlookClient(accessToken);

  const response = await client.api("/me/calendars").get();

  return (response.value || []).map((cal: { id: string; name: string; isDefaultCalendar: boolean }) => ({
    id: cal.id,
    name: cal.name,
    primary: cal.isDefaultCalendar || false,
  }));
}
