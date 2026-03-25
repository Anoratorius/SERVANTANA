import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateWalletAddresses, getNextDerivationIndex } from "@/lib/crypto-wallets";

// Get cleaner's crypto wallets
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        cleanerProfile: {
          include: {
            cryptoWallets: true,
          },
        },
      },
    });

    if (!user || user.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Only cleaners can access wallets" },
        { status: 403 }
      );
    }

    if (!user.cleanerProfile) {
      return NextResponse.json(
        { error: "Worker profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      wallets: user.cleanerProfile.cryptoWallets,
    });
  } catch (error) {
    console.error("Error fetching wallets:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallets" },
      { status: 500 }
    );
  }
}

// Create crypto wallets for cleaner
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        cleanerProfile: {
          include: {
            cryptoWallets: true,
          },
        },
      },
    });

    if (!user || user.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Only workers can create wallets" },
        { status: 403 }
      );
    }

    if (!user.cleanerProfile) {
      return NextResponse.json(
        { error: "Worker profile not found. Please complete your profile first." },
        { status: 404 }
      );
    }

    // Check if wallets already exist
    if (user.cleanerProfile.cryptoWallets.length > 0) {
      return NextResponse.json({
        message: "Wallets already exist",
        wallets: user.cleanerProfile.cryptoWallets,
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
          cleanerProfileId: user.cleanerProfile.id,
          currency: "BTC",
          address: addresses.BTC,
          derivationIndex,
        },
      }),
      prisma.cryptoWallet.create({
        data: {
          cleanerProfileId: user.cleanerProfile.id,
          currency: "ETH",
          address: addresses.ETH,
          derivationIndex,
        },
      }),
      prisma.cryptoWallet.create({
        data: {
          cleanerProfileId: user.cleanerProfile.id,
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
