import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DemandSignalType } from "@prisma/client";

// Track demand signals from customer actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const session = await auth();

    const {
      signalType,
      professionId,
      searchQuery,
      city,
      state,
      country,
      postalCode,
      latitude,
      longitude,
      requestedDate,
      requestedTime,
      wasMatched,
      workerId,
      joinedWaitlist,
    } = body;

    // Validate signal type
    if (!signalType || !Object.values(DemandSignalType).includes(signalType)) {
      return NextResponse.json(
        { error: "Invalid signal type" },
        { status: 400 }
      );
    }

    // Create demand signal
    const demandSignal = await prisma.demandSignal.create({
      data: {
        signalType,
        professionId: professionId || null,
        searchQuery: searchQuery || null,
        city: city || null,
        state: state || null,
        country: country || null,
        postalCode: postalCode || null,
        latitude: latitude || null,
        longitude: longitude || null,
        requestedDate: requestedDate ? new Date(requestedDate) : null,
        requestedTime: requestedTime || null,
        customerId: session?.user?.id || null,
        wasMatched: wasMatched || false,
        matchedAt: wasMatched ? new Date() : null,
        workerId: workerId || null,
        joinedWaitlist: joinedWaitlist || false,
      },
    });

    return NextResponse.json({
      success: true,
      id: demandSignal.id,
    });
  } catch (error) {
    console.error("Error tracking demand:", error);
    return NextResponse.json(
      { error: "Failed to track demand signal" },
      { status: 500 }
    );
  }
}
