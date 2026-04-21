/**
 * Calendar Sync Service
 * Syncs bookings with external calendars (Google/Outlook)
 */

import { prisma } from "@/lib/prisma";
import {
  getGoogleCalendarClient,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  refreshGoogleToken,
  CalendarEventData,
} from "./google";
import {
  createOutlookCalendarEvent,
  updateOutlookCalendarEvent,
  deleteOutlookCalendarEvent,
  refreshOutlookToken,
} from "./outlook";

interface SyncResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

async function ensureValidToken(connectionId: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
}> {
  const connection = await prisma.calendarConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new Error("Calendar connection not found");
  }

  // Check if token is expired (with 5 min buffer)
  const now = new Date();
  const expiresAt = connection.tokenExpiresAt;
  const isExpired = expiresAt && now.getTime() > expiresAt.getTime() - 5 * 60 * 1000;

  if (isExpired && connection.refreshToken) {
    try {
      let newTokens;

      if (connection.provider === "google") {
        newTokens = await refreshGoogleToken(connection.refreshToken);
        await prisma.calendarConnection.update({
          where: { id: connectionId },
          data: {
            accessToken: newTokens.accessToken,
            tokenExpiresAt: newTokens.expiresAt,
          },
        });
        return { accessToken: newTokens.accessToken, refreshToken: connection.refreshToken };
      } else if (connection.provider === "outlook") {
        newTokens = await refreshOutlookToken(connection.refreshToken);
        await prisma.calendarConnection.update({
          where: { id: connectionId },
          data: {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            tokenExpiresAt: newTokens.expiresAt,
          },
        });
        return { accessToken: newTokens.accessToken, refreshToken: newTokens.refreshToken };
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw new Error("Failed to refresh calendar token");
    }
  }

  return { accessToken: connection.accessToken, refreshToken: connection.refreshToken };
}

export async function syncBookingToCalendar(
  bookingId: string,
  userId: string
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  // Get all active calendar connections for user
  const connections = await prisma.calendarConnection.findMany({
    where: { userId, syncEnabled: true },
  });

  if (connections.length === 0) {
    return results;
  }

  // Get booking details
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      customer: { select: { firstName: true, lastName: true } },
      worker: { select: { firstName: true, lastName: true } },
    },
  });

  if (!booking) {
    return [{ success: false, error: "Booking not found" }];
  }

  // Parse scheduled time
  const [hours, minutes] = booking.scheduledTime.split(":").map(Number);
  const startTime = new Date(booking.scheduledDate);
  startTime.setHours(hours, minutes, 0, 0);

  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + booking.duration);

  const serviceName = booking.service?.name || "Cleaning Service";
  const eventData: CalendarEventData = {
    title: `${serviceName} - Servantana`,
    description: `Booking with ${booking.customer.firstName} ${booking.customer.lastName}\nService: ${serviceName}\nPrice: $${booking.totalPrice}`,
    startTime,
    endTime,
    location: booking.address || undefined,
  };

  for (const connection of connections) {
    try {
      const { accessToken, refreshToken } = await ensureValidToken(connection.id);

      let externalEventId: string;

      // Check if event already exists
      const existingEvent = await prisma.calendarEvent.findFirst({
        where: { connectionId: connection.id, bookingId },
      });

      if (existingEvent) {
        // Update existing event
        if (connection.provider === "google") {
          const calendar = await getGoogleCalendarClient(accessToken, refreshToken || undefined);
          await updateGoogleCalendarEvent(
            calendar,
            connection.calendarId || "primary",
            existingEvent.externalEventId,
            eventData
          );
          externalEventId = existingEvent.externalEventId;
        } else {
          await updateOutlookCalendarEvent(
            accessToken,
            existingEvent.externalEventId,
            eventData
          );
          externalEventId = existingEvent.externalEventId;
        }

        await prisma.calendarEvent.update({
          where: { id: existingEvent.id },
          data: { lastSyncAt: new Date() },
        });
      } else {
        // Create new event
        if (connection.provider === "google") {
          const calendar = await getGoogleCalendarClient(accessToken, refreshToken || undefined);
          externalEventId = await createGoogleCalendarEvent(
            calendar,
            connection.calendarId || "primary",
            eventData
          );
        } else {
          externalEventId = await createOutlookCalendarEvent(accessToken, eventData);
        }

        await prisma.calendarEvent.create({
          data: {
            connectionId: connection.id,
            bookingId,
            externalEventId,
            title: eventData.title,
            description: eventData.description,
            startTime,
            endTime,
            location: booking.address,
          },
        });
      }

      // Update last sync time
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date() },
      });

      results.push({ success: true, eventId: externalEventId });
    } catch (error) {
      console.error(`Error syncing to ${connection.provider}:`, error);
      results.push({
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      });
    }
  }

  return results;
}

export async function deleteBookingFromCalendar(
  bookingId: string,
  userId: string
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  // Get all calendar events for this booking
  const events = await prisma.calendarEvent.findMany({
    where: { bookingId },
    include: { connection: true },
  });

  for (const event of events) {
    if (event.connection.userId !== userId) continue;

    try {
      const { accessToken, refreshToken } = await ensureValidToken(event.connectionId);

      if (event.connection.provider === "google") {
        const calendar = await getGoogleCalendarClient(accessToken, refreshToken || undefined);
        await deleteGoogleCalendarEvent(
          calendar,
          event.connection.calendarId || "primary",
          event.externalEventId
        );
      } else {
        await deleteOutlookCalendarEvent(accessToken, event.externalEventId);
      }

      await prisma.calendarEvent.delete({ where: { id: event.id } });

      results.push({ success: true, eventId: event.externalEventId });
    } catch (error) {
      console.error(`Error deleting from ${event.connection.provider}:`, error);
      results.push({
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      });
    }
  }

  return results;
}
