import { NextResponse } from 'next/server';
import { upsertUser, getUser } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { verifyOperativeRequest } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`user_sync:${ip}`, 40, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many sync requests. Please wait.' }, { status: 429 });
    }

    const body = await req.json();
    const { tgId, name, username, lang } = body || {};

    if (!tgId) {
      return NextResponse.json({ ok: false, error: 'tgId is required' }, { status: 400 });
    }

    const cleanTgId = String(tgId).trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    if (!/^\d{5,16}$/.test(cleanTgId)) {
      return NextResponse.json({ ok: false, error: 'Access restricted: Valid Telegram user ID required.' }, { status: 403 });
    }

    const auth = await verifyOperativeRequest(req, cleanTgId);
    if (!auth.ok) {
      return auth.response;
    }

    const cleanName = String(name || 'User').slice(0, 64);
    const cleanUsername = String(username || '').slice(0, 64);
    const cleanLang = lang === 'ru' ? 'ru' : 'en';

    const user = await upsertUser({
      tgId: cleanTgId,
      name: cleanName,
      username: cleanUsername,
      lang: cleanLang,
    });

    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    console.error('Error in /api/users/sync:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`user_get:${ip}`, 40, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many requests. Please wait.' }, { status: 429 });
    }

    const url = new URL(req.url);
    const tgId = url.searchParams.get('tgId');
    if (!tgId) {
      return NextResponse.json({ ok: false, error: 'tgId is required' }, { status: 400 });
    }

    const cleanTgId = String(tgId).trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    if (!/^\d{5,16}$/.test(cleanTgId)) {
      return NextResponse.json({ ok: false, error: 'Access restricted: Valid Telegram user ID required.' }, { status: 403 });
    }

    const auth = await verifyOperativeRequest(req, cleanTgId);
    if (!auth.ok) {
      return auth.response;
    }

    const user = await getUser(cleanTgId);
    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
