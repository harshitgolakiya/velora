import { z } from "zod";

export function isVideoUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("/")) return /\.(mp4|webm)(\?.*)?$/i.test(trimmed);
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && /\.(mp4|webm)(\?.*)?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

const productColorSchema = z.object({
  name: z.string().min(1),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  images: z.array(z.string().min(1)).default([]),
  hoverImage: z.string().optional(),
  video: z.string().trim().refine(isVideoUrl, "Use an HTTPS or local .mp4/.webm video URL.").optional(),
  stockBySize: z.record(z.string(), z.coerce.number().int().min(0)).default({}),
  skuBySize: z.record(z.string(), z.string()).default({}),
});

const productBaseSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  price: z.coerce.number().positive(),
  salePrice: z.coerce.number().positive().optional().nullable(),
  categoryId: z.string().min(1),
  collectionIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
  description: z.string().min(1),
  fabricDetails: z.string().min(1),
  careInstructions: z.string().min(1),
  fitSummary: z.string().optional().nullable(),
  modelReference: z.string().optional().nullable(),
  sizeAdvice: z.string().optional().nullable(),
  dimensionNotes: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  bestSeller: z.boolean().default(false),
  newArrival: z.boolean().default(false),
  primaryImage: z.string().optional(),
  socialImage: z.string().optional().nullable(),
});

export const createProductSchema = productBaseSchema.extend({
  sizeNames: z.array(z.string().min(1)).min(1),
  colors: z.array(productColorSchema).min(1),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

export const updateProductSchema = productBaseSchema.extend({
  slug: z.string().min(2).optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]),
  scheduledAt: z.string().datetime().optional().nullable(),
  sizeNames: z.array(z.string().min(1)).min(1).optional(),
  colors: z.array(productColorSchema).min(1).optional(),
});

export const updateOrderSchema = z.object({
  status: z.enum(["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
  paymentStatus: z.string().min(1),
  fulfillmentStatus: z.string().min(1),
  internalNote: z.string().optional().nullable(),
  customerNote: z.string().optional().nullable(),
  carrier: z.string().optional().nullable(),
  trackingNo: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  refundAmount: z.preprocess((value) => {
    if (typeof value === "string") {
      return value.trim() === "" ? undefined : Number(value);
    }
    return value;
  }, z.number().nonnegative().optional().nullable()),
});

export const updateStockSchema = z.object({
  stock: z.coerce.number().int().min(0),
  reservedStock: z.coerce.number().int().min(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  allowBackorder: z.boolean().optional(),
  backorderLimit: z.coerce.number().int().min(0).optional().nullable(),
  backorderShipsAt: z.string().datetime().optional().nullable(),
  backorderMessage: z.string().trim().max(180).optional().nullable(),
  reason: z.string().trim().min(1).max(80).optional(),
  note: z.string().optional().nullable(),
});
