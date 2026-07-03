import { describe, expect, it } from "vitest";
import { defaultCheckoutSettings } from "@/lib/store-settings";
import {
  getEnabledExpressCheckoutWallets,
  getEnabledPaymentMethods,
  isPaymentMethodEnabled,
} from "@/lib/payment-method-settings";

describe("payment method settings", () => {
  it("returns enabled methods in configured order", () => {
    const settings = {
      ...defaultCheckoutSettings,
      paymentMethods: [
        { ...defaultCheckoutSettings.paymentMethods[0], sortOrder: 2 },
        { ...defaultCheckoutSettings.paymentMethods[1], sortOrder: 1 },
      ],
    };

    expect(getEnabledPaymentMethods(settings).map((method) => method.id)).toEqual([
      "cash_on_delivery",
      "stripe",
    ]);
  });

  it("includes PayPal when the method is enabled", () => {
    const settings = {
      ...defaultCheckoutSettings,
      paymentMethods: defaultCheckoutSettings.paymentMethods.map((method) =>
        method.id === "paypal" || method.id === "tabby" ? { ...method, enabled: true } : method,
      ),
    };

    expect(getEnabledPaymentMethods(settings).map((method) => method.id)).toEqual([
      "stripe",
      "paypal",
      "tabby",
      "cash_on_delivery",
    ]);
  });

  it("detects disabled checkout payment methods", () => {
    const settings = {
      ...defaultCheckoutSettings,
      paymentMethods: defaultCheckoutSettings.paymentMethods.map((method) =>
        method.id === "cash_on_delivery" ? { ...method, enabled: false } : method,
      ),
    };

    expect(isPaymentMethodEnabled(settings, "stripe")).toBe(true);
    expect(isPaymentMethodEnabled(settings, "cash_on_delivery")).toBe(false);
  });

  it("shows express checkout wallets only when Stripe and wallet controls are enabled", () => {
    expect(getEnabledExpressCheckoutWallets(defaultCheckoutSettings)).toEqual(["apple_pay", "google_pay"]);

    expect(getEnabledExpressCheckoutWallets({
      ...defaultCheckoutSettings,
      expressCheckout: { enabled: true, applePay: false, googlePay: true },
    })).toEqual(["google_pay"]);

    expect(getEnabledExpressCheckoutWallets({
      ...defaultCheckoutSettings,
      paymentMethods: defaultCheckoutSettings.paymentMethods.map((method) =>
        method.id === "stripe" ? { ...method, enabled: false } : method,
      ),
    })).toEqual([]);
  });
});
