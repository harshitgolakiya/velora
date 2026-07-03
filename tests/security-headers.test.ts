import { describe, expect, it } from "vitest";
import nextConfig, { buildContentSecurityPolicy, buildSecurityHeaders } from "../next.config";

function headerMap(headers: Array<{ key: string; value: string }>) {
  return new Map(headers.map((header) => [header.key.toLowerCase(), header.value]));
}

describe("security headers", () => {
  it("adds core browser hardening headers to every route", async () => {
    const headers = await nextConfig.headers?.();
    const globalHeaders = headers?.find((entry) => entry.source === "/:path*")?.headers ?? [];
    const mapped = headerMap(globalHeaders);

    expect(mapped.get("content-security-policy")).toContain("default-src 'self'");
    expect(mapped.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(mapped.get("content-security-policy")).toContain("object-src 'none'");
    expect(mapped.get("content-security-policy")).toContain("base-uri 'self'");
    expect(mapped.get("permissions-policy")).toContain("camera=()");
    expect(mapped.get("permissions-policy")).toContain("payment=(self)");
    expect(mapped.get("x-frame-options")).toBe("DENY");
    expect(mapped.get("x-content-type-options")).toBe("nosniff");
    expect(mapped.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  });

  it("keeps production CSP stricter than development CSP", () => {
    expect(buildContentSecurityPolicy({ production: false })).toContain("'unsafe-eval'");

    const productionCsp = buildContentSecurityPolicy({ production: true });
    expect(productionCsp).not.toContain("'unsafe-eval'");
    expect(productionCsp).toContain("upgrade-insecure-requests");
  });

  it("only sends HSTS in production header sets", () => {
    expect(headerMap(buildSecurityHeaders({ production: false })).has("strict-transport-security")).toBe(false);
    expect(headerMap(buildSecurityHeaders({ production: true })).get("strict-transport-security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
  });
});
