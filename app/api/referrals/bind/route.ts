import { NextResponse } from 'next/server';
import { bindReferral } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`ref_bind:${ip}`, 15, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
    }

    const { referrerTgId, referredTgId, name, username } = await req.json();
    if (!referrerTgId || !referredTgId) {
      return NextResponse.json({ ok: false, error: 'referrerTgId and referredTgId required' }, { status: 400 });
    }

    const cleanReferrer = String(referrerTgId).trim();
    const cleanReferred = String(referredTgId).trim();

    // Prevent self-referral spoofing
    if (cleanReferrer === cleanReferred) {
      return NextResponse.json({ ok: false, error: 'Self-referral is not permitted' }, { status: 400 });
    }

    const bound = await bindReferral({
      referrerTgId: cleanReferrer,
      referredTgId: cleanReferred,
      referredName: String(name || '').slice(0, 64),
      referredUsername: String(username || '').slice(0, 64),
    });

    return NextResponse.json({ ok: true, bound });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
