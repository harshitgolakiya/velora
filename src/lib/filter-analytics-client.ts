import {
  analyticsDedupeKey,
  hasAnalyticsConsent,
  type StorefrontFilterAnalyticsEvent,
} from "./analytics-event-contract";

type FilterEventInput = {
  path: string;
  filterKey: string;
  value: string;
  action: "apply" | "clear" | "reset";
  resultCount: number;
};

export function trackFilterEvent(input: FilterEventInput) {
  if (!hasAnalyticsConsent()) return;
  const event: StorefrontFilterAnalyticsEvent = {
    ...input,
    eventName: "filter_changed",
    consentCategory: "analytics",
    dedupeKey: analyticsDedupeKey([
      "filter_changed",
      input.path,
      input.filterKey,
      input.value,
      input.action,
      input.resultCount,
    ]),
  };

  void fetch("/api/analytics/filters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {
    // Analytics should never interrupt filtering.
  });
}
