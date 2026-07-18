import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  emailDeliveryCount: vi.fn(),
  automationEventCount: vi.fn(),
  productAlertDeliveryCount: vi.fn(),
  returnIntegrationAttemptCount: vi.fn(),
  cartCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    emailDelivery: { count: mocks.emailDeliveryCount },
    automationEvent: { count: mocks.automationEventCount },
    productAlertDelivery: { count: mocks.productAlertDeliveryCount },
    returnIntegrationAttempt: { count: mocks.returnIntegrationAttemptCount },
    cart: { count: mocks.cartCount },
  },
}));

describe("health endpoints and business health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok when the database responds", async () => {
    const { GET } = await import("@/app/api/health/route");
    mocks.queryRaw.mockResolvedValue([{ ok: 1 }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      service: "velora",
      checks: { database: { status: "ok" } },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns degraded when the database check fails", async () => {
    const { GET } = await import("@/app/api/health/route");
    mocks.queryRaw.mockRejectedValue(new Error("database unavailable"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.checks.database).toMatchObject({ status: "failed", message: "database unavailable" });
  });

  it("summarizes operational queue health with critical issues", async () => {
    const { getBusinessHealth } = await import("@/lib/business-health");
    mocks.emailDeliveryCount.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
    mocks.automationEventCount.mockResolvedValueOnce(0).mockResolvedValueOnce(20);
    mocks.productAlertDeliveryCount.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    mocks.returnIntegrationAttemptCount.mockResolvedValue(1);
    mocks.cartCount.mockResolvedValue(0);

    const health = await getBusinessHealth(new Date("2026-07-04T08:00:00.000Z"));

    expect(health.status).toBe("action_required");
    expect(health.metrics.failedEmailDeliveries).toBe(2);
    expect(health.issues.map((issue) => issue.code)).toEqual([
      "failed_email_deliveries",
      "exhausted_product_alerts",
      "return_integration_actions",
    ]);
  });
});
