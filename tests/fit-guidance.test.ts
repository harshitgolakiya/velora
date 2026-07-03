import { describe, expect, it } from "vitest";
import { getProductFitGuidance } from "@/lib/fit-guidance";

describe("product fit guidance", () => {
  it("returns compression guidance for leggings", () => {
    const guidance = getProductFitGuidance({ category: "Leggings", sizes: ["XS", "S", "M"] });
    expect(guidance.fit).toContain("second-skin compression");
    expect(guidance.sizeAdvice).toContain("XS, S, M");
  });

  it("returns support guidance for sports bras", () => {
    const guidance = getProductFitGuidance({ category: "Sports Bras", sizes: ["XS-S", "M", "L"] });
    expect(guidance.fit).toContain("underband");
    expect(guidance.dimensions).toContain("Medium-impact support profile");
  });

  it("returns scale guidance for accessories", () => {
    const guidance = getProductFitGuidance({ category: "Accessories", sizes: ["One Size"] });
    expect(guidance.model).toContain("Scale reference");
    expect(guidance.sizeAdvice).toContain("One Size");
  });

  it("uses product-level admin fit fields before category defaults", () => {
    const guidance = getProductFitGuidance({
      category: "Leggings",
      sizes: ["S", "M"],
      fitSummary: "Custom sculpt fit from admin.",
      modelReference: "Model is 178 cm and wears size M.",
      sizeAdvice: "Take your normal size unless between sizes.",
      dimensionNotes: ["Long inseam", "Light compression"],
    });

    expect(guidance).toEqual({
      fit: "Custom sculpt fit from admin.",
      model: "Model is 178 cm and wears size M.",
      sizeAdvice: "Take your normal size unless between sizes.",
      dimensions: ["Long inseam", "Light compression"],
    });
  });
});
