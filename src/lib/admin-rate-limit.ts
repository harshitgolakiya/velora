type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export function checkAdminRateLimit(
  key: string,
  options: { limit?: number; windowMs?: number; now?: number } = {},
): RateLimitResult {
  const limit = options.limit ?? 120;
  const windowMs = options.windowMs ?? 60_000;
  const now = options.now ?? Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit - 1, resetAt };
  }

  current.count += 1;
  buckets.set(key, current);

  return {
    allowed: current.count <= limit,
    limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}

export function clearAdminRateLimits() {
  buckets.clear();
}
