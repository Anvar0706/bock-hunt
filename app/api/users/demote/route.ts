import { NextResponse } from 'next/server';
import { updateUser, getUser } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const auth = await verifyAdminRequest(req, body);
    if (!auth.ok) {
      return auth.response;
    }

    const { tgId } = body || {};
    if (!tgId) return NextResponse.json({ ok: false, error: 'tgId required' }, { status: 400 });

    await updateUser(String(tgId), { plan: 'community' });
    const user = await getUser(String(tgId));
    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
