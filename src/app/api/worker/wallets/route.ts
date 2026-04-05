import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateWalletAddresses, getNextDerivationIndex } from "@/lib/crypto-wallets";

// Get worker's crypto wallets
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        workerProfile: {
          include: {
            cryptoWallets: true,
          },
        },
      },
    });

    if (!user || user.role !== "WORKER") {
      return NextResponse.json(
        { error: "Only workers can access wallets" },
        { status: 403 }
      );
    }

    if (!user.workerProfile) {
      return NextResponse.json(
        { error: "Worker profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      wallets: user.workerProfile.cryptoWallets,
    });
  } catch (error) {
    console.error("Error fetching wallets:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallets" },
      { status: 500 }
    );
  }
}

// Create crypto wallets for worker
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        workerProfile: {
          include: {
            cryptoWallets: true,
          },
        },
      },
    });

    if (!user || user.role !== "WORKER") {
      return NextResponse.json(
        { error: "Only workers can create wallets" },
        { status: 403 }
      );
    }

    if (!user.workerProfile) {
      return NextResponse.json(
        { error: "Worker profile not found. Please complete your profile first." },
        { status: 404 }
      );
    }

    // Check if wallets already exist
    if (user.workerProfile.cryptoWallets.length > 0) {
      return NextResponse.json({
        message: "Wallets already exist",
        wallets: user.workerProfile.cryptoWallets,
      });
    }

    // Get next derivation index
    const derivationIndex = await getNextDerivationIndex(prisma);

    // Generate wallet addresses
    const addresses = generateWalletAddresses(derivationIndex);

    // Create wallets in database
    const wallets = await prisma.$transaction([
      prisma.cryptoWallet.create({
        data: {
          workerProfileId: user.workerProfile.id,
          currency: "BTC",
          address: addresses.BTC,
          derivationIndex,
        },
      }),
      prisma.cryptoWallet.create({
        data: {
          workerProfileId: user.workerProfile.id,
          currency: "ETH",
          address: addresses.ETH,
          derivationIndex,
        },
      }),
      prisma.cryptoWallet.create({
        data: {
          workerProfileId: user.workerProfile.id,
          currency: "LTC",
          address: addresses.LTC,
          derivationIndex,
        },
      }),
    ]);

    return NextResponse.json({
      message: "Wallets created successfully",
      wallets,
    });
  } catch (error) {
    console.error("Error creating wallets:", error);
    return NextResponse.json(
      { error: "Failed to create wallets" },
      { status: 500 }
    );
  }
}
