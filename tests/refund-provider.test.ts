import { afterEach, describe, expect, it } from "vitest";
import { createProviderRefund, mapStripeRefundStatus } from "@/lib/refund-provider";

const originalStripeKey = process.env.STRIPE_SECRET_KEY;

afterEach(() => {
  if (originalStripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = originalStripeKey;
});

describe("refund provider adapter", () => {
  it("maps Stripe terminal and pending states", () => {
    expect(mapStripeRefundStatus("succeeded")).toBe("COMPLETED");
    expect(mapStripeRefundStatus("failed")).toBe("FAILED");
    expect(mapStripeRefundStatus("canceled")).toBe("FAILED");
    expect(mapStripeRefundStatus("pending")).toBe("PENDING");
  });

  it("requires verified manual payout for cash on delivery", async () => {
    const result = await createProviderRefund({ paymentProvider: "cash_on_delivery", amount: 100, returnRequestId: "return-1", orderNumber: "VL-100" });
    expect(result).toMatchObject({ provider: "cash_on_delivery", status: "MANUAL_REQUIRED" });
  });

  it("does not pretend Stripe succeeded without credentials", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const result = await createProviderRefund({ paymentProvider: "stripe", paymentReference: "cs_test_1", amount: 100, returnRequestId: "return-1", orderNumber: "VL-100" });
    expect(result).toMatchObject({ provider: "stripe", status: "PENDING_CONFIGURATION" });
  });
});
