import { NextResponse } from 'next/server';
import { setUserLang } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { verifyOperativeRequest } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`user_lang:${ip}`, 30, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit reached' }, { status: 429 });
    }

    const body = await req.json();
    const { tgId, lang } = body || {};

    if (!tgId || !lang) {
      return NextResponse.json({ ok: false, error: 'tgId and lang are required' }, { status: 400 });
    }

    const cleanTgId = String(tgId).trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    const auth = await verifyOperativeRequest(req, cleanTgId);
    if (!auth.ok) {
      return auth.response;
    }

    const cleanLang = lang === 'ru' ? 'ru' : 'en';
    const savedLang = await setUserLang(cleanTgId, cleanLang);
    return NextResponse.json({ ok: true, lang: savedLang });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
