/**
 * Multi-tier rate limiting utility for Anon Connect.
 * Implements sliding-window in-memory rate limiting with per-route rules.
 */

export interface RateLimitRule {
  max: number;
  windowMs: number;
}

export const RATE_LIMIT_RULES = {
  signup: { max: 5, windowMs: 60 * 60 * 1000 },          // 5 per IP / hour
  login: { max: 10, windowMs: 15 * 60 * 1000 },          // 10 per IP / 15 mins
  requests: { max: 20, windowMs: 60 * 60 * 1000 },       // 20 requests / hour
  messages: { max: 60, windowMs: 60 * 1000 },            // 60 messages / minute
  reports: { max: 10, windowMs: 60 * 60 * 1000 },        // 10 reports / hour
  calls: { max: 15, windowMs: 60 * 60 * 1000 },          // 15 calls / hour
  discovery: { max: 60, windowMs: 60 * 1000 },           // 60 discovery searches / minute
  blocks: { max: 30, windowMs: 60 * 60 * 1000 },         // 30 blocks / hour
  profile_update: { max: 20, windowMs: 60 * 60 * 1000 }, // 20 profile updates / hour
  reactions: { max: 120, windowMs: 60 * 1000 },          // 120 reactions / minute
} as const satisfies Record<string, RateLimitRule>;

interface WindowEntry {
  timestamps: number[];
}

const cache = new Map<string, WindowEntry>();

// Prune expired entries periodically to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < 60 * 60 * 1000);
      if (entry.timestamps.length === 0) {
        cache.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export interface RateLimitCheckResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Checks and increments rate limit for a given key and rule.
 */
export function checkRateLimit(key: string, ruleName: keyof typeof RATE_LIMIT_RULES): RateLimitCheckResult {
  const rule = RATE_LIMIT_RULES[ruleName] || { max: 30, windowMs: 60 * 1000 };
  const fullKey = `${ruleName}:${key}`;
  const now = Date.now();
  const windowStart = now - rule.windowMs;

  let entry = cache.get(fullKey);
  if (!entry) {
    entry = { timestamps: [] };
    cache.set(fullKey, entry);
  }

  // Filter timestamps within current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= rule.max) {
    const oldestTimestamp = entry.timestamps[0];
    const resetSeconds = Math.ceil((oldestTimestamp + rule.windowMs - now) / 1000);
    return {
      success: false,
      limit: rule.max,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  // Record this request
  entry.timestamps.push(now);
  return {
    success: true,
    limit: rule.max,
    remaining: rule.max - entry.timestamps.length,
    resetSeconds: Math.ceil(rule.windowMs / 1000),
  };
}

/**
 * Helper to extract client IP address from Next.js request headers.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip') || '127.0.0.1';
}
