import { z } from "zod";
import { parseConsentPreferences, consentStorageKey } from "./consent-preferences";

export const analyticsEventNames = [
  "filter_changed",
  "search_performed",
  "search_result_clicked",
  "recommendation_interaction",
  "product_viewed",
  "cart_updated",
  "checkout_started",
  "purchase_completed",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export type AnalyticsConsentCategory = "necessary" | "analytics" | "marketing";

export const storefrontFilterEventSchema = z.object({
  path: z.string().trim().min(1).max(160),
  filterKey: z.string().trim().min(1).max(40),
  value: z.string().trim().min(1).max(120),
  action: z.enum(["apply", "clear", "reset"]),
  resultCount: z.number().int().min(0).max(10000).default(0),
  eventName: z.literal("filter_changed").default("filter_changed"),
  consentCategory: z.literal("analytics").default("analytics"),
  dedupeKey: z.string().trim().min(8).max(160).optional(),
});

export type StorefrontFilterAnalyticsEvent = z.infer<typeof storefrontFilterEventSchema>;

export function analyticsDedupeKey(parts: Array<string | number | undefined | null>) {
  return parts
    .filter((part) => part !== undefined && part !== null && String(part).trim().length > 0)
    .map((part) => String(part).toLowerCase().trim().replace(/[^a-z0-9:_-]+/g, "-").replace(/^-+|-+$/g, ""))
    .join(":")
    .slice(0, 160);
}

export function hasAnalyticsConsent() {
  if (typeof window === "undefined") return false;
  return Boolean(parseConsentPreferences(window.localStorage.getItem(consentStorageKey))?.analytics);
}
