const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export function createRollingWindowRateLimiter(options = {}) {
  const maxRequests = options.maxRequests || 12;
  const windowMs = options.windowMs || ONE_HOUR_MS;
  const now = options.now || Date.now;
  const buckets = new Map();

  return {
    consume(key) {
      const timestamp = now();
      const cutoff = timestamp - windowMs;
      const recent = (buckets.get(key) || []).filter((value) => value > cutoff);

      if (recent.length >= maxRequests) {
        buckets.set(key, recent);
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(1, recent[0] + windowMs - timestamp)
        };
      }

      recent.push(timestamp);
      buckets.set(key, recent);
      return {
        allowed: true,
        remaining: maxRequests - recent.length,
        retryAfterMs: 0
      };
    }
  };
}

export function createHourlyRateLimiter(options = {}) {
  return createRollingWindowRateLimiter({ ...options, windowMs: options.windowMs || ONE_HOUR_MS });
}

export function createDailyRateLimiter(options = {}) {
  return createRollingWindowRateLimiter({ ...options, windowMs: options.windowMs || ONE_DAY_MS });
}
