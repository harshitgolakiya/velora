export const REVIEW_EDIT_WINDOW_DAYS = 7;

export function getReviewEditableUntil(createdAt = new Date()) {
  return new Date(createdAt.getTime() + REVIEW_EDIT_WINDOW_DAYS * 24 * 60 * 60_000);
}

export function canEditReview(editableUntil: Date | null | undefined, now = new Date()) {
  return !editableUntil || editableUntil.getTime() > now.getTime();
}
