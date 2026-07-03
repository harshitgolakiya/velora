import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  paymentProviderEventUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentProviderEvent: { upsert: mocks.paymentProviderEventUpsert },
  },
}));

describe("payment provider event ledger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.paymentProviderEventUpsert.mockResolvedValue({ id: "event_1" });
  });

  it("upserts by provider event id so webhook retries are idempotent", async () => {
    const { recordPaymentProviderEvent } = await import("@/lib/payment-provider-events");

    await recordPaymentProviderEvent({
      provider: "stripe",
      providerEventId: "evt_1",
      eventType: "checkout.session.completed",
      orderId: "order_1",
      orderNumber: "VL-100",
      paymentRef: "cs_1",
      payload: { id: "cs_1" },
      status: "PROCESSED",
    });
    await recordPaymentProviderEvent({
      provider: "stripe",
      providerEventId: "evt_1",
      eventType: "checkout.session.completed",
      orderId: "order_1",
      orderNumber: "VL-100",
      paymentRef: "cs_1",
      status: "PROCESSED",
    });

    expect(mocks.paymentProviderEventUpsert).toHaveBeenCalledTimes(2);
    expect(mocks.paymentProviderEventUpsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { provider_providerEventId: { provider: "stripe", providerEventId: "evt_1" } },
      create: expect.objectContaining({
        provider: "stripe",
        providerEventId: "evt_1",
        eventType: "checkout.session.completed",
        orderId: "order_1",
        paymentRef: "cs_1",
      }),
    }));
    expect(mocks.paymentProviderEventUpsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { provider_providerEventId: { provider: "stripe", providerEventId: "evt_1" } },
      update: expect.objectContaining({ status: "PROCESSED" }),
    }));
  });

  it("truncates oversized provider payloads before persistence", async () => {
    const { recordPaymentProviderEvent } = await import("@/lib/payment-provider-events");
    await recordPaymentProviderEvent({
      provider: "stripe",
      providerEventId: "evt_big",
      eventType: "charge.dispute.created",
      payload: { data: "x".repeat(13000) },
    });

    const call = mocks.paymentProviderEventUpsert.mock.calls[0][0];
    expect(call.create.payload.length).toBeLessThanOrEqual(12003);
  });
});
