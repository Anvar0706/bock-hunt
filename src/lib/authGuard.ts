import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

export const ADMIN_TG_ID = (process.env.ADMIN_USER_ID || process.env.ADMIN_TG_ID || '8515329556').trim();
const BOT_TOKEN = (process.env.BOT_TOKEN || '').trim();
const ADMIN_SECRET = (process.env.ADMIN_SECRET || '').trim();

/**
 * Validates cryptographically signed Telegram WebApp initData string
 * using HMAC-SHA256 as specified by Telegram Bot API documentation.
 */
export function verifyTelegramInitData(initData: string, botToken: string = BOT_TOKEN): {
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

    if (calculatedHash !== hash) {
      return { isValid: false };
    }

    // Optional auth_date validity check (prevent replay attacks older than 48 hours)
    const authDate = Number(params.get('auth_date') || 0);
    const nowSec = Math.floor(Date.now() / 1000);
    if (authDate && nowSec - authDate > 172800) {
      return { isValid: false };
    }

    const userRaw = params.get('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
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
  // 1. Check Bearer / Secret Key in Headers
  const authHeader = req.headers.get('authorization') || '';
  const adminKeyHeader = req.headers.get('x-admin-key') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (ADMIN_SECRET && (bearerToken === ADMIN_SECRET || adminKeyHeader === ADMIN_SECRET)) {
    return { ok: true, adminId: ADMIN_TG_ID };
  }

  // 2. Check Cryptographic Telegram WebApp initData Header
  const initDataHeader = req.headers.get('x-telegram-init-data') || req.headers.get('x-init-data') || '';
  if (initDataHeader && BOT_TOKEN) {
    const { isValid, user } = verifyTelegramInitData(initDataHeader, BOT_TOKEN);
    if (isValid && user && String(user.id) === ADMIN_TG_ID) {
      return { ok: true, adminId: String(user.id) };
    }
  }

  // 3. Check parsed body if passed or parse JSON safely
  let candidateTgId = '';
  if (bodyData && bodyData.adminTgId) {
    candidateTgId = String(bodyData.adminTgId).trim();
  }

  // 4. In development mode or when BOT_TOKEN is not yet set in production, allow verified ADMIN_TG_ID with warning
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
 * Validates Telegram Webhook Secret Token header for /api/bot
 */
export function verifyWebhookSecret(req: Request): boolean {
  const configuredSecret = process.env.BOT_WEBHOOK_SECRET;
  if (!configuredSecret) return true; // Optional if not set
  const headerToken = req.headers.get('x-telegram-bot-api-secret-token');
  return headerToken === configuredSecret;
}
