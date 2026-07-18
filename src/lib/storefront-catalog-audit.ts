import type { Product } from "./catalog";
import { validateStorefrontProductContract } from "./product-field-contract";
import { resolveProductGalleryMedia } from "./product-gallery-presentation";

export type StorefrontCatalogAuditIssue = {
  productSlug: string;
  field: string;
  severity: "critical" | "warning";
  message: string;
};

function issue(product: Product, field: string, message: string, severity: "critical" | "warning" = "critical"): StorefrontCatalogAuditIssue {
  return { productSlug: product.slug || product.id || "unknown", field, severity, message };
}

function trimmedUnique(values: string[]) {
  return new Set(values.map((value) => value.trim()).filter(Boolean));
}

export function auditStorefrontProduct(product: Product): StorefrontCatalogAuditIssue[] {
  const issues: StorefrontCatalogAuditIssue[] = validateStorefrontProductContract(product).map((contractIssue) =>
    issue(product, String(contractIssue.field), contractIssue.message),
  );

  if (product.price <= 0 || !Number.isFinite(product.price)) {
    issues.push(issue(product, "price", "Product price must be a positive finite number."));
  }
  if (product.salePrice != null && product.salePrice >= product.price) {
    issues.push(issue(product, "salePrice", "Sale price must be lower than the regular price."));
  }
  if (!product.collection && !product.collections?.length) {
    issues.push(issue(product, "collections", "Published products should belong to at least one public collection.", "warning"));
  }
  if (trimmedUnique(product.colors).size !== product.colors.length) {
    issues.push(issue(product, "colors", "Color names must be unique and non-empty."));
  }
  if (trimmedUnique(product.sizes).size !== product.sizes.length) {
    issues.push(issue(product, "sizes", "Size names must be unique and non-empty."));
  }

  const variants = product.variants ?? [];
  const variantKeys = new Set<string>();
  for (const variant of variants) {
    const key = `${variant.color.name}::${variant.size.name}`;
    if (variantKeys.has(key)) {
      issues.push(issue(product, "variants", `Duplicate sellable variant for ${variant.color.name} / ${variant.size.name}.`));
    }
    variantKeys.add(key);

    if (!product.colors.includes(variant.color.name)) {
      issues.push(issue(product, "variants", `Variant color ${variant.color.name} is missing from product colors.`));
    }
    if (!product.sizes.includes(variant.size.name)) {
      issues.push(issue(product, "variants", `Variant size ${variant.size.name} is missing from product sizes.`));
    }
    if (variant.stock < 0 || (variant.reservedStock ?? 0) < 0) {
      issues.push(issue(product, "variants", `Variant ${variant.color.name} / ${variant.size.name} has negative stock or reservation values.`));
    }
  }

  for (const color of product.colors) {
    const colorVariants = variants.filter((variant) => variant.color.name === color);
    if (!colorVariants.length) {
      issues.push(issue(product, "variants", `Color ${color} has no sellable variants.`));
    }

    const gallery = resolveProductGalleryMedia(product, color).filter((media) => media.type === "IMAGE");
    if (!gallery.length) {
      issues.push(issue(product, "variantMediaByColor", `Color ${color} has no PDP image gallery.`));
      continue;
    }

    const colorSpecificGallery = product.variantMediaByColor?.[color]?.filter((media) => media.type === "IMAGE") ?? [];
    if (!colorSpecificGallery.length) {
      issues.push(issue(product, "variantMediaByColor", `Color ${color} falls back to product-level images instead of a color-specific gallery.`, "warning"));
    }

    const galleryUrls = gallery.map((media) => media.url.trim()).filter(Boolean);
    if (galleryUrls.length !== gallery.length) {
      issues.push(issue(product, "variantMediaByColor", `Color ${color} has blank media URLs.`));
    }
    if (new Set(galleryUrls).size !== galleryUrls.length) {
      issues.push(issue(product, "variantMediaByColor", `Color ${color} has duplicate gallery media.`));
    }
    if (colorSpecificGallery.length && !colorSpecificGallery.some((media) => media.isHoverImage)) {
      issues.push(issue(product, "variantMediaByColor", `Color ${color} has no designated hover image.`, "warning"));
    }
  }

  return issues;
}

export function auditStorefrontCatalog(products: Product[]) {
  return products.flatMap(auditStorefrontProduct);
}
