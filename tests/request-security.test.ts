import { afterEach, describe, expect, it, vi } from "vitest";
import { isSameOriginRequest, requireSameOriginRequest } from "@/lib/request-security";

describe("same-origin request guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts configured production origins", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://velora.test");
    const request = new Request("https://preview.velora.test/api/account/profile", {
      method: "PUT",
      headers: { origin: "https://velora.test" },
    });

    expect(isSameOriginRequest(request)).toBe(true);
    expect(requireSameOriginRequest(request)).toBeNull();
  });

  it("accepts the current request origin for deploy previews", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://velora.com");
    const request = new Request("https://preview.velora.test/api/account/profile", {
      method: "PUT",
      headers: { origin: "https://preview.velora.test" },
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects missing or cross-site origins", async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://velora.test");
    const missing = requireSameOriginRequest(new Request("https://velora.test/api/account/profile", { method: "PUT" }));
    const crossSite = requireSameOriginRequest(new Request("https://velora.test/api/account/profile", {
      method: "PUT",
      headers: { origin: "https://attacker.test" },
    }));

    expect(missing?.status).toBe(403);
    expect(crossSite?.status).toBe(403);
    await expect(crossSite?.json()).resolves.toMatchObject({ message: expect.stringContaining("Security check failed") });
  });
});
