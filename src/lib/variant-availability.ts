import type { Product, ProductVariant } from "./catalog";

function isSellable(variant: ProductVariant | undefined) {
  if (!variant) return false;
  if (variant.stock > 0) return true;
  if (!variant.allowBackorder) return false;
  return variant.backorderAvailable == null || variant.backorderAvailable > 0;
}

export function getVariantAvailability(product: Pick<Product, "variants" | "stock">, color: string, requestedSize: string) {
  const variants = product.variants ?? [];
  const colorVariants = variants.filter((variant) => variant.color.name === color);
  const requestedVariant = colorVariants.find((variant) => variant.size.name === requestedSize);
  const availableSizesForColor = colorVariants
    .filter(isSellable)
    .map((variant) => variant.size.name);
  const firstAvailableSize = availableSizesForColor[0];
  const selectedSizeAvailable = isSellable(requestedVariant);
  const effectiveSize = colorVariants.length && !selectedSizeAvailable ? firstAvailableSize ?? requestedSize : requestedSize;
  const selectedVariant = variants.find((variant) => variant.color.name === color && variant.size.name === effectiveSize);
  const canBackorder = Boolean(selectedVariant?.allowBackorder);
  const outOfStock = selectedVariant ? !isSellable(selectedVariant) : product.stock <= 0;
  const sameSizeAlternativeColors = variants
    .filter((variant) => variant.size.name === requestedSize && variant.color.name !== color && isSellable(variant))
    .map((variant) => variant.color.name)
    .filter((value, index, list) => list.indexOf(value) === index);

  return {
    colorVariants,
    requestedVariant,
    selectedVariant,
    selectedSizeAvailable,
    effectiveSize,
    canBackorder,
    outOfStock,
    availableSizesForColor,
    sameSizeAlternativeColors,
    needsRecovery: colorVariants.length > 0 && requestedSize !== effectiveSize,
  };
}
