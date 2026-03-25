import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// One-time admin setup - DELETE THIS FILE AFTER USE
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-setup-secret");

  // Simple protection
  if (secret !== "servantana-setup-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const email = "admin@servantana.com";
    const password = "Admin@2024!";
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: "ADMIN",
        password: hashedPassword,
        emailVerified: new Date(),
      },
      create: {
        email,
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        emailVerified: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Admin created",
      email: user.email,
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
  }
}
