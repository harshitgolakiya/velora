import type { Product } from "./catalog";

export type ProductFieldContract = {
  adminField: string;
  storefrontField: keyof Product;
  required: boolean;
  purpose: string;
};

export type ProductFieldContractIssue = {
  field: keyof Product;
  message: string;
};

export const productFieldContract: ProductFieldContract[] = [
  { adminField: "title", storefrontField: "name", required: true, purpose: "PDP, cards, search, cart, orders" },
  { adminField: "slug", storefrontField: "slug", required: true, purpose: "Storefront routes and canonical URLs" },
  { adminField: "sku", storefrontField: "sku", required: false, purpose: "Admin operations and customer service lookup" },
  { adminField: "price", storefrontField: "price", required: true, purpose: "Cards, PDP, cart, checkout" },
  { adminField: "salePrice", storefrontField: "salePrice", required: false, purpose: "Sale display and offer metadata" },
  { adminField: "category.name", storefrontField: "category", required: true, purpose: "Breadcrumbs, filters, fit defaults" },
  { adminField: "collections", storefrontField: "collectionDetails", required: false, purpose: "Editorial grouping and collection pages" },
  { adminField: "description", storefrontField: "description", required: true, purpose: "PDP copy and SEO fallback" },
  { adminField: "fabricDetails", storefrontField: "fabric", required: true, purpose: "PDP details and material filters" },
  { adminField: "careInstructions", storefrontField: "care", required: true, purpose: "PDP care tab and support content" },
  { adminField: "fitSummary", storefrontField: "fitSummary", required: false, purpose: "PDP fit guidance override" },
  { adminField: "modelReference", storefrontField: "modelReference", required: false, purpose: "PDP fit guidance override" },
  { adminField: "sizeAdvice", storefrontField: "sizeAdvice", required: false, purpose: "PDP size guidance override" },
  { adminField: "dimensionNotes", storefrontField: "dimensionNotes", required: false, purpose: "PDP size and fit bullet notes" },
  { adminField: "tags", storefrontField: "tags", required: false, purpose: "Search, recommendations, merchandising" },
  { adminField: "colors", storefrontField: "colors", required: true, purpose: "Cards, PDP selectors, filters" },
  { adminField: "sizes", storefrontField: "sizes", required: true, purpose: "PDP selectors, filters, fit preferences" },
  { adminField: "variants", storefrontField: "variants", required: true, purpose: "SKU, stock, backorder, cart validation" },
  { adminField: "images", storefrontField: "images", required: true, purpose: "Cards, PDP fallback gallery, social images" },
  { adminField: "variant.medias", storefrontField: "variantMediaByColor", required: false, purpose: "Per-color PDP gallery and hover media" },
  { adminField: "seoTitle", storefrontField: "seoTitle", required: false, purpose: "Metadata title override" },
  { adminField: "seoDescription", storefrontField: "seoDescription", required: false, purpose: "Metadata description override" },
  { adminField: "socialImage", storefrontField: "socialImage", required: false, purpose: "Open Graph image override" },
];

export function validateStorefrontProductContract(product: Product): ProductFieldContractIssue[] {
  return productFieldContract
    .filter((field) => field.required)
    .flatMap((field) => {
      const value = product[field.storefrontField];
      const missing =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === "number" && !Number.isFinite(value));

      return missing
        ? [{ field: field.storefrontField, message: `${field.storefrontField} is required for ${field.purpose}.` }]
        : [];
    });
}
