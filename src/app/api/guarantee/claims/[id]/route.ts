import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get a specific claim
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const claim = await prisma.guaranteeClaim.findFirst({
      where: {
        id,
        OR: [
          { customerId: session.user.id },
          { cleanerId: session.user.id },
        ],
      },
      include: {
        booking: {
          select: {
            id: true,
            scheduledDate: true,
            scheduledTime: true,
            totalPrice: true,
            address: true,
            city: true,
            service: {
              select: { name: true },
            },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        cleaner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    return NextResponse.json(claim);
  } catch (error) {
    console.error("Error fetching claim:", error);
    return NextResponse.json({ error: "Failed to fetch claim" }, { status: 500 });
  }
}
