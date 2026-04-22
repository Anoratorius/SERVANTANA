import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

// Mock bcrypt
const mockBcrypt = {
  hash: vi.fn().mockResolvedValue("hashed_password"),
  compare: vi.fn(),
};

// Registration logic (mirroring actual implementation)
async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "CUSTOMER" | "WORKER";
}) {
  // Check if user exists
  const existingUser = await mockPrisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hash password
  const hashedPassword = await mockBcrypt.hash(data.password, 12);

  // Create user
  const user = await mockPrisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
    },
  });

  return { id: user.id, email: user.email };
}

// Login logic
async function loginUser(email: string, password: string) {
  const user = await mockPrisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isValidPassword = await mockBcrypt.compare(password, user.password);

  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }

  return { id: user.id, email: user.email, role: user.role };
}

describe("Auth - Registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register a new customer", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "user-123",
      email: "new@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "CUSTOMER",
    });

    const result = await registerUser({
      email: "new@example.com",
      password: "Password123",
      firstName: "John",
      lastName: "Doe",
      role: "CUSTOMER",
    });

    expect(result.email).toBe("new@example.com");
    expect(mockBcrypt.hash).toHaveBeenCalledWith("Password123", 12);
    expect(mockPrisma.user.create).toHaveBeenCalled();
  });

  it("should register a new worker", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "user-456",
      email: "worker@example.com",
      firstName: "Jane",
      lastName: "Smith",
      role: "WORKER",
    });

    const result = await registerUser({
      email: "worker@example.com",
      password: "SecurePass1",
      firstName: "Jane",
      lastName: "Smith",
      role: "WORKER",
    });

    expect(result.email).toBe("worker@example.com");
  });

  it("should reject duplicate email", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "existing-user",
      email: "existing@example.com",
    });

    await expect(
      registerUser({
        email: "existing@example.com",
        password: "Password123",
        firstName: "John",
        lastName: "Doe",
        role: "CUSTOMER",
      })
    ).rejects.toThrow("User already exists");
  });
});

describe("Auth - Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login with valid credentials", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      email: "user@example.com",
      password: "hashed_password",
      role: "CUSTOMER",
    });
    mockBcrypt.compare.mockResolvedValue(true);

    const result = await loginUser("user@example.com", "Password123");

    expect(result.id).toBe("user-123");
    expect(result.email).toBe("user@example.com");
    expect(result.role).toBe("CUSTOMER");
  });

  it("should reject non-existent user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      loginUser("nonexistent@example.com", "Password123")
    ).rejects.toThrow("Invalid credentials");
  });

  it("should reject wrong password", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      email: "user@example.com",
      password: "hashed_password",
      role: "CUSTOMER",
    });
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(
      loginUser("user@example.com", "WrongPassword")
    ).rejects.toThrow("Invalid credentials");
  });
});
