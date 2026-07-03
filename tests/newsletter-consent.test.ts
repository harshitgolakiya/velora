import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createNewsletterToken,
  defaultNewsletterPreferences,
  parseNewsletterPreferences,
  verifyNewsletterToken,
} from "@/lib/newsletter-consent";

describe("newsletter consent tokens and preferences", () => {
  const previousSecret = process.env.NEWSLETTER_TOKEN_SECRET;

  beforeEach(() => {
    process.env.NEWSLETTER_TOKEN_SECRET = "test-newsletter-secret";
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.NEWSLETTER_TOKEN_SECRET;
    else process.env.NEWSLETTER_TOKEN_SECRET = previousSecret;
  });

  it("creates a signed token for a normalized email", () => {
    const token = createNewsletterToken(" Customer@Example.com ");
    expect(verifyNewsletterToken(token)?.email).toBe("customer@example.com");
  });

  it("rejects tampered and expired tokens", () => {
    const token = createNewsletterToken("customer@example.com");
    expect(verifyNewsletterToken(`${token}x`)).toBeNull();
    expect(verifyNewsletterToken(createNewsletterToken("customer@example.com", -1))).toBeNull();
  });

  it("uses safe defaults for missing preferences and preserves explicit opt-outs", () => {
    expect(parseNewsletterPreferences(null)).toEqual(defaultNewsletterPreferences);
    expect(parseNewsletterPreferences('{"editorial":false,"product":true,"offers":false}')).toEqual({
      editorial: false,
      product: true,
      offers: false,
    });
  });
});
