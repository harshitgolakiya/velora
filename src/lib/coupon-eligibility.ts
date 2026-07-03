export type CouponEligibility = {
  eligibleProductIds?: string | null;
  eligibleCategories?: string | null;
  eligibleCollections?: string | null;
  excludedProductIds?: string | null;
};

export type CouponCartItem = {
  productId?: string | null;
  category?: string | null;
  collections?: string[] | null;
  lineTotal: number;
};

export function parseCouponList(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
  } catch {
    // Fall back to comma-separated legacy/admin input.
  }
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function couponHasEligibilityRules(coupon: CouponEligibility) {
  return Boolean(
    parseCouponList(coupon.eligibleProductIds).length ||
    parseCouponList(coupon.eligibleCategories).length ||
    parseCouponList(coupon.eligibleCollections).length ||
    parseCouponList(coupon.excludedProductIds).length
  );
}

export function getCouponEligibleSubtotal(coupon: CouponEligibility, items: CouponCartItem[], subtotal: number) {
  if (!couponHasEligibilityRules(coupon)) return subtotal;
  const eligibleProductIds = new Set(parseCouponList(coupon.eligibleProductIds));
  const eligibleCategories = new Set(parseCouponList(coupon.eligibleCategories));
  const eligibleCollections = new Set(parseCouponList(coupon.eligibleCollections));
  const excludedProductIds = new Set(parseCouponList(coupon.excludedProductIds));
  const hasInclusionRules = Boolean(
    eligibleProductIds.size ||
    eligibleCategories.size ||
    eligibleCollections.size
  );

  return items.reduce((sum, item) => {
    if (item.productId && excludedProductIds.has(item.productId)) return sum;
    const collectionMatch = (item.collections ?? []).some((collection) => eligibleCollections.has(collection));
    const included = !hasInclusionRules ||
      (item.productId ? eligibleProductIds.has(item.productId) : false) ||
      (item.category ? eligibleCategories.has(item.category) : false) ||
      collectionMatch;
    return included ? sum + item.lineTotal : sum;
  }, 0);
}

export function serializeCouponList(value: unknown) {
  if (Array.isArray(value)) {
    const items = value.map(String).map((item) => item.trim()).filter(Boolean);
    return items.length ? JSON.stringify(items) : null;
  }
  const items = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? JSON.stringify(items) : null;
}
