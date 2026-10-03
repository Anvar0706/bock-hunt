import { NextResponse } from 'next/server';
import { deleteUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { tgId } = await req.json();
    if (!tgId) return NextResponse.json({ ok: false, error: 'tgId required' }, { status: 400 });

    await deleteUser(String(tgId));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
