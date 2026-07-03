import { describe, expect, it } from "vitest";
import { analyticsDedupeKey, storefrontFilterEventSchema } from "@/lib/analytics-event-contract";

describe("analytics event contract", () => {
  it("normalizes filter events with explicit consent category and event name", () => {
    const parsed = storefrontFilterEventSchema.parse({
      path: "/shop",
      filterKey: "color",
      value: "Black",
      action: "apply",
      resultCount: 12,
    });

    expect(parsed).toMatchObject({
      eventName: "filter_changed",
      consentCategory: "analytics",
    });
  });

  it("creates stable analytics dedupe keys", () => {
    expect(analyticsDedupeKey(["Filter Changed", "/Shop?Size=M", "Color", "Deep Neutral"])).toBe(
      "filter-changed:shop-size-m:color:deep-neutral",
    );
  });
});
