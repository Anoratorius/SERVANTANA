import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get payout history
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a worker
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "WORKER") {
      return NextResponse.json(
        { error: "Only workers can view payouts" },
        { status: 403 }
      );
    }

    const payouts = await prisma.payout.findMany({
      where: { workerId: session.user.id },
      include: {
        earnings: {
          select: {
            id: true,
            amount: true,
            booking: {
              select: {
                scheduledDate: true,
                service: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ payouts });
  } catch (error) {
    console.error("Error fetching payouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch payouts" },
      { status: 500 }
    );
  }
}

// Request a payout
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a worker
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "WORKER") {
      return NextResponse.json(
        { error: "Only workers can request payouts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { payoutMethod } = body;

    // Get available earnings
    const availableEarnings = await prisma.earning.findMany({
      where: {
        workerId: session.user.id,
        status: "AVAILABLE",
        payoutId: null,
      },
    });

    if (availableEarnings.length === 0) {
      return NextResponse.json(
        { error: "No available earnings to pay out" },
        { status: 400 }
      );
    }

    const totalAmount = availableEarnings.reduce((sum, e) => sum + e.amount, 0);

    // Minimum payout threshold
    const MIN_PAYOUT = 10;
    if (totalAmount < MIN_PAYOUT) {
      return NextResponse.json(
        { error: `Minimum payout amount is $${MIN_PAYOUT}` },
        { status: 400 }
      );
    }

    // Create payout and update earnings in a transaction
    const payout = await prisma.$transaction(async (tx) => {
      const newPayout = await tx.payout.create({
        data: {
          workerId: session.user.id,
          amount: totalAmount,
          currency: "USD",
          status: "PENDING",
          payoutMethod: payoutMethod || "bank_transfer",
          earnings: {
            connect: availableEarnings.map((e) => ({ id: e.id })),
          },
        },
        include: {
          earnings: {
            select: {
              id: true,
              amount: true,
            },
          },
        },
      });

      await tx.earning.updateMany({
        where: {
          id: { in: availableEarnings.map((e) => e.id) },
        },
        data: {
          status: "PAID_OUT",
        },
      });

      return newPayout;
    });

    return NextResponse.json({
      message: "Payout requested successfully",
      payout,
    });
  } catch (error) {
    console.error("Error requesting payout:", error);
    return NextResponse.json(
      { error: "Failed to request payout" },
      { status: 500 }
    );
  }
}
