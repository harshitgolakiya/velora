import { beforeEach, describe, expect, it } from "vitest";
import { checkAdminRateLimit, clearAdminRateLimits } from "@/lib/admin-rate-limit";

describe("admin rate limiting", () => {
  beforeEach(() => {
    clearAdminRateLimits();
  });

  it("allows requests within the configured window", () => {
    expect(checkAdminRateLimit("admin-1", { limit: 2, windowMs: 1000, now: 1000 })).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(checkAdminRateLimit("admin-1", { limit: 2, windowMs: 1000, now: 1100 })).toMatchObject({
      allowed: true,
      remaining: 0,
    });
  });

  it("blocks excess requests and resets after the window", () => {
    checkAdminRateLimit("admin-1", { limit: 1, windowMs: 1000, now: 1000 });
    expect(checkAdminRateLimit("admin-1", { limit: 1, windowMs: 1000, now: 1100 }).allowed).toBe(false);
    expect(checkAdminRateLimit("admin-1", { limit: 1, windowMs: 1000, now: 2000 }).allowed).toBe(true);
  });

  it("keeps separate buckets for separate admins", () => {
    checkAdminRateLimit("admin-1", { limit: 1, now: 1000 });
    expect(checkAdminRateLimit("admin-2", { limit: 1, now: 1000 }).allowed).toBe(true);
  });
});
