import { describe, expect, it } from "vitest";
import { getPaymentStatusLabel, isPaymentComplete } from "@/lib/payment-display";

describe("payment display states", () => {
  it("labels successful, failed, cancelled, and pending provider states", () => {
    expect(getPaymentStatusLabel("paid", "stripe")).toBe("Payment confirmed");
    expect(getPaymentStatusLabel("failed", "stripe")).toBe("Payment failed");
    expect(getPaymentStatusLabel("cancelled", "stripe")).toBe("Payment cancelled");
    expect(getPaymentStatusLabel("pending", "paypal")).toBe("PayPal pending");
    expect(getPaymentStatusLabel("pending", "tabby")).toBe("Tabby pending");
    expect(getPaymentStatusLabel("cod_pending", "cash_on_delivery")).toBe("Cash on delivery");
  });

  it("treats only paid as complete", () => {
    expect(isPaymentComplete("paid")).toBe(true);
    expect(isPaymentComplete("failed")).toBe(false);
    expect(isPaymentComplete("pending")).toBe(false);
  });
});
