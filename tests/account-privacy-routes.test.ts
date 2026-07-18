import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bcryptCompare: vi.fn(),
  checkAuthRateLimit: vi.fn(),
  emailDeliveryFindMany: vi.fn(),
  newsletterFindUnique: vi.fn(),
  orderCount: vi.fn(),
  privacyCreate: vi.fn(),
  privacyFindFirst: vi.fn(),
  requireCustomerSession: vi.fn(),
  syncMarketingUnsubscriber: vi.fn(),
  transaction: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: mocks.bcryptCompare },
}));

vi.mock("@/lib/account-data", () => ({
  requireCustomerSession: mocks.requireCustomerSession,
}));

vi.mock("@/lib/auth-rate-limit", () => ({
  checkAuthRateLimit: mocks.checkAuthRateLimit,
}));

vi.mock("@/lib/marketing-sync", () => ({
  syncMarketingUnsubscriber: mocks.syncMarketingUnsubscriber,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailDelivery: { findMany: mocks.emailDeliveryFindMany },
    newsletterSubscriber: { findUnique: mocks.newsletterFindUnique },
    order: { count: mocks.orderCount },
    privacyRequest: {
      create: mocks.privacyCreate,
      findFirst: mocks.privacyFindFirst,
    },
    user: { findUnique: mocks.userFindUnique },
    $transaction: mocks.transaction,
  },
}));

describe("account privacy routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCustomerSession.mockResolvedValue({
      user: { id: "user_1", email: "customer@example.com" },
    });
    mocks.checkAuthRateLimit.mockReturnValue({ allowed: true });
  });

  it("records a completed privacy export request before returning the account payload", async () => {
    const { GET } = await import("@/app/api/account/privacy/export/route");
    mocks.userFindUnique.mockResolvedValue({
      id: "user_1",
      email: "customer@example.com",
      emailVerifiedAt: new Date("2026-07-01T00:00:00.000Z"),
      name: "Customer",
      role: "CUSTOMER",
      marketingEmails: false,
      productAlertEmails: true,
      postPurchaseEmails: true,
      preferredSize: null,
      fitPreference: null,
      compressionPreference: null,
      customerNotes: null,
      customerTags: "[]",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-02T00:00:00.000Z"),
      addresses: [],
      wishlist: null,
      orders: [],
      reviews: [],
      productAlerts: [],
      carts: [],
      accountTokens: [],
    });
    mocks.newsletterFindUnique.mockResolvedValue(null);
    mocks.emailDeliveryFindMany.mockResolvedValue([]);
    mocks.privacyCreate.mockResolvedValue({ id: "privacy_1" });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.account.email).toBe("customer@example.com");
    expect(mocks.privacyCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_1",
        email: "customer@example.com",
        type: "EXPORT",
        status: "COMPLETED",
        completedAt: expect.any(Date),
      }),
    });
  });

  it("blocks account deletion when a legal-hold privacy request is active", async () => {
    const { POST } = await import("@/app/api/account/privacy/delete/route");
    mocks.userFindUnique.mockResolvedValue({
      id: "user_1",
      email: "customer@example.com",
      passwordHash: "hash",
      role: "CUSTOMER",
      deletedAt: null,
    });
    mocks.bcryptCompare.mockResolvedValue(true);
    mocks.privacyFindFirst.mockResolvedValue({ id: "privacy_hold_1" });

    const response = await POST(new Request("https://velora.test/api/account/privacy/delete", {
      method: "POST",
      headers: { origin: "https://velora.test" },
      body: JSON.stringify({ password: "VeloraCustomer123!", confirmation: "DELETE" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(423);
    expect(body.message).toContain("legal hold");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.syncMarketingUnsubscriber).not.toHaveBeenCalled();
  });
});
