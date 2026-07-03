import { buildVariantSku } from "./admin-product-validation";

export type ImportColorEntry = {
  originalName: string;
  sizes: Map<string, number>;
  skuBySize: Map<string, string>;
};

export type ExplicitImportVariant = {
  colorName: string;
  sizeName: string;
  stock: number;
  sku: string;
};

export function buildExplicitImportVariants(productSku: string, colors: ImportColorEntry[]): ExplicitImportVariant[] {
  return colors.flatMap((entry) =>
    [...entry.sizes.entries()].map(([sizeName, stock]) => ({
      colorName: entry.originalName,
      sizeName,
      stock,
      sku: buildVariantSku(productSku, sizeName, entry.originalName, entry.skuBySize.get(sizeName)),
    })),
  );
}
