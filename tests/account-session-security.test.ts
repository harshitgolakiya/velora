import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  accountSessionFindUnique: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    accountSession: { findUnique: mocks.accountSessionFindUnique },
  },
}));

describe("customer session security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts an active tracked account session", async () => {
    const { requireCustomerSession } = await import("@/lib/account-data");
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user_1", email: "customer@example.com", sessionId: "session_1" },
    });
    mocks.accountSessionFindUnique.mockResolvedValue({ userId: "user_1", revokedAt: null });

    await expect(requireCustomerSession()).resolves.toMatchObject({
      user: { id: "user_1", email: "customer@example.com", sessionId: "session_1" },
    });
  });

  it("rejects revoked or mismatched account sessions", async () => {
    const { requireCustomerSession } = await import("@/lib/account-data");
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user_1", email: "customer@example.com", sessionId: "session_1" },
    });
    mocks.accountSessionFindUnique.mockResolvedValue({ userId: "user_1", revokedAt: new Date("2026-07-04T08:00:00.000Z") });

    await expect(requireCustomerSession()).resolves.toBeNull();

    mocks.accountSessionFindUnique.mockResolvedValue({ userId: "user_2", revokedAt: null });
    await expect(requireCustomerSession()).resolves.toBeNull();
  });
});
