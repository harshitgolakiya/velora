import { describe, expect, it } from "vitest";
import { defaultCheckoutSettings } from "@/lib/store-settings";
import { getShippingMethodsForEmirate, getShippingQuote } from "@/lib/shipping-settings";

describe("shipping settings", () => {
  it("quotes configured standard and express delivery", () => {
    expect(
      getShippingQuote(defaultCheckoutSettings, {
        emirate: "Dubai",
        methodId: "standard",
        subtotal: 120,
      }),
    ).toMatchObject({ label: "Standard delivery", total: 25 });

    expect(
      getShippingQuote(defaultCheckoutSettings, {
        emirate: "Dubai",
        methodId: "express",
        subtotal: 500,
      }),
    ).toMatchObject({ label: "Express delivery", total: 40 });
  });

  it("applies free shipping thresholds and free-shipping coupons", () => {
    expect(
      getShippingQuote(defaultCheckoutSettings, {
        emirate: "Dubai",
        methodId: "standard",
        subtotal: 300,
      })?.total,
    ).toBe(0);

    expect(
      getShippingQuote(defaultCheckoutSettings, {
        emirate: "Dubai",
        methodId: "standard",
        subtotal: 100,
        freeShipping: true,
      })?.total,
    ).toBe(0);
  });

  it("returns only enabled methods for the selected emirate", () => {
    const settings = {
      ...defaultCheckoutSettings,
      shippingZones: [
        {
          ...defaultCheckoutSettings.shippingZones[0],
          methods: defaultCheckoutSettings.shippingZones[0].methods.map((method) =>
            method.id === "express" ? { ...method, enabled: false } : method,
          ),
        },
      ],
    };

    expect(getShippingMethodsForEmirate(settings, "Dubai").map((method) => method.id)).toEqual(["standard"]);
    expect(getShippingQuote(settings, { emirate: "Dubai", methodId: "express", subtotal: 100 })).toBeNull();
  });
});
