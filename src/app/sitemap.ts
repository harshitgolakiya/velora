import type { MetadataRoute } from "next";
import { getCmsCollections, getCmsProducts } from "@/lib/cms";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticRoutes = ["", "/shop", "/story", "/contact", "/fabric-guide", "/size-guide", "/care-guide", "/faqs", "/shipping", "/returns", "/privacy", "/terms"];
  const [products, collections] = await Promise.all([
    getCmsProducts("en"),
    getCmsCollections("en"),
  ]);

  return [
    ...staticRoutes.map((route) => ({ url: `${base}${route}`, lastModified: new Date() })),
    ...products.map((product) => ({
      url: `${base}/product/${product.slug}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
    })),
    ...collections.map((collection) => ({ url: `${base}/collections/${collection.slug}`, lastModified: new Date() })),
  ];
}
