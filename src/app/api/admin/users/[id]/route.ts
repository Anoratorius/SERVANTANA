import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { writeAuditLog, AuditAction } from "@/lib/audit-log";
import { getClientIP } from "@/lib/rate-limit";

const updateUserSchema = z.object({
  role: z.enum(["CUSTOMER", "CLEANER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]).optional(),
  suspendedUntil: z.string().datetime().nullable().optional(),
  suspendedReason: z.string().max(500).nullable().optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});

// Get single user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        cleanerProfile: {
          include: {
            services: { include: { service: true } },
            availability: true,
          },
        },
        bookingsAsCustomer: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            cleaner: { select: { firstName: true, lastName: true } },
            service: { select: { name: true } },
          },
        },
        bookingsAsCleaner: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            customer: { select: { firstName: true, lastName: true } },
            service: { select: { name: true } },
          },
        },
        reviewsReceived: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            reviewer: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Prevent admin from demoting themselves
    if (id === session.user.id && body.role && body.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Cannot change your own admin role" },
        { status: 400 }
      );
    }

    // Prevent admin from banning/suspending themselves
    if (id === session.user.id && body.status && body.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Cannot suspend or ban your own account" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { ...validationResult.data };

    // Handle suspendedUntil date conversion
    if (body.suspendedUntil) {
      updateData.suspendedUntil = new Date(body.suspendedUntil);
    } else if (body.suspendedUntil === null) {
      updateData.suspendedUntil = null;
    }

    // If status is ACTIVE, clear suspension fields
    if (body.status === "ACTIVE") {
      updateData.suspendedUntil = null;
      updateData.suspendedReason = null;
    }

    // If banning/suspending, increment tokenVersion to invalidate all sessions
    if (body.status && body.status !== "ACTIVE") {
      updateData.tokenVersion = { increment: 1 };
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        suspendedUntil: true,
        suspendedReason: true,
      },
    });

    // If role changed to CLEANER, create cleaner profile if not exists
    if (body.role === "CLEANER") {
      const existingProfile = await prisma.cleanerProfile.findUnique({
        where: { userId: id },
      });

      if (!existingProfile) {
        await prisma.cleanerProfile.create({
          data: {
            userId: id,
            hourlyRate: 25,
          },
        });
      }
    }

    // Audit log for role changes
    if (body.role) {
      writeAuditLog({
        action: "USER_ROLE_CHANGED",
        actorId: session.user.id,
        actorEmail: session.user.email,
        targetId: id,
        targetType: "User",
        details: { newRole: body.role, previousRole: "unknown" },
        ip: getClientIP(request),
        userAgent: request.headers.get("user-agent") || undefined,
      });
    }

    // Audit log for status changes (suspend/ban)
    if (body.status) {
      const actionMap: Record<string, AuditAction> = {
        SUSPENDED: "USER_SUSPENDED",
        BANNED: "USER_BANNED",
        ACTIVE: "USER_REACTIVATED",
      };
      writeAuditLog({
        action: actionMap[body.status] || "USER_UPDATED",
        actorId: session.user.id,
        actorEmail: session.user.email,
        targetId: id,
        targetType: "User",
        details: {
          newStatus: body.status,
          reason: body.suspendedReason || null,
          suspendedUntil: body.suspendedUntil || null,
        },
        ip: getClientIP(request),
        userAgent: request.headers.get("user-agent") || undefined,
        severity: body.status === "BANNED" ? "CRITICAL" : "WARNING",
      });
    }

    return NextResponse.json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Prevent admin from deleting themselves
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Get user info before deletion for audit log
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { email: true },
    });

    await prisma.user.delete({
      where: { id },
    });

    // Audit log user deletion
    writeAuditLog({
      action: "USER_DELETED",
      actorId: session.user.id,
      actorEmail: session.user.email,
      targetId: id,
      targetType: "User",
      details: { deletedUserEmail: userToDelete?.email },
      ip: getClientIP(request),
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
