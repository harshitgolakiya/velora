import { describe, expect, it } from "vitest";
import { contactRequestSchema, isContactSubmissionTooFast } from "@/lib/contact-support";

const valid = {
  name: "Customer Name",
  email: "CUSTOMER@EXAMPLE.COM",
  category: "ORDER",
  subject: "Order delivery question",
  message: "Please confirm when my active order will be dispatched.",
  orderNumber: "VL-2026-123456",
  website: "",
  startedAt: 1_000,
};

describe("contact support validation", () => {
  it("normalizes valid order-aware requests", () => {
    const result = contactRequestSchema.parse(valid);
    expect(result.email).toBe("customer@example.com");
    expect(result.orderNumber).toBe("VL-2026-123456");
  });

  it("rejects honeypot and incomplete messages", () => {
    expect(contactRequestSchema.safeParse({ ...valid, website: "spam" }).success).toBe(false);
    expect(contactRequestSchema.safeParse({ ...valid, message: "Too short" }).success).toBe(false);
  });

  it("blocks unrealistically fast submissions", () => {
    expect(isContactSubmissionTooFast(10_000, 11_000)).toBe(true);
    expect(isContactSubmissionTooFast(10_000, 11_500)).toBe(false);
  });
});
