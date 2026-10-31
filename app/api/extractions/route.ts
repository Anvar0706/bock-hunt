import { NextResponse } from 'next/server';
import { listExtractions } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`extractions_list:${ip}`, 40, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit reached' }, { status: 429 });
    }

    const url = new URL(req.url);
    const tgId = url.searchParams.get('tgId') || undefined;
    const cleanTgId = tgId ? String(tgId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) : undefined;

    const extractions = await listExtractions(cleanTgId);
    return NextResponse.json({ ok: true, extractions });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
