import { NextResponse } from 'next/server';
import { setUserLang } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tgId, lang } = body || {};

    if (!tgId || !lang) {
      return NextResponse.json({ ok: false, error: 'tgId and lang are required' }, { status: 400 });
    }

    const savedLang = await setUserLang(String(tgId), String(lang));
    return NextResponse.json({ ok: true, lang: savedLang });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
