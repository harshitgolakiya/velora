import { describe, expect, it } from "vitest";
import { getDiscountPercentage, getProductBadges } from "@/lib/product-presentation";

describe("product presentation", () => {
  it("calculates a rounded discount percentage", () => {
    expect(getDiscountPercentage({ price: 200, salePrice: 150 })).toBe(25);
    expect(getDiscountPercentage({ price: 200 })).toBe(0);
  });

  it("uses real merchandising and inventory data for badges", () => {
    expect(
      getProductBadges({
        price: 200,
        salePrice: 150,
        stock: 3,
        bestSeller: true,
        newArrival: false,
      }).map((badge) => badge.label),
    ).toEqual(["25% off", "Low stock"]);
  });

  it("does not duplicate an explicit badge", () => {
    expect(
      getProductBadges({
        price: 200,
        stock: 20,
        bestSeller: true,
        newArrival: false,
        badge: "Best seller",
      }),
    ).toHaveLength(1);
  });
});
