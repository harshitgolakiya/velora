import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailDelivery: {
      updateMany: mocks.updateMany,
    },
  },
}));

vi.mock("@/lib/email-provider-events", () => ({
  recordEmailFailureAlert: vi.fn(),
}));

describe("automation email reporting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("marks lifecycle email clicks once", async () => {
    const { markEmailClicked } = await import("@/lib/email-delivery");

    await markEmailClicked("delivery_1");

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "delivery_1", clickedAt: null },
      data: { clickedAt: expect.any(Date) },
    });
  });

  it("attributes recent lifecycle email conversions to a completed order", async () => {
    const { attributeAutomationConversions } = await import("@/lib/email-delivery");

    const count = await attributeAutomationConversions({
      email: "Customer@Example.com",
      orderId: "order_1",
      orderTotal: 420,
    });

    expect(count).toBe(1);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        recipient: "customer@example.com",
        eventType: { in: ["WELCOME", "ABANDONED_CART", "POST_PURCHASE", "REVIEW_REQUEST"] },
        status: { in: ["SENT", "DRY_RUN"] },
        convertedAt: null,
        createdAt: { gte: expect.any(Date) },
      },
      data: {
        convertedAt: expect.any(Date),
        conversionOrderId: "order_1",
        conversionValue: 420,
      },
    });
  });
});
