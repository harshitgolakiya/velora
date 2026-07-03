import type { Product } from "./catalog";

type ReviewRecord = {
  id: string;
  status: string;
  rating: number;
  title: string;
  body: string;
  createdAt: Date;
  verifiedPurchase: boolean;
  adminResponse: string | null;
  respondedAt: Date | null;
  user: { name: string | null } | null;
  media: Array<{ id: string; status: string; altText: string | null }>;
};

export function buildPublishedReviewPresentation(reviews: ReviewRecord[]) {
  const approved = reviews.filter((review) => review.status === "APPROVED");
  return {
    rating: approved.length ? approved.reduce((sum, review) => sum + review.rating, 0) / approved.length : 0,
    count: approved.length,
    items: approved.map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      createdAt: review.createdAt.toISOString(),
      verifiedPurchase: review.verifiedPurchase,
      customerName: review.user?.name ?? "Customer",
      media: review.media.filter((media) => media.status === "APPROVED").map((media) => ({
        id: media.id,
        url: `/api/reviews/media/${media.id}`,
        altText: media.altText ?? undefined,
      })),
      adminResponse: review.adminResponse ?? undefined,
      respondedAt: review.respondedAt?.toISOString(),
    })),
  };
}

export function buildReviewStructuredData(reviews: NonNullable<Product["reviewItems"]>) {
  return reviews.map((review) => ({
    "@type": "Review",
    name: review.title,
    reviewBody: review.body,
    datePublished: review.createdAt,
    author: { "@type": "Person", name: review.customerName ?? "Customer" },
    reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5 },
  }));
}
