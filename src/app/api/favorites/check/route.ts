import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ isFavorite: false });
    }

    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("workerId");

    if (!workerId) {
      return NextResponse.json(
        { error: "workerId is required" },
        { status: 400 }
      );
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        customerId_workerId: {
          customerId: session.user.id,
          workerId,
        },
      },
    });

    return NextResponse.json({ isFavorite: !!favorite });
  } catch (error) {
    console.error("Error checking favorite:", error);
    return NextResponse.json({ isFavorite: false });
  }
}
