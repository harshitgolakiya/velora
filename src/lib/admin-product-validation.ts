import "server-only";

import { prisma } from "./prisma";

type ProductSkuValidationInput = {
  productId?: string;
  productSku: string;
  sizeNames: string[];
  colors: {
    name: string;
    skuBySize: Record<string, string>;
  }[];
};

export function buildVariantSku(baseSku: string, sizeName: string, colorName: string, customSku?: string) {
  return (
    customSku?.trim() ||
    `${baseSku}-${sizeName}-${colorName}`.toUpperCase().replace(/\s+/g, "-")
  );
}

export function collectVariantSkus(input: ProductSkuValidationInput) {
  return input.colors.flatMap((color) =>
    input.sizeNames.map((size) => buildVariantSku(input.productSku, size, color.name, color.skuBySize[size])),
  );
}

export function findDuplicateSkus(skus: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  skus.forEach((sku) => {
    const normalized = sku.trim().toUpperCase();
    if (!normalized) return;
    if (seen.has(normalized)) duplicates.add(sku.trim());
    seen.add(normalized);
  });

  return Array.from(duplicates);
}

export async function validateExplicitProductSkus(input: {
  productId?: string;
  productSku: string;
  variantSkus: string[];
}) {
  const duplicateVariantSkus = findDuplicateSkus(input.variantSkus);

  if (duplicateVariantSkus.length) {
    return `Duplicate variant SKU${duplicateVariantSkus.length === 1 ? "" : "s"}: ${duplicateVariantSkus.join(", ")}`;
  }

  const existingProduct = await prisma.product.findUnique({ where: { sku: input.productSku } });
  if (existingProduct && existingProduct.id !== input.productId) {
    return `Product SKU "${input.productSku}" is already used by another product.`;
  }

  const usedVariant = await prisma.productVariant.findFirst({
    where: {
      sku: { in: input.variantSkus },
      ...(input.productId ? { productId: { not: input.productId } } : {}),
    },
    select: { sku: true },
  });

  if (usedVariant?.sku) {
    return `Variant SKU "${usedVariant.sku}" is already used by another product.`;
  }

  return null;
}

export async function validateProductSkus(input: ProductSkuValidationInput) {
  const variantSkus = collectVariantSkus(input);
  const duplicateVariantSkus = findDuplicateSkus(variantSkus);

  if (duplicateVariantSkus.length) {
    return `Duplicate variant SKU${duplicateVariantSkus.length === 1 ? "" : "s"}: ${duplicateVariantSkus.join(", ")}`;
  }

  const existingProduct = await prisma.product.findUnique({ where: { sku: input.productSku } });
  if (existingProduct && existingProduct.id !== input.productId) {
    return `Product SKU "${input.productSku}" is already used by another product.`;
  }

  const usedVariant = await prisma.productVariant.findFirst({
    where: {
      sku: { in: variantSkus },
      ...(input.productId ? { productId: { not: input.productId } } : {}),
    },
    select: { sku: true },
  });

  if (usedVariant?.sku) {
    return `Variant SKU "${usedVariant.sku}" is already used by another product.`;
  }

  return null;
}
