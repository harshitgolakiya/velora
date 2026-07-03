import { describe, expect, it } from "vitest";
import {
  MAX_RETURN_EVIDENCE_BYTES,
  validateReturnEvidence,
} from "@/lib/return-evidence-validation";

describe("return evidence validation", () => {
  it.each([
    ["image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0x00]), "jpg"],
    ["image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "png"],
    ["image/webp", Buffer.from("RIFF0000WEBP", "ascii"), "webp"],
  ])("accepts a valid %s signature", (mimeType, bytes, extension) => {
    expect(validateReturnEvidence(bytes, mimeType, bytes.length)).toBe(extension);
  });

  it("rejects unsupported formats", () => {
    expect(() => validateReturnEvidence(Uint8Array.from([0x47, 0x49, 0x46]), "image/gif", 3)).toThrow("Only JPEG, PNG, and WebP");
  });

  it("rejects files whose content does not match the declared type", () => {
    expect(() => validateReturnEvidence(Buffer.from("not a png"), "image/png", 9)).toThrow("does not match");
  });

  it("rejects empty and oversized files", () => {
    expect(() => validateReturnEvidence(new Uint8Array(), "image/jpeg", 0)).toThrow("5 MB or smaller");
    expect(() => validateReturnEvidence(Uint8Array.from([0xff, 0xd8, 0xff]), "image/jpeg", MAX_RETURN_EVIDENCE_BYTES + 1)).toThrow("5 MB or smaller");
  });
});
