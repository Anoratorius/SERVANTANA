import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List user's properties
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const properties = await prisma.property.findMany({
      where: { ownerId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    return NextResponse.json({ properties });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}

// POST - Create a new property
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
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

    if (!name || !address) {
      return NextResponse.json(
        { error: "Name and address are required" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.property.updateMany({
        where: { ownerId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if this is the first property (make it default)
    const existingCount = await prisma.property.count({
      where: { ownerId: session.user.id },
    });

    const property = await prisma.property.create({
      data: {
        ownerId: session.user.id,
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
        isDefault: isDefault || existingCount === 0,
      },
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error("Error creating property:", error);
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 }
    );
  }
}
