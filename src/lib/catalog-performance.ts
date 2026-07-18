import type { Product } from "./catalog";

export function compactProductForList(product: Product): Product {
  return {
    ...product,
    images: product.images.slice(0, 2),
    variants: product.variants?.map((variant) => ({
      ...variant,
      media: [],
    })),
    reviewItems: undefined,
    collectionDetails: undefined,
    care: "",
    description: product.description.length > 240 ? `${product.description.slice(0, 237)}...` : product.description,
    dimensionNotes: undefined,
    fitSummary: undefined,
    modelReference: undefined,
    seoDescription: undefined,
    seoTitle: undefined,
    sizeAdvice: undefined,
    socialImage: undefined,
  };
}

export function compactProductsForList(products: Product[]): Product[] {
  return products.map(compactProductForList);
}
