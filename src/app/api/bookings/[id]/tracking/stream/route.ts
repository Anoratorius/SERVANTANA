/**
 * Real-Time Tracking SSE Endpoint
 * Streams location updates to customers tracking their worker
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  trackingEvents,
  fetchTrackingEventsFromRedis,
  isDistributedTrackingAvailable,
  TrackingEventData,
} from "@/lib/tracking-events";

export const dynamic = "force-dynamic";

// Poll interval for Redis events (ms)
const REDIS_POLL_INTERVAL = 1000; // 1 second for more responsive tracking

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: bookingId } = await params;

  // Verify user has access to this booking
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      customerId: true,
      workerId: true,
      status: true,
    },
  });

  if (!booking) {
    return new Response("Booking not found", { status: 404 });
  }

  // Only customer or worker can track
  if (
    booking.customerId !== session.user.id &&
    booking.workerId !== session.user.id
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let lastEventTimestamp = Date.now();
      let isActive = true;

      // Send initial connection message
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "connected",
            bookingId,
            distributed: isDistributedTrackingAvailable(),
          })}\n\n`
        )
      );

      // Helper to send event to client
      function sendEvent(event: TrackingEventData) {
        if (!isActive) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          if (event.timestamp > lastEventTimestamp) {
            lastEventTimestamp = event.timestamp;
          }
        } catch {
          isActive = false;
        }
      }

      // Subscribe to local tracking events
      const unsubscribe = trackingEvents.subscribe(bookingId, sendEvent);

      // Poll Redis for distributed events
      let redisPollInterval: ReturnType<typeof setInterval> | null = null;

      if (isDistributedTrackingAvailable()) {
        redisPollInterval = setInterval(async () => {
          if (!isActive) {
            if (redisPollInterval) clearInterval(redisPollInterval);
            return;
          }

          try {
            const events = await fetchTrackingEventsFromRedis(
              bookingId,
              lastEventTimestamp
            );
            for (const event of events) {
              sendEvent(event);
            }
          } catch (error) {
            console.error("[TRACKING-SSE] Redis poll error:", error);
          }
        }, REDIS_POLL_INTERVAL);
      }

      // Heartbeat every 15 seconds (tracking needs faster heartbeat)
      const heartbeatInterval = setInterval(() => {
        if (!isActive) {
          clearInterval(heartbeatInterval);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          isActive = false;
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
        isActive = false;
        unsubscribe();
        clearInterval(heartbeatInterval);
        if (redisPollInterval) clearInterval(redisPollInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
