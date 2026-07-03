import { describe, expect, it } from "vitest";
import { buildPublishedReviewPresentation, buildReviewStructuredData } from "@/lib/review-presentation";

const review = (overrides: Record<string, unknown> = {}) => ({
  id: "review-1",
  status: "APPROVED",
  rating: 5,
  title: "Excellent fit",
  body: "Supportive and comfortable for long sessions.",
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  verifiedPurchase: true,
  adminResponse: null,
  respondedAt: null,
  user: { name: "Customer" },
  media: [{ id: "approved-media", status: "APPROVED", altText: "Product in use" }, { id: "pending-media", status: "PENDING", altText: null }],
  ...overrides,
});

describe("review moderation presentation", () => {
  it("uses only approved reviews and approved media in storefront aggregates", () => {
    const result = buildPublishedReviewPresentation([
      review(),
      review({ id: "pending", status: "PENDING", rating: 1 }),
      review({ id: "rejected", status: "REJECTED", rating: 2 }),
      review({ id: "approved-2", rating: 3, media: [] }),
    ]);

    expect(result.count).toBe(2);
    expect(result.rating).toBe(4);
    expect(result.items.map((item) => item.id)).toEqual(["review-1", "approved-2"]);
    expect(result.items[0].media?.map((media) => media.id)).toEqual(["approved-media"]);
  });

  it("builds product structured data from the same moderated items", () => {
    const result = buildPublishedReviewPresentation([review(), review({ id: "pending", status: "PENDING" })]);
    const structured = buildReviewStructuredData(result.items);
    expect(structured).toHaveLength(1);
    expect(structured[0]).toMatchObject({ "@type": "Review", name: "Excellent fit", reviewRating: { ratingValue: 5 } });
  });
});
