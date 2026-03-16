import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get all smart locks for a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify property ownership
    const property = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const locks = await prisma.smartLock.findMany({
      where: { propertyId: id },
      include: {
        _count: {
          select: { accessCodes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ locks });
  } catch (error) {
    console.error("Error fetching smart locks:", error);
    return NextResponse.json(
      { error: "Failed to fetch smart locks" },
      { status: 500 }
    );
  }
}

// POST - Add a new smart lock to property
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, provider, deviceId, serialNumber } = body;

    if (!name || !provider) {
      return NextResponse.json(
        { error: "Name and provider are required" },
        { status: 400 }
      );
    }

    // Verify property ownership
    const property = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const lock = await prisma.smartLock.create({
      data: {
        propertyId: id,
        name,
        provider,
        deviceId,
        serialNumber,
      },
    });

    return NextResponse.json({ lock }, { status: 201 });
  } catch (error) {
    console.error("Error creating smart lock:", error);
    return NextResponse.json(
      { error: "Failed to create smart lock" },
      { status: 500 }
    );
  }
}
