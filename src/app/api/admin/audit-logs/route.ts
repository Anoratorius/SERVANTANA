import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { queryAuditLogs, getSecuritySummary, AuditAction, AuditSeverity } from "@/lib/audit-log";

// Get audit logs (admin only)
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action") as AuditAction | null;
  const severity = searchParams.get("severity") as AuditSeverity | null;
  const actorId = searchParams.get("actorId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const summary = searchParams.get("summary") === "true";

  // Return security summary if requested
  if (summary) {
    const days = parseInt(searchParams.get("days") || "7");
    const summaryData = await getSecuritySummary(days);
    return NextResponse.json(summaryData);
  }

  // Query logs
  const result = await queryAuditLogs({
    action: action || undefined,
    severity: severity || undefined,
    actorId: actorId || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    limit,
    offset,
  });

  return NextResponse.json({
    logs: result.logs,
    total: result.total,
    pagination: {
      limit,
      offset,
      hasMore: offset + result.logs.length < result.total,
    },
  });
}
