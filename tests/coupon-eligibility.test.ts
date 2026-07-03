import { describe, expect, it } from "vitest";
import {
  getCouponEligibleSubtotal,
  parseCouponList,
  serializeCouponList,
} from "@/lib/coupon-eligibility";

describe("coupon eligibility", () => {
  it("parses JSON and comma-separated coupon lists", () => {
    expect(parseCouponList(JSON.stringify(["a", "b"]))).toEqual(["a", "b"]);
    expect(parseCouponList("a, b,")).toEqual(["a", "b"]);
    expect(serializeCouponList("a, b")).toBe(JSON.stringify(["a", "b"]));
  });

  it("returns the full subtotal when no targeting rules exist", () => {
    expect(getCouponEligibleSubtotal({}, [], 300)).toBe(300);
  });

  it("limits discounts to eligible product, category, or collection lines", () => {
    const items = [
      { productId: "p1", category: "Leggings", collections: ["studio"], lineTotal: 120 },
      { productId: "p2", category: "Jackets", collections: ["after-hours"], lineTotal: 180 },
      { productId: "p3", category: "Accessories", collections: ["studio"], lineTotal: 50 },
    ];

    expect(getCouponEligibleSubtotal({ eligibleCategories: JSON.stringify(["Leggings"]) }, items, 350)).toBe(120);
    expect(getCouponEligibleSubtotal({ eligibleCollections: JSON.stringify(["studio"]) }, items, 350)).toBe(170);
    expect(getCouponEligibleSubtotal({ eligibleProductIds: JSON.stringify(["p2"]) }, items, 350)).toBe(180);
    expect(getCouponEligibleSubtotal({
      eligibleCollections: JSON.stringify(["studio"]),
      excludedProductIds: JSON.stringify(["p3"]),
    }, items, 350)).toBe(120);
  });
});
