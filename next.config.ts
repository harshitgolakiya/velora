import type { NextConfig } from "next";

type SecurityHeaderOptions = {
  production?: boolean;
};

export function buildContentSecurityPolicy({ production = process.env.NODE_ENV === "production" }: SecurityHeaderOptions = {}) {
  const directives = new Map<string, string[]>([
    ["default-src", ["'self'"]],
    ["base-uri", ["'self'"]],
    ["object-src", ["'none'"]],
    ["frame-ancestors", ["'none'"]],
    ["form-action", ["'self'"]],
    ["script-src", [
      "'self'",
      "'unsafe-inline'",
      "https://js.stripe.com",
      "https://www.paypal.com",
      "https://www.sandbox.paypal.com",
      "https://checkout.tabby.ai",
    ]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["font-src", ["'self'", "data:"]],
    ["media-src", ["'self'", "blob:", "https:"]],
    ["connect-src", [
      "'self'",
      "https://api.stripe.com",
      "https://checkout.stripe.com",
      "https://api-m.paypal.com",
      "https://api-m.sandbox.paypal.com",
      "https://api.tabby.ai",
      "https://a.klaviyo.com",
    ]],
    ["frame-src", [
      "https://js.stripe.com",
      "https://hooks.stripe.com",
      "https://www.paypal.com",
      "https://www.sandbox.paypal.com",
      "https://checkout.tabby.ai",
      "https://iframe.videodelivery.net",
      "https://*.cloudflarestream.com",
    ]],
  ]);

  if (!production) directives.get("script-src")?.push("'unsafe-eval'");
  if (production) directives.set("upgrade-insecure-requests", []);

  return Array.from(directives.entries())
    .map(([directive, values]) => [directive, ...values].join(" "))
    .join("; ");
}

export function buildSecurityHeaders(options?: SecurityHeaderOptions) {
  const production = options?.production ?? process.env.NODE_ENV === "production";
  const headers = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy({ production }),
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(self), browsing-topics=()",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
  ];

  if (production) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // Product videos are uploaded through the admin API. Next.js otherwise
    // truncates proxied request bodies at its 10 MB default.
    proxyClientMaxBodySize: "100mb",
  },
  productionBrowserSourceMaps: process.env.PRODUCTION_BROWSER_SOURCE_MAPS === "true",
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 72, 75, 78, 80, 84, 85, 92],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.dummyjson.com" },
      { protocol: "https", hostname: "fakestoreapi.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "i.imgur.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: buildSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
