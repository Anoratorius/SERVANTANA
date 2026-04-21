import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Generate a random 6-digit access code
function generateAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET - Get access codes for a lock
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lockId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, lockId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Verify property ownership
    const property = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const where: Record<string, unknown> = { lockId };
    if (status) {
      where.status = status;
    }

    const accessCodes = await prisma.smartLockAccess.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accessCodes });
  } catch (error) {
    console.error("Error fetching access codes:", error);
    return NextResponse.json(
      { error: "Failed to fetch access codes" },
      { status: 500 }
    );
  }
}

// POST - Create a new access code
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lockId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, lockId } = await params;
    const body = await request.json();
    const {
      bookingId,
      workerId,
      accessType = "TEMPORARY",
      validFrom,
      validUntil,
      maxUsage,
      customCode,
    } = body;

    // Verify property ownership
    const property = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify lock exists
    const lock = await prisma.smartLock.findUnique({
      where: { id: lockId, propertyId: id },
    });

    if (!lock) {
      return NextResponse.json({ error: "Lock not found" }, { status: 404 });
    }

    // Generate or use custom code
    const accessCode = customCode || generateAccessCode();

    // Create access code
    const access = await prisma.smartLockAccess.create({
      data: {
        lockId,
        bookingId,
        workerId,
        accessType,
        accessCode,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        maxUsage,
      },
    });

    return NextResponse.json({ access }, { status: 201 });
  } catch (error) {
    console.error("Error creating access code:", error);
    return NextResponse.json(
      { error: "Failed to create access code" },
      { status: 500 }
    );
  }
}

// DELETE - Revoke an access code
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lockId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, lockId } = await params;
    const { searchParams } = new URL(request.url);
    const accessId = searchParams.get("accessId");

    if (!accessId) {
      return NextResponse.json(
        { error: "Access ID is required" },
        { status: 400 }
      );
    }

    // Verify property ownership
    const property = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.smartLockAccess.update({
      where: { id: accessId, lockId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedReason: "Manually revoked by owner",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking access code:", error);
    return NextResponse.json(
      { error: "Failed to revoke access code" },
      { status: 500 }
    );
  }
}
