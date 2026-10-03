import { NextResponse } from 'next/server';
import { bindReferral } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { referrerTgId, referredTgId, name, username } = await req.json();
    if (!referrerTgId || !referredTgId) {
      return NextResponse.json({ ok: false, error: 'referrerTgId and referredTgId required' }, { status: 400 });
    }

    const bound = await bindReferral({
      referrerTgId: String(referrerTgId),
      referredTgId: String(referredTgId),
      referredName: name,
      referredUsername: username,
    });

    return NextResponse.json({ ok: true, bound });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
