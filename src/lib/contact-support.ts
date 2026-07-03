import { z } from "zod";

export const contactRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().transform((value) => value.toLowerCase().trim()),
  category: z.enum(["ORDER", "DELIVERY", "RETURN", "PRODUCT", "PAYMENT", "ACCOUNT", "OTHER"]),
  subject: z.string().trim().min(4).max(160),
  message: z.string().trim().min(20).max(4000),
  orderNumber: z.string().trim().max(40).optional(),
  website: z.string().max(0).optional(),
  startedAt: z.number().int().positive(),
});

export function isContactSubmissionTooFast(startedAt: number, now = Date.now()) {
  return now - startedAt < 1500;
}
