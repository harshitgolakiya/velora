import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSession, findUnique } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({
  getServerSession,
}));
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique },
  },
}));

import { UserRole } from "@prisma/client";
import { checkAuthRateLimit, clearAuthRateLimits } from "@/lib/auth-rate-limit";
import { getAdminAccess, requireAdminPermission } from "@/lib/admin-permissions";
import { passwordSchema } from "@/lib/password-policy";

describe("password policy", () => {
  it("requires a long mixed-character password", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("VeloraCustomer123!").success).toBe(true);
  });
});

describe("authentication rate limiting", () => {
  beforeEach(() => {
    clearAuthRateLimits();
  });

  it("blocks repeated attempts until the window resets", () => {
    expect(checkAuthRateLimit("signin:user@example.com", { limit: 1, windowMs: 1000, now: 1000 }).allowed).toBe(true);
    expect(checkAuthRateLimit("signin:user@example.com", { limit: 1, windowMs: 1000, now: 1001 }).allowed).toBe(false);
    expect(checkAuthRateLimit("signin:user@example.com", { limit: 1, windowMs: 1000, now: 2000 }).allowed).toBe(true);
  });
});

describe("admin authentication", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ALLOW_INSECURE_ADMIN_FALLBACK", "false");
    getServerSession.mockReset();
    findUnique.mockReset();
  });

  it("does not grant implicit development admin access", async () => {
    getServerSession.mockResolvedValue(null);
    await expect(getAdminAccess()).resolves.toBeNull();
  });

  it("uses the current database role instead of a stale JWT role", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "user-1", role: "SUPER_ADMIN" },
    });
    findUnique.mockResolvedValue({
      id: "user-1",
      name: "Former admin",
      email: "former@example.com",
      role: UserRole.CUSTOMER,
      adminRole: null,
    });

    await expect(getAdminAccess()).resolves.toBeNull();
  });

  it("honors current custom role permissions", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "user-2", role: "CUSTOMER" },
    });
    findUnique.mockResolvedValue({
      id: "user-2",
      name: "Catalog specialist",
      email: "catalog@example.com",
      role: UserRole.CUSTOMER,
      adminRole: {
        permissions: JSON.stringify(["admin:read", "catalog:write"]),
      },
    });

    await expect(requireAdminPermission("catalog:write")).resolves.toMatchObject({
      id: "user-2",
      permissions: expect.arrayContaining(["admin:read", "catalog:write"]),
    });
    await expect(requireAdminPermission("security:write")).rejects.toMatchObject({
      name: "AdminPermissionError",
    });
  });
});
