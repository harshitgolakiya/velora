import type { Product } from "./catalog";

type PublicState = {
  status?: string | null;
  deletedAt?: string | Date | null;
};

export function isPublicProduct(product: Product & PublicState) {
  const status = product.status?.toUpperCase?.();
  return !product.deletedAt && (!status || status === "PUBLISHED");
}

export function filterPublicProducts<T extends Product & PublicState>(products: T[]) {
  return products.filter(isPublicProduct);
}
