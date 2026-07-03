type PrivacyAuditEntry = {
  at: string;
  actor: string;
  action: string;
  message?: string;
};

export function parsePrivacyAuditLog(value: string | null | undefined): PrivacyAuditEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is PrivacyAuditEntry =>
      typeof entry === "object" &&
      entry !== null &&
      typeof entry.at === "string" &&
      typeof entry.actor === "string" &&
      typeof entry.action === "string",
    );
  } catch {
    return [];
  }
}

export function appendPrivacyAuditLog(
  current: string | null | undefined,
  entry: Omit<PrivacyAuditEntry, "at"> & { at?: Date },
) {
  return JSON.stringify([
    ...parsePrivacyAuditLog(current),
    {
      at: (entry.at ?? new Date()).toISOString(),
      actor: entry.actor,
      action: entry.action,
      message: entry.message,
    },
  ]);
}

export function privacyRetentionDate(now = new Date()) {
  return new Date(now.getTime() + 30 * 24 * 60 * 60_000);
}
