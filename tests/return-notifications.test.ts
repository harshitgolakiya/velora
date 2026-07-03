import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { emailDelivery: { findUnique: vi.fn() } } }));
vi.mock("@/lib/email-delivery", () => ({ deliverEmail: vi.fn() }));

import { getReturnNotificationContent } from "@/lib/return-notifications";

describe("return lifecycle notifications", () => {
  it("provides actionable pickup guidance", () => {
    expect(getReturnNotificationContent("PICKUP_SCHEDULED")).toEqual({
      label: "Pickup Scheduled",
      guidance: "Your pickup window and return-label details are available in your account.",
    });
  });

  it("distinguishes refund and replacement progress", () => {
    expect(getReturnNotificationContent("REFUND_PROCESSING").guidance).toContain("provider confirmation");
    expect(getReturnNotificationContent("REPLACEMENT_CREATED").guidance).toContain("replacement order");
  });
});
