import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAX_EDGE_ENTRIES = 2000;
const edgeRateMap = new Map<string, { count: number; resetAt: number }>();
let lastEdgePrune = 0;

const BLOCKED_PROBE_PATTERNS = [
  /\.env/i,
  /\.git/i,
  /wp-login/i,
  /wp-admin/i,
  /wp-content/i,
  /xmlrpc\.php/i,
  /phpmyadmin/i,
  /phpinfo/i,
  /\.php$/i,
  /\.sql$/i,
  /\.bak$/i,
  /\.old$/i,
  /\/actuator/i,
];

function getTrustedEdgeIp(req: NextRequest): string {
  // Prioritize proxy-verified headers overwritten by Vercel Edge before client-spoofable x-forwarded-for
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim().slice(0, 64);

  const vercelFwd = req.headers.get('x-vercel-forwarded-for');
  if (vercelFwd) return vercelFwd.split(',')[0].trim().slice(0, 64);

  if (req.ip) return req.ip.slice(0, 64);

  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    // Use rightmost entry appended by nearest upstream proxy
    const parts = fwd.split(',');
    return parts[parts.length - 1].trim().slice(0, 64);
  }
  return '127.0.0.1';
}

function checkEdgeRateLimit(key: string, limit: number, windowMs = 60_000): { allowed: boolean; retryAfter: number } {
  const now = Date.now();

  if (now - lastEdgePrune > 5000 && edgeRateMap.size > 400) {
    lastEdgePrune = now;
    for (const [k, v] of edgeRateMap.entries()) {
      if (v.resetAt <= now) edgeRateMap.delete(k);
    }
  }

  const existing = edgeRateMap.get(key);
  if (!existing || existing.resetAt <= now) {
    // Bounded FIFO eviction to make memory-exhaustion DDoS impossible
    while (edgeRateMap.size >= MAX_EDGE_ENTRIES) {
      const oldestKey = edgeRateMap.keys().next().value;
      if (oldestKey !== undefined) edgeRateMap.delete(oldestKey);
      else break;
    }
    edgeRateMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }

  existing.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Drop automated exploit scanners & probe paths immediately at Edge
  if (BLOCKED_PROBE_PATTERNS.some((rx) => rx.test(pathname))) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Only inspect API routes beyond static probe blocking
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 2. Method whitelist
  const method = req.method.toUpperCase();
  if (method === 'OPTIONS') {
    return new NextResponse(null, { status: 204 });
  }
  if (method !== 'GET' && method !== 'POST' && method !== 'HEAD') {
    return NextResponse.json({ ok: false, error: 'Method Not Allowed' }, { status: 405 });
  }

  // 3. Body size cap (prevents oversized JSON memory/CPU exhaustion DoS)
  const contentLengthHeader = req.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    const maxBytes =
      pathname.startsWith('/api/webhook/') || pathname === '/api/bot' ? 262_144 : 65_536;
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      return NextResponse.json(
        { ok: false, error: 'Payload Too Large' },
        { status: 413 }
      );
    }
  }

  // 4. Edge IP burst flood rate limit
  const clientIp = getTrustedEdgeIp(req);
  const isWebhookOrBot = pathname.startsWith('/api/webhook/') || pathname === '/api/bot';
  const bucketLimit = isWebhookOrBot ? 300 : 120;
  const bucketKey = `${isWebhookOrBot ? 'wh' : 'api'}:${clientIp}`;

  const rate = checkEdgeRateLimit(bucketKey, bucketLimit, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Rate limit active.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.retryAfter),
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
