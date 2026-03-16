import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get a specific smart lock with access codes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lockId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, lockId } = await params;

    // Verify property ownership
    const property = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const lock = await prisma.smartLock.findUnique({
      where: { id: lockId, propertyId: id },
      include: {
        accessCodes: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!lock) {
      return NextResponse.json({ error: "Lock not found" }, { status: 404 });
    }

    return NextResponse.json({ lock });
  } catch (error) {
    console.error("Error fetching smart lock:", error);
    return NextResponse.json(
      { error: "Failed to fetch smart lock" },
      { status: 500 }
    );
  }
}

// PATCH - Update a smart lock
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lockId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, lockId } = await params;
    const body = await request.json();
    const { name, isActive, deviceId, serialNumber, batteryLevel } = body;

    // Verify property ownership
    const property = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const lock = await prisma.smartLock.update({
      where: { id: lockId, propertyId: id },
      data: {
        name,
        isActive,
        deviceId,
        serialNumber,
        batteryLevel,
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({ lock });
  } catch (error) {
    console.error("Error updating smart lock:", error);
    return NextResponse.json(
      { error: "Failed to update smart lock" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a smart lock
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lockId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, lockId } = await params;

    // Verify property ownership
    const property = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.smartLock.delete({
      where: { id: lockId, propertyId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting smart lock:", error);
    return NextResponse.json(
      { error: "Failed to delete smart lock" },
      { status: 500 }
    );
  }
}
