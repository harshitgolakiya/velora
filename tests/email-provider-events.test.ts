import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  providerEventUpsert: vi.fn(),
  deliveryFindFirst: vi.fn(),
  deliveryFindUnique: vi.fn(),
  deliveryUpdate: vi.fn(),
  subscriberUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailProviderEvent: { upsert: mocks.providerEventUpsert },
    emailDelivery: {
      findFirst: mocks.deliveryFindFirst,
      findUnique: mocks.deliveryFindUnique,
      update: mocks.deliveryUpdate,
    },
    newsletterSubscriber: { upsert: mocks.subscriberUpsert },
  },
}));

describe("email provider reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deliveryFindFirst.mockResolvedValue({ id: "delivery_1", sourceKey: "welcome:sub_1" });
    mocks.providerEventUpsert.mockResolvedValue({
      id: "event_1",
      eventType: "BOUNCE",
      recipient: "customer@example.com",
      alertStatus: "OPEN",
    });
  });

  it("suppresses marketing consent after a bounce and flags the delivery", async () => {
    const { reconcileEmailProviderEvent } = await import("@/lib/email-provider-events");
    await reconcileEmailProviderEvent({
      provider: "resend",
      providerEventId: "evt_1",
      eventType: "bounce",
      recipient: "Customer@Example.com",
      providerRef: "msg_1",
      message: "Mailbox unavailable",
    });

    expect(mocks.subscriberUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: "customer@example.com" },
      update: expect.objectContaining({
        status: "SUPPRESSED",
        suppressionReason: "EMAIL_BOUNCED",
      }),
    }));
    expect(mocks.deliveryUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "delivery_1" },
      data: expect.objectContaining({ status: "BOUNCED", failureAlertedAt: expect.any(Date) }),
    }));
  });

  it("reconciles provider unsubscribes without creating failure alerts", async () => {
    const { reconcileEmailProviderEvent } = await import("@/lib/email-provider-events");
    await reconcileEmailProviderEvent({
      provider: "mailchimp",
      providerEventId: "evt_unsub",
      eventType: "unsubscribe",
      recipient: "customer@example.com",
    });

    expect(mocks.providerEventUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ alertStatus: "NONE", severity: "MEDIUM" }),
    }));
    expect(mocks.subscriberUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({
        status: "UNSUBSCRIBED",
        suppressionReason: "PROVIDER_UNSUBSCRIBE",
      }),
    }));
  });

  it("creates an open provider event for internal terminal delivery failures", async () => {
    const { recordEmailFailureAlert } = await import("@/lib/email-provider-events");
    await recordEmailFailureAlert({
      deliveryId: "delivery_1",
      recipient: "customer@example.com",
      provider: "CPANEL_SMTP",
      sourceKey: "order-confirmation:1",
      message: "SMTP rejected recipient",
    });

    expect(mocks.providerEventUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        provider: "CPANEL_SMTP",
        providerEventId: "delivery-failure:delivery_1",
        eventType: "FAILED",
        alertStatus: "OPEN",
        severity: "HIGH",
      }),
    }));
  });
});
