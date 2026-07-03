import type { Product } from "./catalog";

export type ProductFitGuidance = {
  fit: string;
  model: string;
  dimensions: string[];
  sizeAdvice: string;
};

export function getProductFitGuidance(
  product: Pick<Product, "category" | "sizes" | "fitSummary" | "modelReference" | "sizeAdvice" | "dimensionNotes">,
): ProductFitGuidance {
  const category = product.category.toLowerCase();
  const sizes = product.sizes.join(", ");

  if (category.includes("legging")) {
    return applyProductOverrides(product, {
      fit: "Close, second-skin compression with a smooth high-rise hold.",
      model: "Model reference: 175 cm, wearing size S.",
      dimensions: ["High-rise waistband", "Full-length leg", "Four-way stretch recovery"],
      sizeAdvice: `Available sizes: ${sizes}. Choose your usual size for sculpting compression; size up if you prefer a softer hold.`,
    });
  }

  if (category.includes("pant")) {
    return applyProductOverrides(product, {
      fit: "Relaxed through the leg with a secure waistband and easy movement.",
      model: "Model reference: 176 cm, wearing size S.",
      dimensions: ["Mid-to-high rise", "Full-length drape", "Room through hip and thigh"],
      sizeAdvice: `Available sizes: ${sizes}. Choose your usual size; size down for a closer waist fit.`,
    });
  }

  if (category.includes("bra")) {
    return applyProductOverrides(product, {
      fit: "Supportive stretch with close underband contact and medium coverage.",
      model: "Model reference: 173 cm, wearing size S.",
      dimensions: ["Scoop neckline", "Wide underband", "Medium-impact support profile"],
      sizeAdvice: `Available sizes: ${sizes}. If you are between band sizes, choose the larger size for comfort.`,
    });
  }

  if (category.includes("top")) {
    return applyProductOverrides(product, {
      fit: "Body-skimming stretch designed to layer cleanly over bras and leggings.",
      model: "Model reference: 174 cm, wearing size S.",
      dimensions: ["Close sleeve fit", "Hip or cropped length by style", "Soft stretch handfeel"],
      sizeAdvice: `Available sizes: ${sizes}. Choose your usual top size; size up for a relaxed layer.`,
    });
  }

  if (category.includes("jacket")) {
    return applyProductOverrides(product, {
      fit: "Layer-ready fit with enough room over a bra, tank, or lightweight top.",
      model: "Model reference: 176 cm, wearing size S.",
      dimensions: ["Structured shoulder line", "Easy sleeve mobility", "Designed for light layering"],
      sizeAdvice: `Available sizes: ${sizes}. Choose your usual size for layering; size down for a sharper silhouette.`,
    });
  }

  if (category.includes("accessor")) {
    return applyProductOverrides(product, {
      fit: "Designed as a flexible add-on for studio, travel, or daily carry.",
      model: "Scale reference varies by product type.",
      dimensions: ["Check product images for scale", "Designed for daily use", "Gift-ready sizing"],
      sizeAdvice: `Available sizes: ${sizes}. Select the listed size or color variant that matches your use case.`,
    });
  }

  return applyProductOverrides(product, {
    fit: "Designed for comfortable movement with a clean, close-to-body finish.",
    model: "Model reference: 175 cm, wearing size S where available.",
    dimensions: ["Movement-ready fit", "Soft stretch comfort", "Designed for repeated wear"],
    sizeAdvice: `Available sizes: ${sizes}. Choose your usual size and review the selected variant before checkout.`,
  });
}

function applyProductOverrides(
  product: Pick<Product, "fitSummary" | "modelReference" | "sizeAdvice" | "dimensionNotes">,
  fallback: ProductFitGuidance,
): ProductFitGuidance {
  return {
    fit: product.fitSummary?.trim() || fallback.fit,
    model: product.modelReference?.trim() || fallback.model,
    sizeAdvice: product.sizeAdvice?.trim() || fallback.sizeAdvice,
    dimensions: product.dimensionNotes?.length ? product.dimensionNotes : fallback.dimensions,
  };
}
