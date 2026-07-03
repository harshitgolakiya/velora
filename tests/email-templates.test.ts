import { describe, expect, it } from "vitest";
import { fallbackWorkflowEmail, renderEmailTemplate } from "@/lib/email-templates";

describe("email templates", () => {
  it("renders known variables and removes unknown values safely", () => {
    const html = renderEmailTemplate(
      "Hello {{ customerName }} {{orderNumber}} {{missing}} {{cartValue}}",
      {
        type: "ABANDONED_CART",
        customerName: "Amira",
        orderNumber: "VL-1",
        cartValue: 299,
      },
    );
    expect(html).toBe("Hello Amira VL-1  , valued at AED 299");
  });

  it("keeps a transactional fallback when no published template exists", () => {
    const message = fallbackWorkflowEmail({
      type: "REVIEW_REQUEST",
      customerName: "Amira",
      productName: "Soft Leggings",
      productSlug: "soft-leggings",
    });
    expect(message.subject).toContain("Soft Leggings");
    expect(message.html).toContain("/product/soft-leggings#reviews");
  });

  it("renders Arabic fallback copy with RTL direction and Arabic storefront links", () => {
    const message = fallbackWorkflowEmail({
      type: "ABANDONED_CART",
      customerName: "Amira",
      cartValue: 300,
      locale: "ar",
    });

    expect(message.subject).toContain("Velora");
    expect(message.html).toContain('dir="rtl"');
    expect(message.html).toContain("/ar/shop");
    expect(message.html).toContain("AED 300");
  });

  it("localizes template storefront URLs from locale context", () => {
    const html = renderEmailTemplate("{{shopUrl}} {{reviewUrl}}", {
      type: "REVIEW_REQUEST",
      productSlug: "soft-leggings",
      locale: "ar",
    });

    expect(html).toContain("/ar/shop");
    expect(html).toContain("/ar/product/soft-leggings#reviews");
  });
});
