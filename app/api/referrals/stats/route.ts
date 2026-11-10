import { NextResponse } from 'next/server';
import { getReferralStats } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { verifyOperativeRequest } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`ref_stats:${ip}`, 45, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit reached' }, { status: 429 });
    }

    const url = new URL(req.url);
    const tgId = url.searchParams.get('tgId');
    if (!tgId) {
      return NextResponse.json({ ok: false, error: 'tgId required' }, { status: 400 });
    }

    const cleanTgId = String(tgId).trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    const auth = await verifyOperativeRequest(req, cleanTgId);
    if (!auth.ok) {
      return auth.response;
    }

    const stats = await getReferralStats(cleanTgId);
    return NextResponse.json({ ok: true, stats });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
