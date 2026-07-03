import { describe, expect, it } from "vitest";
import { getCatalogQualityWarnings } from "@/lib/catalog-quality";
import type { AdminMediaAsset, AdminProduct } from "@/lib/admin-catalog";

const baseProduct = {
  id: "p1",
  name: "Test Product",
  slug: "test-product",
  sku: "TP-1",
  description: "Description",
  fabricDetails: "Fabric",
  careInstructions: "Care",
  dimensionNotes: [],
  category: "Leggings",
  categoryId: "cat",
  collections: [],
  price: 100,
  stock: 1,
  status: "Published",
  featured: false,
  bestSeller: false,
  newArrival: false,
  images: ["/media/black-1.jpg"],
  tags: [],
  colors: [{ id: "black", name: "Black", hex: "#111111" }],
  sizes: [{ id: "S", name: "S" }],
  variants: [
    {
      id: "v1",
      stock: 1,
      colorId: "black",
      colorName: "Black",
      colorHex: "#111111",
      sizeId: "S",
      sizeName: "S",
      media: [{ id: "m1", type: "IMAGE", url: "/media/black-1.jpg", sortOrder: 0, isHoverImage: true }],
    },
  ],
  updatedAt: "2026-06-28T00:00:00.000Z",
} satisfies AdminProduct;

const media = [
  {
    id: "a1",
    name: "black",
    originalName: "black.jpg",
    url: "/media/black-1.jpg",
    mimeType: "image/jpeg",
    mediaType: "IMAGE",
    sizeBytes: 100000,
    width: 1600,
    height: 2000,
    responsiveWidths: [],
    derivativeManifest: [],
    focalPointX: 0.5,
    focalPointY: 0.5,
    tags: [],
    uploadedBy: "Admin",
    usageCount: 1,
    createdAt: "2026-06-28T00:00:00.000Z",
    updatedAt: "2026-06-28T00:00:00.000Z",
  },
] satisfies AdminMediaAsset[];

describe("catalog quality warnings", () => {
  it("does not warn for a basic complete gallery", () => {
    expect(getCatalogQualityWarnings(baseProduct, media)).toEqual([]);
  });

  it("warns for missing color galleries and product images", () => {
    const warnings = getCatalogQualityWarnings({ ...baseProduct, images: [], variants: [{ ...baseProduct.variants[0], media: [] }] }, []);
    expect(warnings.map((warning) => warning.code)).toEqual(["missing_product_images", "missing_color_gallery"]);
  });

  it("warns for low-resolution and inconsistent image ratios", () => {
    const product = {
      ...baseProduct,
      variants: [
        {
          ...baseProduct.variants[0],
          media: [
            { id: "m1", type: "IMAGE", url: "/media/low.jpg", sortOrder: 0, isHoverImage: false },
            { id: "m2", type: "IMAGE", url: "/media/wide.jpg", sortOrder: 1, isHoverImage: false },
          ],
        },
      ],
    } satisfies AdminProduct;
    const warnings = getCatalogQualityWarnings(product, [
      { ...media[0], id: "low", url: "/media/low.jpg", width: 900, height: 1200 },
      { ...media[0], id: "wide", url: "/media/wide.jpg", width: 1800, height: 900 },
    ]);

    expect(warnings.map((warning) => warning.code)).toEqual([
      "missing_hover_image",
      "low_resolution_media",
      "inconsistent_gallery_ratio",
    ]);
  });
});
