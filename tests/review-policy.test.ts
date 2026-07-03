import { describe, expect, it } from "vitest";
import { canEditReview, getReviewEditableUntil } from "@/lib/review-policy";

describe("review edit policy", () => {
  it("keeps a submitted review editable for seven days", () => {
    const createdAt = new Date("2026-06-01T10:00:00.000Z");
    expect(getReviewEditableUntil(createdAt).toISOString()).toBe("2026-06-08T10:00:00.000Z");
    expect(canEditReview(getReviewEditableUntil(createdAt), new Date("2026-06-08T09:59:59.000Z"))).toBe(true);
  });

  it("closes edits at the deadline", () => {
    const deadline = new Date("2026-06-08T10:00:00.000Z");
    expect(canEditReview(deadline, deadline)).toBe(false);
    expect(canEditReview(deadline, new Date("2026-06-09T00:00:00.000Z"))).toBe(false);
  });
});
