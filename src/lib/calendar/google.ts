/**
 * Google Calendar Integration
 */

import { google, calendar_v3 } from "googleapis";
import { encrypt, decrypt } from "@/lib/encryption";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/calendar/connect/google/callback`;

export function getGoogleOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

export function getGoogleAuthUrl(state: string): string {
  const oauth2Client = getGoogleOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
    prompt: "consent",
  });
}

export async function getGoogleTokensFromCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}> {
  const oauth2Client = getGoogleOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);

  // Get user email
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  return {
    accessToken: encrypt(tokens.access_token!),
    refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : "",
    expiresAt,
    email: userInfo.email || "",
  };
}

export async function refreshGoogleToken(encryptedRefreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const oauth2Client = getGoogleOAuth2Client();
  const refreshToken = decrypt(encryptedRefreshToken);

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  return {
    accessToken: encrypt(credentials.access_token!),
    expiresAt: credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000),
  };
}

export async function getGoogleCalendarClient(
  encryptedAccessToken: string,
  encryptedRefreshToken?: string
): Promise<calendar_v3.Calendar> {
  const oauth2Client = getGoogleOAuth2Client();
  const accessToken = decrypt(encryptedAccessToken);

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: encryptedRefreshToken ? decrypt(encryptedRefreshToken) : undefined,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export interface CalendarEventData {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
}

export async function createGoogleCalendarEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventData: CalendarEventData
): Promise<string> {
  const event = {
    summary: eventData.title,
    description: eventData.description,
    location: eventData.location,
    start: {
      dateTime: eventData.startTime.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: eventData.endTime.toISOString(),
      timeZone: "UTC",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 }, // 1 day before
        { method: "popup", minutes: 60 }, // 1 hour before
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });

  return response.data.id!;
}

export async function updateGoogleCalendarEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventId: string,
  eventData: Partial<CalendarEventData>
): Promise<void> {
  const event: calendar_v3.Schema$Event = {};

  if (eventData.title) event.summary = eventData.title;
  if (eventData.description) event.description = eventData.description;
  if (eventData.location) event.location = eventData.location;
  if (eventData.startTime) {
    event.start = { dateTime: eventData.startTime.toISOString(), timeZone: "UTC" };
  }
  if (eventData.endTime) {
    event.end = { dateTime: eventData.endTime.toISOString(), timeZone: "UTC" };
  }

  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: event,
  });
}

export async function deleteGoogleCalendarEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventId: string
): Promise<void> {
  await calendar.events.delete({
    calendarId,
    eventId,
  });
}

export async function listGoogleCalendars(
  calendar: calendar_v3.Calendar
): Promise<Array<{ id: string; name: string; primary: boolean }>> {
  const response = await calendar.calendarList.list();

  return (response.data.items || []).map((cal) => ({
    id: cal.id!,
    name: cal.summary || cal.id!,
    primary: cal.primary || false,
  }));
}
