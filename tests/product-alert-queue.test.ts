import { describe, expect, it } from "vitest";
import { becameAvailable, reachedPriceTarget } from "@/lib/product-alert-queue";

describe("product alert trigger policy", () => {
  it("queues stock alerts only when availability crosses above zero", () => {
    expect(becameAvailable(0, 4)).toBe(true);
    expect(becameAvailable(-2, 1)).toBe(true);
    expect(becameAvailable(2, 5)).toBe(false);
    expect(becameAvailable(0, 0)).toBe(false);
  });

  it("queues price alerts only for a reduction that reaches the saved target", () => {
    expect(reachedPriceTarget(220, 180, 190)).toBe(true);
    expect(reachedPriceTarget(220, 200, 190)).toBe(false);
    expect(reachedPriceTarget(180, 180, 190)).toBe(false);
    expect(reachedPriceTarget(180, 200, 210)).toBe(false);
  });
});
