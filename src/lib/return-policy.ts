import { z } from "zod";

export const returnSettingsSchema = z.object({
  returnsEnabled: z.boolean(),
  exchangesEnabled: z.boolean(),
  refundsEnabled: z.boolean(),
  returnWindowDays: z.number().int().min(1).max(90),
  requireDeliveredOrder: z.boolean(),
  allowDefectClaimsOutsideWindow: z.boolean(),
  requireOriginalTags: z.boolean(),
  policySummary: z.string().trim().min(10).max(500),
});

export type ReturnSettings = z.infer<typeof returnSettingsSchema>;

export const defaultReturnSettings: ReturnSettings = {
  returnsEnabled: true,
  exchangesEnabled: true,
  refundsEnabled: true,
  returnWindowDays: 14,
  requireDeliveredOrder: true,
  allowDefectClaimsOutsideWindow: true,
  requireOriginalTags: true,
  policySummary: "Items must be unworn, unwashed, and returned with original tags. Eligibility is confirmed during review.",
};

export function evaluateReturnEligibility({
  settings,
  resolution,
  reason,
  orderStatus,
  deliveredAt,
  now = new Date(),
}: {
  settings: ReturnSettings;
  resolution: "return" | "exchange" | "refund";
  reason: string;
  orderStatus: string;
  deliveredAt?: Date | null;
  now?: Date;
}) {
  if (!settings.returnsEnabled) return { eligible: false, message: "Online return requests are currently unavailable." };
  if (resolution === "exchange" && !settings.exchangesEnabled) return { eligible: false, message: "Exchanges are currently unavailable." };
  if (resolution === "refund" && !settings.refundsEnabled) return { eligible: false, message: "Refund requests are currently unavailable." };
  if (["CANCELLED", "REFUNDED"].includes(orderStatus.toUpperCase())) return { eligible: false, message: "This order is not eligible for another return request." };
  if (!deliveredAt) {
    return settings.requireDeliveredOrder
      ? { eligible: false, message: "Return eligibility begins after delivery is completed." }
      : { eligible: true, message: "This request can be submitted before delivery." };
  }

  const deadline = new Date(deliveredAt.getTime() + settings.returnWindowDays * 86_400_000);
  if (now <= deadline) return { eligible: true, deadline, message: `Eligible through ${deadline.toISOString()}.` };

  const defectReason = ["Damaged item", "Wrong item received", "Item missing"].includes(reason);
  if (defectReason && settings.allowDefectClaimsOutsideWindow) {
    return { eligible: true, deadline, message: "Defect and incorrect-item claims can be reviewed outside the standard window." };
  }
  return { eligible: false, deadline, message: `The ${settings.returnWindowDays}-day return window has ended.` };
}
