const invalidAttributeValues = new Set([
  "default",
  "n/a",
  "na",
  "none",
  "null",
  "undefined",
  "select",
  "select option",
  "choose option",
  "choose an option",
  "-",
  "--",
]);

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

export function normalizeCatalogAttribute(value: string | null | undefined, fallback?: string) {
  const normalized = String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["']|["']$/g, "");
  const key = normalized.toLowerCase();
  if (!normalized || invalidAttributeValues.has(key)) return fallback ?? null;
  return normalized;
}

export function isValidCatalogAttribute(value: string | null | undefined) {
  return normalizeCatalogAttribute(value) !== null;
}

export function uniqueCatalogAttributes(values: Array<string | null | undefined>) {
  const byKey = new Map<string, string>();
  for (const value of values) {
    const normalized = normalizeCatalogAttribute(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, normalized);
  }
  return Array.from(byKey.values()).sort(collator.compare);
}
