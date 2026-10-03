// In-memory sliding window rate limiter (Serverless-safe & Zero external dependencies)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Purge expired keys periodically when map grows
function cleanExpired() {
  if (rateLimitMap.size < 500) return;
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * Checks if a key has exceeded its limit in the given window.
 * @param key unique identifier (e.g. `ip:endpoint` or `tgId:action`)
 * @param limit maximum allowed requests in window
 * @param windowMs window duration in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimit(key: string, limit: number, windowMs: number = 60000): {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
} {
  cleanExpired();

  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * Helper to extract client IP or fallback identifier from Next.js Request
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
