import { describe, expect, it } from "vitest";
import { hashGiftCardCode, normalizeGiftCardCode } from "@/lib/gift-cards";

describe("gift cards", () => {
  it("normalizes formatted codes before hashing", () => {
    expect(normalizeGiftCardCode("vlgc-1234 abcd")).toBe("VLGC1234ABCD");
    expect(hashGiftCardCode("VLGC-1234-ABCD")).toBe(hashGiftCardCode("vlgc 1234 abcd"));
  });
});
