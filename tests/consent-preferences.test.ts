import { describe, expect, it } from "vitest";
import {
  acceptedConsentPreferences,
  consentCookieValue,
  normalizeConsentPreferences,
  parseConsentPreferences,
  rejectedConsentPreferences,
} from "@/lib/consent-preferences";

describe("consent preferences", () => {
  it("normalizes unknown preference payloads into explicit booleans", () => {
    expect(normalizeConsentPreferences({ analytics: 1, marketing: "", preferences: true })).toMatchObject({
      necessary: true,
      analytics: true,
      marketing: false,
      preferences: true,
    });
  });

  it("parses invalid stored consent safely", () => {
    expect(parseConsentPreferences("broken")).toBeNull();
    expect(parseConsentPreferences(null)).toBeNull();
  });

  it("serializes cookie-safe consent summaries", () => {
    expect(consentCookieValue(acceptedConsentPreferences(new Date("2026-01-01")))).toBe("analytics:1|marketing:1|preferences:1");
    expect(consentCookieValue(rejectedConsentPreferences(new Date("2026-01-01")))).toBe("analytics:0|marketing:0|preferences:0");
  });
});
