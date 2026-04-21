import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitNewMessage } from "@/lib/message-events";

// GET - Fetch messages for a completed booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        customerId: true,
        workerId: true,
        status: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer or worker can view chat
    if (
      booking.customerId !== session.user.id &&
      booking.workerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Chat only available for completed bookings
    if (booking.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Chat is only available after booking is completed" },
        { status: 400 }
      );
    }

    // Fetch messages for this booking
    const messages = await prisma.message.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        senderId: true,
        content: true,
        read: true,
        readAt: true,
        createdAt: true,
        sender: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Mark unread messages as read
    const unreadMessageIds = messages
      .filter((m) => !m.read && m.senderId !== session.user.id)
      .map((m) => m.id);

    if (unreadMessageIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadMessageIds } },
        data: { read: true, readAt: new Date() },
      });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 }
    );
  }
}

// POST - Send a new message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        customerId: true,
        workerId: true,
        status: true,
        service: {
          select: { name: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only customer or worker can send messages
    if (
      booking.customerId !== session.user.id &&
      booking.workerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Chat only available for completed bookings
    if (booking.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Chat is only available after booking is completed" },
        { status: 400 }
      );
    }

    // Determine receiver (the other party)
    const receiverId =
      session.user.id === booking.customerId
        ? booking.workerId
        : booking.customerId;

    // Create message with full details for SSE event
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        bookingId: id,
        content: content.trim(),
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        content: true,
        read: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Emit real-time event to receiver (distributed via Redis)
    await emitNewMessage(receiverId, {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      senderId: message.senderId,
      receiverId: message.receiverId,
      read: message.read,
      sender: message.sender,
      receiver: message.receiver,
      booking: {
        id: booking.id,
        service: { name: booking.service?.name || "Service" },
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
