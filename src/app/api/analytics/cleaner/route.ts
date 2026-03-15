import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCleanerAnalytics } from "@/lib/analytics/aggregator";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "CLEANER") {
      return NextResponse.json(
        { error: "Only cleaners can access this" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";

    const analytics = await getCleanerAnalytics(session.user.id, period);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching cleaner analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
