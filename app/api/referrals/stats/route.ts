import { NextResponse } from 'next/server';
import { getReferralStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tgId = url.searchParams.get('tgId');
    if (!tgId) {
      return NextResponse.json({ ok: false, error: 'tgId is required' }, { status: 400 });
    }

    const stats = await getReferralStats(String(tgId));
    return NextResponse.json({ ok: true, stats });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
