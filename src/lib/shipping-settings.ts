import type { CheckoutSettings } from "./store-settings";

export type ShippingQuote = {
  zoneId: string;
  methodId: "standard" | "express";
  label: string;
  estimate: string;
  price: number;
  freeOver?: number | null;
  total: number;
};

export function getShippingQuote(
  settings: CheckoutSettings,
  input: {
    emirate: string;
    methodId: "standard" | "express";
    subtotal: number;
    freeShipping?: boolean;
  },
): ShippingQuote | null {
  const zone = settings.shippingZones.find((item) =>
    item.emirates.includes(input.emirate),
  );
  if (!zone) return null;
  const method = zone.methods.find(
    (item) => item.id === input.methodId && item.enabled,
  );
  if (!method) return null;
  const qualifiesForFree =
    Boolean(input.freeShipping) ||
    (method.freeOver != null && input.subtotal >= method.freeOver);
  return {
    zoneId: zone.id,
    methodId: method.id,
    label: method.label,
    estimate: method.estimate,
    price: method.price,
    freeOver: method.freeOver,
    total: qualifiesForFree ? 0 : method.price,
  };
}

export function getShippingMethodsForEmirate(
  settings: CheckoutSettings,
  emirate: string,
) {
  const zone = settings.shippingZones.find((item) => item.emirates.includes(emirate));
  return zone?.methods.filter((method) => method.enabled) ?? [];
}
