import { describe, expect, it } from "vitest";
import { defaultReturnSettings, evaluateReturnEligibility } from "@/lib/return-policy";

describe("return eligibility policy", () => {
  const deliveredAt = new Date("2026-06-01T00:00:00.000Z");

  it("allows requests inside the configured delivery window", () => {
    const result = evaluateReturnEligibility({
      settings: defaultReturnSettings,
      resolution: "exchange",
      reason: "Fit issue",
      orderStatus: "DELIVERED",
      deliveredAt,
      now: new Date("2026-06-10T00:00:00.000Z"),
    });
    expect(result.eligible).toBe(true);
  });

  it("blocks ordinary requests outside the window", () => {
    const result = evaluateReturnEligibility({
      settings: defaultReturnSettings,
      resolution: "return",
      reason: "Changed my mind",
      orderStatus: "DELIVERED",
      deliveredAt,
      now: new Date("2026-06-20T00:00:00.000Z"),
    });
    expect(result.eligible).toBe(false);
  });

  it("allows configured defect claims outside the window", () => {
    const result = evaluateReturnEligibility({
      settings: defaultReturnSettings,
      resolution: "refund",
      reason: "Damaged item",
      orderStatus: "DELIVERED",
      deliveredAt,
      now: new Date("2026-07-01T00:00:00.000Z"),
    });
    expect(result.eligible).toBe(true);
  });

  it("honors disabled exchange settings", () => {
    const result = evaluateReturnEligibility({
      settings: { ...defaultReturnSettings, exchangesEnabled: false },
      resolution: "exchange",
      reason: "Fit issue",
      orderStatus: "DELIVERED",
      deliveredAt,
    });
    expect(result.eligible).toBe(false);
  });
});
