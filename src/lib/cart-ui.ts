import type { ProductVariant } from "./catalog";
import type { CartLine } from "./store";

export type CartRecommendation = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  image: string;
};

export function getCartLineVariant(line: CartLine): ProductVariant | undefined {
  return line.product.variants?.find(
    (variant) =>
      variant.size.name === line.size && variant.color.name === line.color,
  );
}

export function getCartLineImage(line: CartLine): string {
  const colorMedia = line.product.variantMediaByColor?.[line.color] ?? [];
  return (
    colorMedia.find((media) => media.type === "IMAGE" && !media.isHoverImage)?.url ??
    colorMedia.find((media) => media.type === "IMAGE")?.url ??
    line.product.images[0]
  );
}

export function getCartLineAvailability(line: CartLine) {
  const variant = getCartLineVariant(line);
  return {
    variant,
    stock: variant?.stock ?? 0,
    allowsBackorder: Boolean(variant?.allowBackorder),
    canIncrease: Boolean(
      variant?.allowBackorder || (variant && line.quantity < variant.stock),
    ),
    isLowStock: Boolean(
      variant &&
        variant.stock > 0 &&
        variant.stock <= Math.max(variant.lowStockThreshold ?? 3, 1),
    ),
  };
}

export function isCartReservationExpired(
  expiresAt?: string,
  now = Date.now(),
): boolean {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= now);
}
