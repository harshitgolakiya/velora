import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  workflowFindUnique: vi.fn(),
  eventUpsert: vi.fn(),
  eventFindMany: vi.fn(),
  eventUpdate: vi.fn(),
  deliveryFindMany: vi.fn(),
  deliveryFindUnique: vi.fn(),
  deliverEmail: vi.fn(),
  retryEmailDelivery: vi.fn(),
  workflowEmailMessage: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    automationWorkflow: { findUnique: mocks.workflowFindUnique },
    automationEvent: {
      upsert: mocks.eventUpsert,
      findMany: mocks.eventFindMany,
      update: mocks.eventUpdate,
    },
    emailDelivery: {
      findMany: mocks.deliveryFindMany,
      findUnique: mocks.deliveryFindUnique,
    },
  },
}));

vi.mock("@/lib/email-delivery", () => ({
  deliverEmail: mocks.deliverEmail,
  retryEmailDelivery: mocks.retryEmailDelivery,
  workflowEmailMessage: mocks.workflowEmailMessage,
}));

describe("automation lifecycle events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deliveryFindMany.mockResolvedValue([]);
  });

  it("queues events once using workflow delay and source key", async () => {
    const { queueAutomationEvent } = await import("@/lib/automation-events");
    mocks.workflowFindUnique.mockResolvedValue({ enabled: true, delayHours: 2 });
    mocks.eventUpsert.mockResolvedValue({ id: "event_1" });

    await queueAutomationEvent({
      type: "WELCOME",
      sourceKey: "welcome:sub_1",
      recipient: "CUSTOMER@EXAMPLE.COM",
      metadata: { locale: "en" },
    });

    expect(mocks.eventUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { sourceKey: "welcome:sub_1" },
      create: expect.objectContaining({
        type: "WELCOME",
        recipient: "customer@example.com",
        status: "PENDING",
        metadata: JSON.stringify({ locale: "en" }),
      }),
      update: {},
    }));
  });

  it("processes due events through template rendering and consent-aware delivery", async () => {
    const { processDueAutomationEvents } = await import("@/lib/automation-events");
    mocks.eventFindMany.mockResolvedValue([{
      id: "evt_1",
      type: "ABANDONED_CART",
      sourceKey: "abandoned:cart_1",
      recipient: "customer@example.com",
      orderId: null,
      cartId: "cart_1",
      metadata: JSON.stringify({ cartValue: 300 }),
    }]);
    mocks.workflowFindUnique.mockResolvedValue({ id: "wf_1", type: "ABANDONED_CART", enabled: true, subject: null });
    mocks.deliveryFindUnique.mockResolvedValue(null);
    mocks.workflowEmailMessage.mockResolvedValue({ subject: "Still available", html: "<p>Cart</p>", templateId: "tpl_1", templateVersion: 3, locale: "en" });
    mocks.deliverEmail.mockResolvedValue({ id: "delivery_1", status: "SENT" });

    const result = await processDueAutomationEvents();

    expect(result).toEqual({ sent: 1, skipped: 0, failed: 0, retried: 0, events: 1 });
    expect(mocks.deliverEmail).toHaveBeenCalledWith(expect.objectContaining({
      sourceKey: "abandoned:cart_1",
      eventType: "ABANDONED_CART",
      requiresMarketingConsent: true,
      metadata: expect.objectContaining({ cartValue: 300, templateId: "tpl_1", templateVersion: 3 }),
    }));
    expect(mocks.eventUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "evt_1" },
      data: expect.objectContaining({ status: "PROCESSED" }),
    }));
  });

  it("skips lifecycle delivery when a source key was already delivered", async () => {
    const { processDueAutomationEvents } = await import("@/lib/automation-events");
    mocks.eventFindMany.mockResolvedValue([{
      id: "evt_2",
      type: "POST_PURCHASE",
      sourceKey: "post-purchase:order_1",
      recipient: "customer@example.com",
      orderId: "order_1",
      cartId: null,
      metadata: null,
    }]);
    mocks.workflowFindUnique.mockResolvedValue({ id: "wf_2", type: "POST_PURCHASE", enabled: true, subject: null });
    mocks.deliveryFindUnique.mockResolvedValue({ id: "delivery_1" });

    const result = await processDueAutomationEvents();

    expect(result).toEqual({ sent: 0, skipped: 1, failed: 0, retried: 0, events: 1 });
    expect(mocks.deliverEmail).not.toHaveBeenCalled();
    expect(mocks.eventUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "evt_2" },
      data: expect.objectContaining({
        status: "SKIPPED_DUPLICATE",
        error: "Delivery already exists",
      }),
    }));
  });
});
