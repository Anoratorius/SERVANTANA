import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createLiveStream,
  endLiveStream,
  getLiveStreamDetails,
  getPlaybackUrl,
} from "@/lib/streaming/mux";

/**
 * GET /api/bookings/[id]/stream
 * Get stream status and playback URL for a booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // Get booking with stream info
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        liveStream: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer or worker can view stream status
    const isCustomer = booking.customerId === session.user.id;
    const isWorker = booking.workerId === session.user.id;

    if (!isCustomer && !isWorker) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If no stream exists, return null
    if (!booking.liveStream) {
      return NextResponse.json({
        stream: null,
        hasConsent: false,
        canStream: booking.status === "IN_PROGRESS",
      });
    }

    const stream = booking.liveStream;

    // Get live status from Mux if stream has a Mux ID
    let muxStatus = null;
    if (stream.playbackId) {
      try {
        // Try to get status, but don't fail if Mux is unavailable
        const streamId = stream.streamKey?.split("_")[0]; // Extract stream ID from key
        if (streamId) {
          muxStatus = await getLiveStreamDetails(streamId);
        }
      } catch {
        // Mux status unavailable, use database status
      }
    }

    // Build response based on role
    const response: Record<string, unknown> = {
      stream: {
        id: stream.id,
        status: muxStatus?.status ?? stream.status,
        isLive: muxStatus?.isLive ?? stream.status === "LIVE",
        playbackUrl: stream.playbackId ? getPlaybackUrl(stream.playbackId) : null,
        startedAt: stream.startedAt,
        endedAt: stream.endedAt,
        viewerCount: stream.viewerCount,
        recordingEnabled: stream.recordingEnabled,
        recordingUrl: stream.recordingUrl,
        workerConsent: stream.workerConsent,
        customerConsent: stream.customerConsent,
      },
      hasConsent: stream.workerConsent && stream.customerConsent,
      canStream: booking.status === "IN_PROGRESS",
    };

    // Include stream key only for the worker
    if (isWorker && stream.streamKey) {
      response.streamKey = stream.streamKey;
      response.rtmpUrl = "rtmps://global-live.mux.com:443/app";
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching stream status:", error);
    return NextResponse.json(
      { error: "Failed to fetch stream status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings/[id]/stream
 * Start or stop stream (worker only)
 * Body: { action: 'start' | 'stop' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !["start", "stop"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'start' or 'stop'" },
        { status: 400 }
      );
    }

    // Get booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        liveStream: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only worker can start/stop stream
    if (booking.workerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the worker can control the stream" },
        { status: 403 }
      );
    }

    // Booking must be in progress to stream
    if (booking.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Stream can only be started when booking is in progress" },
        { status: 400 }
      );
    }

    if (action === "start") {
      // Check if both parties have consented
      if (booking.liveStream && !booking.liveStream.workerConsent) {
        return NextResponse.json(
          { error: "Worker consent required before streaming" },
          { status: 400 }
        );
      }

      if (booking.liveStream && !booking.liveStream.customerConsent) {
        return NextResponse.json(
          { error: "Customer consent required before streaming" },
          { status: 400 }
        );
      }

      // Create Mux live stream
      let muxStream;
      try {
        muxStream = await createLiveStream(bookingId);
      } catch (error) {
        console.error("Failed to create Mux stream:", error);
        return NextResponse.json(
          { error: "Failed to create live stream" },
          { status: 500 }
        );
      }

      // Create or update stream record
      const stream = await prisma.liveStream.upsert({
        where: { bookingId },
        create: {
          bookingId,
          workerId: booking.workerId,
          provider: "MUX",
          streamKey: muxStream.streamKey,
          playbackId: muxStream.playbackId,
          playbackUrl: getPlaybackUrl(muxStream.playbackId),
          status: "PREPARING",
          workerConsent: true, // Worker is starting, so they consent
          customerConsent: booking.liveStream?.customerConsent ?? false,
        },
        update: {
          streamKey: muxStream.streamKey,
          playbackId: muxStream.playbackId,
          playbackUrl: getPlaybackUrl(muxStream.playbackId),
          status: "PREPARING",
          startedAt: new Date(),
        },
      });

      return NextResponse.json({
        stream: {
          id: stream.id,
          status: stream.status,
          playbackUrl: stream.playbackUrl,
          streamKey: stream.streamKey,
          rtmpUrl: "rtmps://global-live.mux.com:443/app",
        },
        message: "Stream created. Connect via RTMP to start broadcasting.",
      });
    } else {
      // Stop stream
      if (!booking.liveStream) {
        return NextResponse.json(
          { error: "No active stream to stop" },
          { status: 400 }
        );
      }

      // End the Mux stream
      if (booking.liveStream.streamKey) {
        try {
          // Extract stream ID from stream key (format: streamId_streamKey)
          const parts = booking.liveStream.streamKey.split("_");
          if (parts.length > 0) {
            await endLiveStream(parts[0]);
          }
        } catch (error) {
          console.error("Failed to end Mux stream:", error);
          // Continue with local cleanup even if Mux fails
        }
      }

      // Calculate duration
      const duration = booking.liveStream.startedAt
        ? Math.floor(
            (Date.now() - booking.liveStream.startedAt.getTime()) / 1000
          )
        : null;

      // Update stream record
      const stream = await prisma.liveStream.update({
        where: { bookingId },
        data: {
          status: "ENDED",
          endedAt: new Date(),
          totalDuration: duration,
        },
      });

      return NextResponse.json({
        stream: {
          id: stream.id,
          status: stream.status,
          endedAt: stream.endedAt,
          totalDuration: stream.totalDuration,
        },
        message: "Stream ended successfully.",
      });
    }
  } catch (error) {
    console.error("Error managing stream:", error);
    return NextResponse.json(
      { error: "Failed to manage stream" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bookings/[id]/stream
 * Update stream status (e.g., mark as live when Mux confirms)
 * This endpoint is primarily for webhook updates
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const body = await request.json();
    const { status, viewerCount, recordingUrl, recordingAssetId } = body;

    // Get booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        liveStream: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only worker can update stream status
    if (booking.workerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the worker can update stream status" },
        { status: 403 }
      );
    }

    if (!booking.liveStream) {
      return NextResponse.json({ error: "No stream found" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (status && ["INACTIVE", "PREPARING", "LIVE", "ENDED", "ERROR"].includes(status)) {
      updateData.status = status;
      if (status === "LIVE" && !booking.liveStream.startedAt) {
        updateData.startedAt = new Date();
      }
    }

    if (typeof viewerCount === "number") {
      updateData.viewerCount = viewerCount;
    }

    if (recordingUrl) {
      updateData.recordingUrl = recordingUrl;
    }

    if (recordingAssetId) {
      updateData.recordingAssetId = recordingAssetId;
    }

    const stream = await prisma.liveStream.update({
      where: { bookingId },
      data: updateData,
    });

    return NextResponse.json({
      stream: {
        id: stream.id,
        status: stream.status,
        viewerCount: stream.viewerCount,
        recordingUrl: stream.recordingUrl,
      },
    });
  } catch (error) {
    console.error("Error updating stream:", error);
    return NextResponse.json(
      { error: "Failed to update stream" },
      { status: 500 }
    );
  }
}
