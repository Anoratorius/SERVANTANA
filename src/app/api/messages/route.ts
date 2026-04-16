import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { emitNewMessage } from "@/lib/message-events";
import { applyRateLimit } from "@/lib/rate-limit";
import { sendNotification } from "@/lib/notifications";

const sendMessageSchema = z.object({
  receiverId: z.string().min(1, "Receiver ID is required"),
  content: z.string().min(1, "Message content is required").max(2000),
  bookingId: z.string().optional(),
});

// Get conversations list
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all unique conversations (grouped by the other user)
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
        booking: {
          select: {
            id: true,
            service: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group messages by conversation partner
    const conversationsMap = new Map<
      string,
      {
        partnerId: string;
        partner: {
          id: string;
          firstName: string;
          lastName: string;
          avatar: string | null;
          role: string;
        };
        lastMessage: {
          id: string;
          content: string;
          createdAt: Date;
          senderId: string;
          read: boolean;
        };
        unreadCount: number;
        booking: { id: string; service: { name: string } | null } | null;
      }
    >();

    for (const message of messages) {
      const partnerId =
        message.senderId === userId ? message.receiverId : message.senderId;
      const partner =
        message.senderId === userId ? message.receiver : message.sender;

      if (!conversationsMap.has(partnerId)) {
        // Count unread messages from this partner
        const unreadCount = messages.filter(
          (m) => m.senderId === partnerId && m.receiverId === userId && !m.read
        ).length;

        conversationsMap.set(partnerId, {
          partnerId,
          partner,
          lastMessage: {
            id: message.id,
            content: message.content,
            createdAt: message.createdAt,
            senderId: message.senderId,
            read: message.read,
          },
          unreadCount,
          booking: message.booking,
        });
      }
    }

    const conversations = Array.from(conversationsMap.values());

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// Send a new message
export async function POST(request: NextRequest) {
  // Rate limiting: 30 messages per minute
  const rateLimited = applyRateLimit(request, "sendMessage");
  if (rateLimited) return rateLimited;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = sendMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { receiverId, content, bookingId } = validationResult.data;

    // Can't message yourself
    if (receiverId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot send message to yourself" },
        { status: 400 }
      );
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
    }

    // If bookingId provided, verify it belongs to these users
    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      const isParticipant =
        (booking.customerId === session.user.id && booking.cleanerId === receiverId) ||
        (booking.cleanerId === session.user.id && booking.customerId === receiverId);

      if (!isParticipant) {
        return NextResponse.json(
          { error: "You are not a participant of this booking" },
          { status: 403 }
        );
      }
    }

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content,
        bookingId: bookingId || null,
      },
      include: {
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

    // Emit real-time event to the receiver
    emitNewMessage(receiverId, {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      senderId: message.senderId,
      receiverId: message.receiverId,
      read: message.read,
      sender: message.sender,
      receiver: message.receiver,
    });

    // Send push notification to receiver
    const senderName = `${message.sender.firstName} ${message.sender.lastName}`;
    sendNotification(receiverId, "MESSAGE_RECEIVED", {
      senderName,
    }, {
      actionUrl: `/messages/${session.user.id}`,
      forceChannels: ["PUSH"], // Messages should only trigger push, not email
    }).catch(console.error);

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
