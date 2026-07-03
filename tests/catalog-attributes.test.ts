import { describe, expect, it } from "vitest";
import {
  isValidCatalogAttribute,
  normalizeCatalogAttribute,
  uniqueCatalogAttributes,
} from "@/lib/catalog-attributes";

describe("catalog attributes", () => {
  it("normalizes whitespace and removes placeholder import values", () => {
    expect(normalizeCatalogAttribute("  Deep   Black  ")).toBe("Deep Black");
    expect(normalizeCatalogAttribute("Default")).toBeNull();
    expect(normalizeCatalogAttribute("N/A")).toBeNull();
    expect(normalizeCatalogAttribute("Default", "One Color")).toBe("One Color");
    expect(isValidCatalogAttribute("--")).toBe(false);
  });

  it("deduplicates cleaned attribute values case-insensitively", () => {
    expect(uniqueCatalogAttributes([" Black ", "black", "Default", "", "XS", "xs"])).toEqual(["Black", "XS"]);
  });
});
