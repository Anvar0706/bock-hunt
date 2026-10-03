import { NextResponse } from 'next/server';
import { updateUser, getUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { tgId } = await req.json();
    if (!tgId) return NextResponse.json({ ok: false, error: 'tgId required' }, { status: 400 });

    await updateUser(String(tgId), { status: 'BLOCKED' });
    const user = await getUser(String(tgId));
    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
