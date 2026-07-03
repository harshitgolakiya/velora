type Entry = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, Entry>();

export function checkAuthRateLimit(
  key: string,
  options: { limit?: number; windowMs?: number; now?: number } = {},
) {
  const limit = options.limit ?? 6;
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const now = options.now ?? Date.now();
  const normalizedKey = key.toLowerCase().trim();
  const current = attempts.get(normalizedKey);

  if (!current || current.resetAt <= now) {
    const entry = { count: 1, resetAt: now + windowMs };
    attempts.set(normalizedKey, entry);
    return { allowed: true, remaining: limit - 1, resetAt: entry.resetAt };
  }

  current.count += 1;
  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}

export function clearAuthRateLimits() {
  attempts.clear();
}

