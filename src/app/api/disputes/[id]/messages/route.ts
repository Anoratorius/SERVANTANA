import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id },
    });

    if (!dispute) {
      return NextResponse.json(
        { error: "Dispute not found" },
        { status: 404 }
      );
    }

    // Check if dispute is still open
    if (dispute.status === "CLOSED" || dispute.status === "RESOLVED") {
      return NextResponse.json(
        { error: "Cannot add messages to a closed dispute" },
        { status: 400 }
      );
    }

    // Only customer, worker, or admin can send messages
    const isCustomer = dispute.customerId === session.user.id;
    const isCleaner = dispute.cleanerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isCustomer && !isCleaner && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message = await prisma.disputeMessage.create({
      data: {
        disputeId: id,
        senderId: session.user.id,
        content: content.trim(),
        isAdmin,
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
      },
    });

    // If admin replies and dispute is OPEN, move to IN_REVIEW
    if (isAdmin && dispute.status === "OPEN") {
      await prisma.dispute.update({
        where: { id },
        data: { status: "IN_REVIEW" },
      });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}

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

    const dispute = await prisma.dispute.findUnique({
      where: { id },
    });

    if (!dispute) {
      return NextResponse.json(
        { error: "Dispute not found" },
        { status: 404 }
      );
    }

    // Only customer, worker, or admin can view messages
    const isCustomer = dispute.customerId === session.user.id;
    const isCleaner = dispute.cleanerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isCustomer && !isCleaner && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const messages = await prisma.disputeMessage.findMany({
      where: { disputeId: id },
      orderBy: { createdAt: "asc" },
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
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
