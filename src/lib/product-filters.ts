import type { Collection, Product } from "./catalog";
import { uniqueCatalogAttributes } from "./catalog-attributes";

export type FilterOptions = {
  categories: string[];
  collections: Collection[];
  colors: string[];
  sizes: string[];
  genders: string[];
  materials: string[];
  styles: string[];
};

export const genderNames = ["Women", "Men", "Unisex"];

export const materialNames = [
  "Nylon",
  "Polyamide",
  "Polyester",
  "Spandex",
  "Elastane",
  "Cotton",
  "Modal",
  "Viscose",
  "Rayon",
  "Rib",
  "Mesh",
  "Fleece",
  "Faux Fur",
  "Seamless",
];

function uniqueSorted(values: string[]) {
  return uniqueCatalogAttributes(values);
}

export function matchesTag(product: Product, value: string) {
  return product.tags?.some((tag) => tag.toLowerCase() === value.toLowerCase()) ?? false;
}

export function scopedProducts(products: Product[], collectionSlug?: string) {
  if (!collectionSlug) return products;
  return products.filter((product) => product.collections?.includes(collectionSlug) || product.collection === collectionSlug);
}

export function deriveFilterOptions({
  products,
  categories,
  collections,
  currentCollection,
}: {
  products: Product[];
  categories: string[];
  collections: Collection[];
  currentCollection?: string;
}): FilterOptions {
  const scoped = scopedProducts(products, currentCollection);
  const productCategories = new Set(scoped.map((product) => product.category));
  const productCollections = new Set(scoped.flatMap((product) => product.collections?.length ? product.collections : [product.collection]));
  const excludedStyleTags = new Set([...genderNames, ...materialNames].map((item) => item.toLowerCase()));

  return {
    categories: categories.filter((category) => productCategories.has(category)),
    collections: currentCollection ? [] : collections.filter((collection) => productCollections.has(collection.slug)),
    colors: uniqueSorted(scoped.flatMap((product) => product.colors)),
    sizes: uniqueSorted(scoped.flatMap((product) => product.sizes)),
    genders: genderNames.filter((item) => scoped.some((product) => matchesTag(product, item))),
    materials: materialNames.filter((item) =>
      scoped.some((product) => product.fabric.toLowerCase().includes(item.toLowerCase()) || matchesTag(product, item)),
    ),
    styles: uniqueSorted(
      scoped.flatMap((product) => product.tags ?? []).filter((tag) => !excludedStyleTags.has(tag.toLowerCase())),
    ),
  };
}

export function filterProducts({
  products,
  collection,
  selectedCollection,
  category,
  size,
  color,
  gender,
  style,
  material,
}: {
  products: Product[];
  collection?: string;
  selectedCollection: string;
  category: string;
  size: string;
  color: string;
  gender: string;
  style: string;
  material: string;
}) {
  return products
    .filter((product) => !collection || product.collections?.includes(collection) || product.collection === collection)
    .filter((product) => selectedCollection === "All" || product.collections?.includes(selectedCollection) || product.collection === selectedCollection)
    .filter((product) => category === "All" || product.category === category)
    .filter((product) => size === "All" || product.sizes.includes(size))
    .filter((product) => color === "All" || product.colors.includes(color))
    .filter((product) => gender === "All" || matchesTag(product, gender))
    .filter((product) => style === "All" || matchesTag(product, style))
    .filter((product) => material === "All" || product.fabric.toLowerCase().includes(material.toLowerCase()) || matchesTag(product, material));
}
