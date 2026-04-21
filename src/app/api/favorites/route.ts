import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await prisma.favorite.findMany({
      where: { customerId: session.user.id },
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            workerProfile: {
              select: {
                hourlyRate: true,
                averageRating: true,
                city: true,
                verified: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workerId } = body;

    if (!workerId) {
      return NextResponse.json(
        { error: "workerId is required" },
        { status: 400 }
      );
    }

    // Verify worker exists
    const targetWorker = await prisma.user.findUnique({
      where: { id: workerId, role: "WORKER" },
    });

    if (!targetWorker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        customerId_workerId: {
          customerId: session.user.id,
          workerId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already in favorites" },
        { status: 400 }
      );
    }

    const favorite = await prisma.favorite.create({
      data: {
        customerId: session.user.id,
        workerId,
      },
    });

    return NextResponse.json({ favorite }, { status: 201 });
  } catch (error) {
    console.error("Error adding favorite:", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("workerId");

    if (!workerId) {
      return NextResponse.json(
        { error: "workerId is required" },
        { status: 400 }
      );
    }

    await prisma.favorite.deleteMany({
      where: {
        customerId: session.user.id,
        workerId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
