import { NextResponse } from 'next/server';
import { upsertUser, getUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tgId, name, username, lang } = body || {};

    if (!tgId) {
      return NextResponse.json({ ok: false, error: 'tgId is required' }, { status: 400 });
    }

    const user = await upsertUser({
      tgId: String(tgId),
      name: name || 'User',
      username: username || '',
      lang: lang || 'en',
    });

    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    console.error('Error in /api/users/sync:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tgId = url.searchParams.get('tgId');
  if (!tgId) {
    return NextResponse.json({ ok: false, error: 'tgId is required' }, { status: 400 });
  }
  const user = await getUser(tgId);
  return NextResponse.json({ ok: true, user });
}
