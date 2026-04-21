import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VoicePlatform } from "@prisma/client";

/**
 * GET /api/voice/link
 * Get current voice assistant links for the authenticated user
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const voiceLinks = await prisma.voiceAssistantLink.findMany({
      where: { userId: session.user.id },
      include: {
        defaultProfession: {
          select: {
            id: true,
            name: true,
            nameDE: true,
            emoji: true,
          },
        },
        defaultWorker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        defaultService: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get user's default property/address if they have one
    const defaultProperty = await prisma.property.findFirst({
      where: {
        ownerId: session.user.id,
        isDefault: true,
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        postalCode: true,
      },
    });

    // Get available platforms not yet linked
    const linkedPlatforms = voiceLinks.map((link) => link.platform);
    const availablePlatforms = Object.values(VoicePlatform).filter(
      (platform) => !linkedPlatforms.includes(platform)
    );

    return NextResponse.json({
      links: voiceLinks.map((link) => ({
        id: link.id,
        platform: link.platform,
        linked: link.linked,
        lastUsedAt: link.lastUsedAt,
        defaults: {
          profession: link.defaultProfession
            ? {
                id: link.defaultProfession.id,
                name: link.defaultProfession.name,
                nameDE: link.defaultProfession.nameDE,
                emoji: link.defaultProfession.emoji,
              }
            : null,
          worker: link.defaultWorker
            ? {
                id: link.defaultWorker.id,
                name: `${link.defaultWorker.firstName} ${link.defaultWorker.lastName}`,
                avatar: link.defaultWorker.avatar,
              }
            : null,
          service: link.defaultService
            ? {
                id: link.defaultService.id,
                name: link.defaultService.name,
              }
            : null,
          address: link.defaultAddress,
        },
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      })),
      availablePlatforms,
      defaultProperty: defaultProperty
        ? {
            id: defaultProperty.id,
            name: defaultProperty.name,
            address: `${defaultProperty.address}${defaultProperty.city ? `, ${defaultProperty.city}` : ""}`,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching voice links:", error);
    return NextResponse.json(
      { error: "Failed to fetch voice assistant links" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voice/link
 * Create or update a voice assistant link with defaults
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      platform,
      platformAccountId,
      defaultProfessionId,
      defaultWorkerId,
      defaultAddress,
      defaultServiceId,
      linked,
    } = body;

    // Validate platform
    if (!platform || !Object.values(VoicePlatform).includes(platform as VoicePlatform)) {
      return NextResponse.json(
        {
          error: "Invalid platform",
          validPlatforms: Object.values(VoicePlatform),
        },
        { status: 400 }
      );
    }

    // Validate profession if provided
    if (defaultProfessionId) {
      const profession = await prisma.profession.findUnique({
        where: { id: defaultProfessionId, isActive: true },
      });
      if (!profession) {
        return NextResponse.json(
          { error: "Invalid profession ID" },
          { status: 400 }
        );
      }
    }

    // Validate worker if provided
    if (defaultWorkerId) {
      const worker = await prisma.user.findUnique({
        where: {
          id: defaultWorkerId,
          role: { in: ["WORKER", "CLEANER"] },
        },
      });
      if (!worker) {
        return NextResponse.json(
          { error: "Invalid worker ID" },
          { status: 400 }
        );
      }
    }

    // Validate service if provided
    if (defaultServiceId) {
      const service = await prisma.service.findUnique({
        where: { id: defaultServiceId, isActive: true },
      });
      if (!service) {
        return NextResponse.json(
          { error: "Invalid service ID" },
          { status: 400 }
        );
      }
    }

    // Upsert voice assistant link
    const voiceLink = await prisma.voiceAssistantLink.upsert({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: platform as VoicePlatform,
        },
      },
      create: {
        userId: session.user.id,
        platform: platform as VoicePlatform,
        platformAccountId: platformAccountId || null,
        defaultProfessionId: defaultProfessionId || null,
        defaultWorkerId: defaultWorkerId || null,
        defaultAddress: defaultAddress || null,
        defaultServiceId: defaultServiceId || null,
        linked: linked !== undefined ? linked : false,
      },
      update: {
        ...(platformAccountId !== undefined && { platformAccountId }),
        ...(defaultProfessionId !== undefined && { defaultProfessionId }),
        ...(defaultWorkerId !== undefined && { defaultWorkerId }),
        ...(defaultAddress !== undefined && { defaultAddress }),
        ...(defaultServiceId !== undefined && { defaultServiceId }),
        ...(linked !== undefined && { linked }),
        updatedAt: new Date(),
      },
      include: {
        defaultProfession: {
          select: {
            id: true,
            name: true,
            emoji: true,
          },
        },
        defaultWorker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        defaultService: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      link: {
        id: voiceLink.id,
        platform: voiceLink.platform,
        linked: voiceLink.linked,
        defaults: {
          profession: voiceLink.defaultProfession,
          worker: voiceLink.defaultWorker
            ? {
                id: voiceLink.defaultWorker.id,
                name: `${voiceLink.defaultWorker.firstName} ${voiceLink.defaultWorker.lastName}`,
              }
            : null,
          service: voiceLink.defaultService,
          address: voiceLink.defaultAddress,
        },
      },
      message: voiceLink.linked
        ? `${platform} has been linked successfully`
        : `${platform} link has been updated`,
    });
  } catch (error) {
    console.error("Error updating voice link:", error);
    return NextResponse.json(
      { error: "Failed to update voice assistant link" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voice/link
 * Unlink a voice assistant
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");

    if (!platform || !Object.values(VoicePlatform).includes(platform as VoicePlatform)) {
      return NextResponse.json(
        {
          error: "Invalid platform",
          validPlatforms: Object.values(VoicePlatform),
        },
        { status: 400 }
      );
    }

    // Find and delete the voice link
    const deleted = await prisma.voiceAssistantLink.deleteMany({
      where: {
        userId: session.user.id,
        platform: platform as VoicePlatform,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Voice assistant link not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${platform} has been unlinked`,
    });
  } catch (error) {
    console.error("Error deleting voice link:", error);
    return NextResponse.json(
      { error: "Failed to delete voice assistant link" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/voice/link
 * Update defaults for a voice assistant link
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      platform,
      defaultProfessionId,
      defaultWorkerId,
      defaultAddress,
      defaultServiceId,
    } = body;

    if (!platform || !Object.values(VoicePlatform).includes(platform as VoicePlatform)) {
      return NextResponse.json(
        { error: "Invalid platform" },
        { status: 400 }
      );
    }

    // Find existing link
    const existingLink = await prisma.voiceAssistantLink.findUnique({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: platform as VoicePlatform,
        },
      },
    });

    if (!existingLink) {
      return NextResponse.json(
        { error: "Voice assistant link not found. Please link the assistant first." },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (defaultProfessionId !== undefined) {
      if (defaultProfessionId === null) {
        updateData.defaultProfessionId = null;
      } else {
        const profession = await prisma.profession.findUnique({
          where: { id: defaultProfessionId, isActive: true },
        });
        if (!profession) {
          return NextResponse.json(
            { error: "Invalid profession ID" },
            { status: 400 }
          );
        }
        updateData.defaultProfessionId = defaultProfessionId;
      }
    }

    if (defaultWorkerId !== undefined) {
      if (defaultWorkerId === null) {
        updateData.defaultWorkerId = null;
      } else {
        const worker = await prisma.user.findUnique({
          where: {
            id: defaultWorkerId,
            role: { in: ["WORKER", "CLEANER"] },
          },
        });
        if (!worker) {
          return NextResponse.json(
            { error: "Invalid worker ID" },
            { status: 400 }
          );
        }
        updateData.defaultWorkerId = defaultWorkerId;
      }
    }

    if (defaultServiceId !== undefined) {
      if (defaultServiceId === null) {
        updateData.defaultServiceId = null;
      } else {
        const service = await prisma.service.findUnique({
          where: { id: defaultServiceId, isActive: true },
        });
        if (!service) {
          return NextResponse.json(
            { error: "Invalid service ID" },
            { status: 400 }
          );
        }
        updateData.defaultServiceId = defaultServiceId;
      }
    }

    if (defaultAddress !== undefined) {
      updateData.defaultAddress = defaultAddress || null;
    }

    // Update the link
    const updatedLink = await prisma.voiceAssistantLink.update({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: platform as VoicePlatform,
        },
      },
      data: updateData,
      include: {
        defaultProfession: {
          select: {
            id: true,
            name: true,
            emoji: true,
          },
        },
        defaultWorker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        defaultService: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      link: {
        id: updatedLink.id,
        platform: updatedLink.platform,
        linked: updatedLink.linked,
        defaults: {
          profession: updatedLink.defaultProfession,
          worker: updatedLink.defaultWorker
            ? {
                id: updatedLink.defaultWorker.id,
                name: `${updatedLink.defaultWorker.firstName} ${updatedLink.defaultWorker.lastName}`,
              }
            : null,
          service: updatedLink.defaultService,
          address: updatedLink.defaultAddress,
        },
      },
      message: "Voice assistant defaults updated",
    });
  } catch (error) {
    console.error("Error updating voice link defaults:", error);
    return NextResponse.json(
      { error: "Failed to update voice assistant defaults" },
      { status: 500 }
    );
  }
}
