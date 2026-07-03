import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { workflowEmail } from "@/lib/email-delivery";
import {
  buildShippingLabelHtml,
  createShippingLabelId,
  createTrackingNumber,
} from "@/lib/shipping-labels";

describe("shipping labels", () => {
  it("creates provider-ready identifiers", () => {
    expect(createShippingLabelId()).toMatch(/^lbl_[a-f0-9]{20}$/);
    expect(createTrackingNumber("VL-1001")).toMatch(/^VEL-VL1001-[A-F0-9]{8}$/);
  });

  it("escapes customer-controlled label fields", () => {
    const html = buildShippingLabelHtml({
      labelId: "lbl_test",
      orderNumber: "VL-1001",
      carrier: "Velora Logistics",
      trackingNo: "VEL-VL1001-12345678",
      customerName: "<script>alert(1)</script>",
      address: "1 & 2 Test Street",
      itemCount: 2,
    });

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("1 &amp; 2 Test Street");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("@page { size: 4in 6in;");
  });

  it("renders a reverse-logistics pickup label", () => {
    const html = buildShippingLabelHtml({
      labelId: "return-label-1",
      orderNumber: "VL-100",
      carrier: "Velora Returns",
      trackingNo: "RET-100",
      customerName: "Customer",
      address: "Dubai",
      itemCount: 1,
      addressLabel: "Pickup from",
      serviceLabel: "UAE Return",
    });
    expect(html).toContain("Pickup from");
    expect(html).toContain("UAE Return");
  });
});

describe("automation email templates", () => {
  it("builds the correct abandoned-cart message", () => {
    const email = workflowEmail({
      type: "ABANDONED_CART",
      customerName: "Maya",
      cartValue: 420,
    });

    expect(email.subject).toBe("Your Velora edit is still available");
    expect(email.html).toContain("Hello Maya");
    expect(email.html).toContain("AED 420");
  });
});
