import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get single property with booking history
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

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        bookings: {
          orderBy: { scheduledDate: "desc" },
          take: 10,
          select: {
            id: true,
            scheduledDate: true,
            scheduledTime: true,
            status: true,
            totalPrice: true,
            service: { select: { name: true } },
            cleaner: { select: { firstName: true, lastName: true } },
          },
        },
        _count: { select: { bookings: true } },
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    if (property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ property });
  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json(
      { error: "Failed to fetch property" },
      { status: 500 }
    );
  }
}

// PUT - Update property
export async function PUT(
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

    const existing = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    if (existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      address,
      city,
      state,
      postalCode,
      country,
      latitude,
      longitude,
      size,
      rooms,
      bathrooms,
      notes,
      isDefault,
    } = body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.property.updateMany({
        where: { ownerId: session.user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const property = await prisma.property.update({
      where: { id },
      data: {
        name,
        address,
        city,
        state,
        postalCode,
        country,
        latitude,
        longitude,
        size,
        rooms,
        bathrooms,
        notes,
        isDefault,
      },
    });

    return NextResponse.json({ property });
  } catch (error) {
    console.error("Error updating property:", error);
    return NextResponse.json(
      { error: "Failed to update property" },
      { status: 500 }
    );
  }
}

// DELETE - Delete property
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.property.findUnique({
      where: { id },
      select: { ownerId: true, isDefault: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    if (existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.property.delete({ where: { id } });

    // If deleted property was default, make another one default
    if (existing.isDefault) {
      const firstProperty = await prisma.property.findFirst({
        where: { ownerId: session.user.id },
        orderBy: { createdAt: "asc" },
      });
      if (firstProperty) {
        await prisma.property.update({
          where: { id: firstProperty.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json(
      { error: "Failed to delete property" },
      { status: 500 }
    );
  }
}
