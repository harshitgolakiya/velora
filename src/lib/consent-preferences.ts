export type ConsentPreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  updatedAt: string;
};

export const consentStorageKey = "velora-consent-v1";
export const consentCookieName = "velora_consent";

export function defaultConsentPreferences(): ConsentPreferences {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
    updatedAt: new Date(0).toISOString(),
  };
}

export function acceptedConsentPreferences(now = new Date()): ConsentPreferences {
  return {
    necessary: true,
    analytics: true,
    marketing: true,
    preferences: true,
    updatedAt: now.toISOString(),
  };
}

export function rejectedConsentPreferences(now = new Date()): ConsentPreferences {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
    updatedAt: now.toISOString(),
  };
}

export function normalizeConsentPreferences(value: unknown): ConsentPreferences | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<ConsentPreferences>;
  return {
    necessary: true,
    analytics: Boolean(source.analytics),
    marketing: Boolean(source.marketing),
    preferences: Boolean(source.preferences),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : new Date().toISOString(),
  };
}

export function parseConsentPreferences(raw: string | null | undefined): ConsentPreferences | null {
  if (!raw) return null;
  try {
    return normalizeConsentPreferences(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function consentCookieValue(preferences: ConsentPreferences) {
  return [
    `analytics:${preferences.analytics ? "1" : "0"}`,
    `marketing:${preferences.marketing ? "1" : "0"}`,
    `preferences:${preferences.preferences ? "1" : "0"}`,
  ].join("|");
}
