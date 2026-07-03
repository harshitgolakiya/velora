import type { CheckoutSettings } from "./store-settings";

export type PaymentMethodId = "stripe" | "paypal" | "tabby" | "cash_on_delivery";

export function getEnabledPaymentMethods(settings: CheckoutSettings) {
  return [...settings.paymentMethods]
    .filter((method) => method.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getPaymentMethod(
  settings: CheckoutSettings,
  id: PaymentMethodId,
) {
  return settings.paymentMethods.find((method) => method.id === id);
}

export function isPaymentMethodEnabled(
  settings: CheckoutSettings,
  id: PaymentMethodId,
) {
  const method = getPaymentMethod(settings, id);
  return Boolean(method?.enabled);
}

export function getEnabledExpressCheckoutWallets(settings: CheckoutSettings) {
  if (!settings.expressCheckout.enabled || !isPaymentMethodEnabled(settings, "stripe")) return [];
  return [
    settings.expressCheckout.applePay ? "apple_pay" : null,
    settings.expressCheckout.googlePay ? "google_pay" : null,
  ].filter(Boolean) as Array<"apple_pay" | "google_pay">;
}
