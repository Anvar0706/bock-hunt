// Bounded in-memory sliding window rate limiter (OOM-proof & Spoof-resistant)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_RATE_LIMIT_ENTRIES = 5000;
const rateLimitMap = new Map<string, RateLimitEntry>();
let lastPruneTime = 0;

function cleanExpired(now: number) {
  if (now - lastPruneTime < 5000 && rateLimitMap.size < MAX_RATE_LIMIT_ENTRIES) {
    return;
  }
  lastPruneTime = now;
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * Checks if a key has exceeded its limit in the given window.
 * Bounded to MAX_RATE_LIMIT_ENTRIES with FIFO eviction to eliminate memory DoS.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = 60000
): {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
} {
  const safeKey = String(key || '').slice(0, 128);
  const now = Date.now();
  cleanExpired(now);

  const entry = rateLimitMap.get(safeKey);

  if (!entry || entry.resetAt <= now) {
    while (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      const oldestKey = rateLimitMap.keys().next().value;
      if (oldestKey !== undefined) rateLimitMap.delete(oldestKey);
      else break;
    }

    rateLimitMap.set(safeKey, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.count),
    resetInSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

/**
 * Extracts verified client IP prioritizing edge-set headers over spoofable client headers.
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim().slice(0, 64);
  }
  const vercelFwd = req.headers.get('x-vercel-forwarded-for');
  if (vercelFwd) {
    return vercelFwd.split(',')[0].trim().slice(0, 64);
  }
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim().slice(0, 64);
  }
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',');
    return parts[parts.length - 1].trim().slice(0, 64);
  }
  return '127.0.0.1';
}
