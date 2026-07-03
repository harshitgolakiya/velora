import type { Product } from "./catalog";

export type ProductBadge = {
  label: string;
  tone: "dark" | "light" | "sale";
};

export function getDiscountPercentage(product: Pick<Product, "price" | "salePrice">) {
  if (!product.salePrice || product.salePrice >= product.price) return 0;
  return Math.round(((product.price - product.salePrice) / product.price) * 100);
}

export function getProductBadges(
  product: Pick<Product, "badge" | "bestSeller" | "newArrival" | "salePrice" | "price" | "stock">,
) {
  const badges: ProductBadge[] = [];
  const discount = getDiscountPercentage(product);

  if (discount) badges.push({ label: `${discount}% off`, tone: "sale" });
  if (product.stock > 0 && product.stock <= 5) badges.push({ label: "Low stock", tone: "dark" });
  if (product.newArrival) badges.push({ label: "New", tone: "light" });
  if (product.bestSeller) badges.push({ label: "Best seller", tone: "light" });
  if (product.badge && !badges.some((badge) => badge.label.toLowerCase() === product.badge?.toLowerCase())) {
    badges.push({ label: product.badge, tone: "light" });
  }

  return badges.slice(0, 2);
}
