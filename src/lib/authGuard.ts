import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

export const ADMIN_TG_ID = (process.env.ADMIN_USER_ID || process.env.ADMIN_TG_ID || '8515329556').trim();
const BOT_TOKEN = (process.env.BOT_TOKEN || '').trim();
const ADMIN_SECRET = (process.env.ADMIN_SECRET || '').trim();

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates cryptographically signed Telegram WebApp initData string
 * using HMAC-SHA256 as specified by Telegram Bot API documentation.
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string = BOT_TOKEN,
  maxAgeSec: number = 172800
): {
  isValid: boolean;
  user?: { id: number | string; first_name?: string; last_name?: string; username?: string };
} {
  if (!initData || !botToken) return { isValid: false };

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { isValid: false };

    params.delete('hash');
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckString = sortedKeys.map((key) => `${key}=${params.get(key)}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (!safeEqual(calculatedHash.toLowerCase(), hash.toLowerCase())) {
      return { isValid: false };
    }

    const authDate = Number(params.get('auth_date') || 0);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!authDate || nowSec - authDate > maxAgeSec) {
      return { isValid: false };
    }

    const userRaw = params.get('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    if (!user || !user.id) return { isValid: false };
    return { isValid: true, user };
  } catch {
    return { isValid: false };
  }
}

/**
 * Centralized Admin Authorization Guard for all sensitive mutating & PII endpoints
 */
export async function verifyAdminRequest(
  req: Request,
  bodyData?: Record<string, unknown>
): Promise<{ ok: true; adminId: string } | { ok: false; response: NextResponse }> {
  const authHeader = req.headers.get('authorization') || '';
  const adminKeyHeader = req.headers.get('x-admin-key') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (ADMIN_SECRET && (safeEqual(bearerToken, ADMIN_SECRET) || safeEqual(adminKeyHeader, ADMIN_SECRET))) {
    return { ok: true, adminId: ADMIN_TG_ID };
  }

  const initDataHeader = req.headers.get('x-telegram-init-data') || req.headers.get('x-init-data') || '';
  if (initDataHeader && BOT_TOKEN) {
    const { isValid, user } = verifyTelegramInitData(initDataHeader, BOT_TOKEN, 172800);
    if (isValid && user && String(user.id) === ADMIN_TG_ID) {
      return { ok: true, adminId: String(user.id) };
    }
  }

  const candidateTgId = bodyData && bodyData.adminTgId ? String(bodyData.adminTgId).trim() : '';
  const isDev = process.env.NODE_ENV !== 'production';
  if ((isDev || !BOT_TOKEN) && candidateTgId === ADMIN_TG_ID) {
    return { ok: true, adminId: ADMIN_TG_ID };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { ok: false, error: 'Unauthorized: Admin privileges required' },
      { status: 403 }
    ),
  };
}

/**
 * Cryptographic Operative Session Guard: proves caller owns targetTgId (or is Admin).
 * Eliminates IDOR, DB fake-user spam, victim balance theft, and victim quota burns.
 */
export async function verifyOperativeRequest(
  req: Request,
  targetTgId: string
): Promise<{ ok: true; tgId: string; isAdmin: boolean } | { ok: false; response: NextResponse }> {
  const cleanTarget = String(targetTgId || '').trim();
  if (!/^\d{5,16}$/.test(cleanTarget)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'Access restricted: Valid Telegram user ID required.' },
        { status: 403 }
      ),
    };
  }

  const authHeader = req.headers.get('authorization') || '';
  const adminKeyHeader = req.headers.get('x-admin-key') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (ADMIN_SECRET && (safeEqual(bearerToken, ADMIN_SECRET) || safeEqual(adminKeyHeader, ADMIN_SECRET))) {
    return { ok: true, tgId: cleanTarget, isAdmin: true };
  }

  const initDataHeader = req.headers.get('x-telegram-init-data') || req.headers.get('x-init-data') || '';
  if (initDataHeader && BOT_TOKEN) {
    const { isValid, user } = verifyTelegramInitData(initDataHeader, BOT_TOKEN, 604800); // 7 days
    if (isValid && user) {
      const signedId = String(user.id);
      if (signedId === cleanTarget || signedId === ADMIN_TG_ID) {
        return { ok: true, tgId: cleanTarget, isAdmin: signedId === ADMIN_TG_ID };
      }
    }
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'Forbidden: Telegram session signature mismatch.' },
        { status: 403 }
      ),
    };
  }

  // Fallback strictly ONLY for local development mode or unconfigured BOT_TOKEN
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev || !BOT_TOKEN) {
    return { ok: true, tgId: cleanTarget, isAdmin: cleanTarget === ADMIN_TG_ID };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { ok: false, error: 'Forbidden: Cryptographic Telegram WebApp authentication required.' },
      { status: 403 }
    ),
  };
}

/**
 * Validates Telegram Webhook Secret Token header for /api/bot
 */
export function verifyWebhookSecret(req: Request): boolean {
  const configuredSecret = process.env.BOT_WEBHOOK_SECRET;
  if (!configuredSecret) return true;
  const headerToken = req.headers.get('x-telegram-bot-api-secret-token') || '';
  return safeEqual(headerToken, configuredSecret);
}
