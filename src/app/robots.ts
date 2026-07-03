import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin-login",
        "/account",
        "/checkout",
        "/cart",
        "/search",
        "/*?*",
      ],
    }],
    sitemap: `${base}/sitemap.xml`,
  };
}
