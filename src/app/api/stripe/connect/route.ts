import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createConnectAccount,
  createConnectOnboardingLink,
  getConnectAccountStatus,
  createConnectLoginLink,
} from "@/lib/stripe";

// GET: Get cleaner's Stripe Connect status
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { workerProfile: true },
    });

    if (!user || user.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Only workers can access Stripe Connect" },
        { status: 403 }
      );
    }

    if (!user.workerProfile) {
      return NextResponse.json(
        { error: "Worker profile not found" },
        { status: 404 }
      );
    }

    const status = await getConnectAccountStatus(
      user.workerProfile.stripeAccountId
    );

    // If account is complete, get dashboard link
    let dashboardUrl = null;
    if (status === "complete" && user.workerProfile.stripeAccountId) {
      try {
        const loginLink = await createConnectLoginLink(
          user.workerProfile.stripeAccountId
        );
        dashboardUrl = loginLink.url;
      } catch {
        // Login link creation may fail for some account states
      }
    }

    return NextResponse.json({
      status,
      stripeAccountId: user.workerProfile.stripeAccountId,
      onboardingComplete: user.workerProfile.stripeOnboardingComplete,
      dashboardUrl,
    });
  } catch (error) {
    console.error("Error getting Stripe Connect status:", error);
    return NextResponse.json(
      { error: "Failed to get Stripe Connect status" },
      { status: 500 }
    );
  }
}

// POST: Create Stripe Connect account and return onboarding link
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { workerProfile: true },
    });

    if (!user || user.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Only workers can connect with Stripe" },
        { status: 403 }
      );
    }

    if (!user.workerProfile) {
      return NextResponse.json(
        { error: "Please complete your worker profile first" },
        { status: 400 }
      );
    }

    // Get country from request body or default to cleaner's country
    const body = await request.json().catch(() => ({}));
    const country = body.country || user.workerProfile.country || "DE";

    let stripeAccountId = user.workerProfile.stripeAccountId;

    // Create new Stripe Connect account if not exists
    if (!stripeAccountId) {
      const account = await createConnectAccount(user.email, country);
      stripeAccountId = account.id;

      // Save account ID to database
      await prisma.workerProfile.update({
        where: { id: user.workerProfile.id },
        data: { stripeAccountId },
      });
    }

    // Generate onboarding link
    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL;
    const refreshUrl = `${origin}/dashboard/settings?stripe=refresh`;
    const returnUrl = `${origin}/dashboard/settings?stripe=success`;

    const accountLink = await createConnectOnboardingLink(
      stripeAccountId,
      refreshUrl,
      returnUrl
    );

    return NextResponse.json({
      url: accountLink.url,
      stripeAccountId,
    });
  } catch (error) {
    console.error("Error creating Stripe Connect account:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe Connect account" },
      { status: 500 }
    );
  }
}

// PUT: Refresh onboarding link or update account status
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { workerProfile: true },
    });

    if (!user?.workerProfile?.stripeAccountId) {
      return NextResponse.json(
        { error: "No Stripe account found" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || "refresh";

    if (action === "refresh") {
      // Generate new onboarding link
      const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL;
      const refreshUrl = `${origin}/dashboard/settings?stripe=refresh`;
      const returnUrl = `${origin}/dashboard/settings?stripe=success`;

      const accountLink = await createConnectOnboardingLink(
        user.workerProfile.stripeAccountId,
        refreshUrl,
        returnUrl
      );

      return NextResponse.json({ url: accountLink.url });
    }

    if (action === "check") {
      // Check and update account status
      const status = await getConnectAccountStatus(
        user.workerProfile.stripeAccountId
      );

      if (status === "complete" && !user.workerProfile.stripeOnboardingComplete) {
        await prisma.workerProfile.update({
          where: { id: user.workerProfile.id },
          data: { stripeOnboardingComplete: true },
        });
      }

      return NextResponse.json({
        status,
        onboardingComplete: status === "complete",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating Stripe Connect:", error);
    return NextResponse.json(
      { error: "Failed to update Stripe Connect" },
      { status: 500 }
    );
  }
}
