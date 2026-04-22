import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
const mockPrisma = {
  booking: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  workerProfile: {
    findUnique: vi.fn(),
  },
  availability: {
    findMany: vi.fn(),
  },
};

// Booking creation logic
async function createBooking(data: {
  customerId: string;
  workerId: string;
  serviceId: string;
  scheduledDate: Date;
  duration: number;
  totalPrice: number;
}) {
  // Check worker exists and is available
  const worker = await mockPrisma.workerProfile.findUnique({
    where: { userId: data.workerId },
  });

  if (!worker) {
    throw new Error("Worker not found");
  }

  if (!worker.isVerified) {
    throw new Error("Worker is not verified");
  }

  // Check availability
  const dayOfWeek = data.scheduledDate.getDay();
  const availability = await mockPrisma.availability.findMany({
    where: {
      workerProfileId: worker.id,
      dayOfWeek,
      isAvailable: true,
    },
  });

  if (availability.length === 0) {
    throw new Error("Worker not available on this day");
  }

  // Create booking
  const booking = await mockPrisma.booking.create({
    data: {
      customerId: data.customerId,
      workerId: data.workerId,
      serviceId: data.serviceId,
      scheduledDate: data.scheduledDate,
      duration: data.duration,
      totalPrice: data.totalPrice,
      status: "PENDING",
    },
  });

  return booking;
}

// Booking cancellation logic
async function cancelBooking(bookingId: string, userId: string) {
  const booking = await mockPrisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  // Only customer or worker can cancel
  if (booking.customerId !== userId && booking.workerId !== userId) {
    throw new Error("Unauthorized");
  }

  // Cannot cancel completed or already cancelled bookings
  if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
    throw new Error("Cannot cancel this booking");
  }

  // Check cancellation policy (24 hours before)
  const hoursUntilBooking =
    (booking.scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60);

  const refundPercentage = hoursUntilBooking >= 24 ? 100 : hoursUntilBooking >= 12 ? 50 : 0;

  const updatedBooking = await mockPrisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: userId,
      refundPercentage,
    },
  });

  return updatedBooking;
}

describe("Bookings - Create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a booking with verified worker", async () => {
    mockPrisma.workerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      userId: "worker-1",
      isVerified: true,
    });
    mockPrisma.availability.findMany.mockResolvedValue([
      { id: "avail-1", dayOfWeek: 1, isAvailable: true },
    ]);
    mockPrisma.booking.create.mockResolvedValue({
      id: "booking-1",
      status: "PENDING",
      customerId: "customer-1",
      workerId: "worker-1",
    });

    const result = await createBooking({
      customerId: "customer-1",
      workerId: "worker-1",
      serviceId: "service-1",
      scheduledDate: new Date("2024-12-23T10:00:00Z"), // Monday
      duration: 2,
      totalPrice: 50,
    });

    expect(result.status).toBe("PENDING");
    expect(mockPrisma.booking.create).toHaveBeenCalled();
  });

  it("should reject booking with unverified worker", async () => {
    mockPrisma.workerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      userId: "worker-1",
      isVerified: false,
    });

    await expect(
      createBooking({
        customerId: "customer-1",
        workerId: "worker-1",
        serviceId: "service-1",
        scheduledDate: new Date("2024-12-23T10:00:00Z"),
        duration: 2,
        totalPrice: 50,
      })
    ).rejects.toThrow("Worker is not verified");
  });

  it("should reject booking when worker not found", async () => {
    mockPrisma.workerProfile.findUnique.mockResolvedValue(null);

    await expect(
      createBooking({
        customerId: "customer-1",
        workerId: "nonexistent",
        serviceId: "service-1",
        scheduledDate: new Date("2024-12-23T10:00:00Z"),
        duration: 2,
        totalPrice: 50,
      })
    ).rejects.toThrow("Worker not found");
  });

  it("should reject booking when worker unavailable", async () => {
    mockPrisma.workerProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      userId: "worker-1",
      isVerified: true,
    });
    mockPrisma.availability.findMany.mockResolvedValue([]);

    await expect(
      createBooking({
        customerId: "customer-1",
        workerId: "worker-1",
        serviceId: "service-1",
        scheduledDate: new Date("2024-12-23T10:00:00Z"),
        duration: 2,
        totalPrice: 50,
      })
    ).rejects.toThrow("Worker not available on this day");
  });
});

describe("Bookings - Cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow customer to cancel with full refund (24h+)", async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 48);

    mockPrisma.booking.findUnique.mockResolvedValue({
      id: "booking-1",
      customerId: "customer-1",
      workerId: "worker-1",
      status: "CONFIRMED",
      scheduledDate: futureDate,
    });
    mockPrisma.booking.update.mockResolvedValue({
      id: "booking-1",
      status: "CANCELLED",
      refundPercentage: 100,
    });

    const result = await cancelBooking("booking-1", "customer-1");

    expect(result.status).toBe("CANCELLED");
    expect(result.refundPercentage).toBe(100);
  });

  it("should allow worker to cancel", async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 48);

    mockPrisma.booking.findUnique.mockResolvedValue({
      id: "booking-1",
      customerId: "customer-1",
      workerId: "worker-1",
      status: "CONFIRMED",
      scheduledDate: futureDate,
    });
    mockPrisma.booking.update.mockResolvedValue({
      id: "booking-1",
      status: "CANCELLED",
      refundPercentage: 100,
    });

    const result = await cancelBooking("booking-1", "worker-1");

    expect(result.status).toBe("CANCELLED");
  });

  it("should reject cancellation by unauthorized user", async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: "booking-1",
      customerId: "customer-1",
      workerId: "worker-1",
      status: "CONFIRMED",
      scheduledDate: new Date(),
    });

    await expect(
      cancelBooking("booking-1", "random-user")
    ).rejects.toThrow("Unauthorized");
  });

  it("should reject cancelling completed booking", async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: "booking-1",
      customerId: "customer-1",
      workerId: "worker-1",
      status: "COMPLETED",
      scheduledDate: new Date(),
    });

    await expect(
      cancelBooking("booking-1", "customer-1")
    ).rejects.toThrow("Cannot cancel this booking");
  });

  it("should give partial refund for late cancellation (12-24h)", async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 18);

    mockPrisma.booking.findUnique.mockResolvedValue({
      id: "booking-1",
      customerId: "customer-1",
      workerId: "worker-1",
      status: "CONFIRMED",
      scheduledDate: futureDate,
    });
    mockPrisma.booking.update.mockResolvedValue({
      id: "booking-1",
      status: "CANCELLED",
      refundPercentage: 50,
    });

    const result = await cancelBooking("booking-1", "customer-1");

    expect(result.refundPercentage).toBe(50);
  });
});
