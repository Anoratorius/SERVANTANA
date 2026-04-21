import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { subDays, format, startOfDay, endOfDay } from "date-fns";

// Get security and fraud analytics for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const since = subDays(new Date(), days);

    // Fraud signals overview
    const [
      totalFraudSignals,
      fraudSignalsInPeriod,
      resolvedSignals,
      pendingSignals,
    ] = await Promise.all([
      prisma.fraudSignal.count(),
      prisma.fraudSignal.count({ where: { createdAt: { gte: since } } }),
      prisma.fraudSignal.count({ where: { status: { in: ["RESOLVED", "DISMISSED"] } } }),
      prisma.fraudSignal.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
    ]);

    // Fraud signals by type
    const fraudByType = await prisma.fraudSignal.groupBy({
      by: ["signalType"],
      where: { createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { signalType: "desc" } },
    });

    // Fraud signals by severity
    const fraudBySeverity = await prisma.fraudSignal.groupBy({
      by: ["severity"],
      where: { createdAt: { gte: since } },
      _count: true,
    });

    // Fraud trend over time
    const fraudTrend: { date: string; count: number; resolved: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = startOfDay(subDays(new Date(), i));
      const dayEnd = endOfDay(subDays(new Date(), i));

      const [count, resolved] = await Promise.all([
        prisma.fraudSignal.count({
          where: { createdAt: { gte: dayStart, lte: dayEnd } },
        }),
        prisma.fraudSignal.count({
          where: { reviewedAt: { gte: dayStart, lte: dayEnd }, status: { in: ["RESOLVED", "DISMISSED"] } },
        }),
      ]);

      fraudTrend.push({
        date: format(dayStart, "yyyy-MM-dd"),
        count,
        resolved,
      });
    }

    // Recent unresolved fraud signals
    const recentFraudSignals = await prisma.fraudSignal.findMany({
      where: { status: { in: ["OPEN", "INVESTIGATING"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
          },
        },
      },
    });

    // Suspended/banned users
    const [suspendedUsers, bannedUsers] = await Promise.all([
      prisma.user.findMany({
        where: { status: "SUSPENDED" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          suspendedUntil: true,
          suspendedReason: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.user.findMany({
        where: { status: "BANNED" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          suspendedReason: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
    ]);

    // IP analysis from events
    const suspiciousIPs = await prisma.userEvent.groupBy({
      by: ["ipAddress", "ipType"],
      where: {
        createdAt: { gte: since },
        ipType: { in: ["proxy", "datacenter"] },
      },
      _count: true,
      orderBy: { _count: { ipAddress: "desc" } },
      take: 50,
    });

    // Users with multiple IPs (potential account sharing or suspicious activity)
    const multiIPUsers = await prisma.$queryRaw<Array<{ userId: string; ipCount: number }>>`
      SELECT "userId", COUNT(DISTINCT "ipAddress") as "ipCount"
      FROM "UserEvent"
      WHERE "createdAt" >= ${since}
        AND "userId" IS NOT NULL
        AND "ipAddress" IS NOT NULL
      GROUP BY "userId"
      HAVING COUNT(DISTINCT "ipAddress") > 5
      ORDER BY "ipCount" DESC
      LIMIT 50
    `;

    // Get user details for multi-IP users
    const multiIPUserIds = multiIPUsers.map(u => u.userId);
    const multiIPUserDetails = await prisma.user.findMany({
      where: { id: { in: multiIPUserIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
      },
    });
    const userMap = new Map(multiIPUserDetails.map(u => [u.id, u]));

    // Failed payment attempts
    const failedPayments = await prisma.payment.count({
      where: { status: "FAILED", createdAt: { gte: since } },
    });

    // High-frequency users (potential abuse)
    const highFrequencyUsers = await prisma.userEvent.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: since },
        userId: { not: null },
      },
      _count: true,
      having: { userId: { _count: { gt: 1000 } } },
      orderBy: { _count: { userId: "desc" } },
      take: 20,
    });

    // Get details for high-frequency users
    const highFreqUserIds = highFrequencyUsers.map(u => u.userId).filter(Boolean) as string[];
    const highFreqUserDetails = await prisma.user.findMany({
      where: { id: { in: highFreqUserIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
      },
    });
    const highFreqUserMap = new Map(highFreqUserDetails.map(u => [u.id, u]));

    // Review analysis (potential fake reviews)
    const suspiciousReviews = await prisma.review.findMany({
      where: {
        createdAt: { gte: since },
        OR: [
          // Very short reviews with 5 stars (potential fake positive)
          { rating: 5, comment: { not: null } },
          // Very negative reviews from new accounts
          { rating: 1 },
        ],
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
        reviewee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Filter to actually suspicious reviews (very short 5-star or 1-star from new users)
    const flaggedReviews = suspiciousReviews.filter(review => {
      const isShortPositive = review.rating === 5 && review.comment && review.comment.length < 20;
      const isNewUserNegative = review.rating === 1 &&
        review.reviewer &&
        new Date(review.reviewer.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
      return isShortPositive || isNewUserNegative;
    });

    // Booking cancellation patterns (high cancellation = potential abuse)
    const highCancellationUsers = await prisma.booking.groupBy({
      by: ["customerId"],
      where: {
        createdAt: { gte: since },
        status: "CANCELLED",
      },
      _count: true,
      having: { customerId: { _count: { gt: 3 } } },
      orderBy: { _count: { customerId: "desc" } },
      take: 20,
    });

    // Get details for high cancellation users
    const cancelUserIds = highCancellationUsers.map(u => u.customerId);
    const cancelUserDetails = await prisma.user.findMany({
      where: { id: { in: cancelUserIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
      },
    });
    const cancelUserMap = new Map(cancelUserDetails.map(u => [u.id, u]));

    // Security metrics
    const securityMetrics = {
      fraudSignalsTotal: totalFraudSignals,
      fraudSignalsInPeriod,
      resolvedSignals,
      pendingSignals,
      resolutionRate: totalFraudSignals > 0
        ? Math.round((resolvedSignals / totalFraudSignals) * 100)
        : 0,
      suspendedUsersCount: suspendedUsers.length,
      bannedUsersCount: bannedUsers.length,
      suspiciousIPsCount: suspiciousIPs.length,
      failedPaymentsCount: failedPayments,
    };

    return NextResponse.json({
      overview: securityMetrics,
      fraudByType: fraudByType.map(f => ({
        type: f.signalType,
        count: f._count,
      })),
      fraudBySeverity: fraudBySeverity.map(f => ({
        severity: f.severity,
        count: f._count,
      })),
      fraudTrend,
      recentFraudSignals: recentFraudSignals.map(signal => ({
        id: signal.id,
        type: signal.signalType,
        severity: signal.severity,
        description: signal.description,
        confidence: signal.riskScore / 100, // Convert 0-100 to 0-1
        user: signal.user ? {
          id: signal.user.id,
          name: `${signal.user.firstName} ${signal.user.lastName}`,
          email: signal.user.email,
          status: signal.user.status,
        } : null,
        metadata: signal.details,
        createdAt: signal.createdAt,
      })),
      suspendedUsers: suspendedUsers.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        reason: u.suspendedReason,
        until: u.suspendedUntil,
        updatedAt: u.updatedAt,
      })),
      bannedUsers: bannedUsers.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        reason: u.suspendedReason,
        bannedAt: u.updatedAt,
      })),
      suspiciousIPs: suspiciousIPs.map(ip => ({
        ip: ip.ipAddress,
        type: ip.ipType,
        eventCount: ip._count,
      })),
      multiIPUsers: multiIPUsers.map(u => ({
        user: userMap.get(u.userId),
        ipCount: Number(u.ipCount),
      })),
      highFrequencyUsers: highFrequencyUsers.map(u => ({
        user: highFreqUserMap.get(u.userId || ""),
        eventCount: u._count,
      })),
      flaggedReviews: flaggedReviews.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        customer: r.reviewer ? `${r.reviewer.firstName} ${r.reviewer.lastName}` : "Unknown",
        customerJoinDate: r.reviewer?.createdAt,
        worker: r.reviewee ? `${r.reviewee.firstName} ${r.reviewee.lastName}` : "Unknown",
        createdAt: r.createdAt,
        flag: r.rating === 5 && r.comment && r.comment.length < 20
          ? "Short positive review"
          : "New user negative review",
      })),
      highCancellationUsers: highCancellationUsers.map(u => ({
        user: cancelUserMap.get(u.customerId),
        cancellations: u._count,
      })),
    });
  } catch (error) {
    console.error("Error getting security analytics:", error);
    return NextResponse.json(
      { error: "Failed to get security analytics" },
      { status: 500 }
    );
  }
}

// Resolve a fraud signal
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { signalId, action, notes } = body;

    if (!signalId) {
      return NextResponse.json({ error: "Signal ID required" }, { status: 400 });
    }

    const signal = await prisma.fraudSignal.findUnique({
      where: { id: signalId },
      include: { user: true },
    });

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    // Update signal as resolved
    await prisma.fraudSignal.update({
      where: { id: signalId },
      data: {
        status: "RESOLVED",
        reviewedAt: new Date(),
        reviewedById: session.user.id,
        resolution: notes,
      },
    });

    // Take action on user if specified
    if (action && signal.userId) {
      switch (action) {
        case "suspend":
          await prisma.user.update({
            where: { id: signal.userId },
            data: {
              status: "SUSPENDED",
              suspendedReason: `Fraud signal: ${signal.signalType}`,
              suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
          });
          break;
        case "ban":
          await prisma.user.update({
            where: { id: signal.userId },
            data: {
              status: "BANNED",
              suspendedReason: `Fraud signal: ${signal.signalType}`,
            },
          });
          break;
        case "warn":
          // Just log the warning, don't change status
          break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resolving fraud signal:", error);
    return NextResponse.json(
      { error: "Failed to resolve fraud signal" },
      { status: 500 }
    );
  }
}
