import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get messages with a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partnerId } = await params;
    const userId = session.user.id;

    // Verify partner exists
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        workerProfile: {
          select: {
            verified: true,
            averageRating: true,
          },
        },
      },
    });

    if (!partner) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all messages between these two users
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
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
        booking: {
          select: {
            id: true,
            service: { select: { name: true } },
            scheduledDate: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark unread messages from partner as read
    await prisma.message.updateMany({
      where: {
        senderId: partnerId,
        receiverId: userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ messages, partner });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
