import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { tgId, plan } = await req.json();

    if (!tgId) {
      // In dev fallback or non-tg environment, allow
      return NextResponse.json({ ok: true, canScan: true });
    }

    const user = await getUser(String(tgId));
    if (!user) {
      return NextResponse.json({ ok: true, canScan: true });
    }

    if (user.status === 'BLOCKED' || user.status === 'RESTRICTED') {
      return NextResponse.json({
        ok: false,
        canScan: false,
        allowed: false,
        blocked: true,
        limitReached: false,
        reason: 'user_blocked',
        error: 'Account access has been restricted by system administrator.',
      });
    }

    const effectivePlan = user.plan || plan || 'community';
    if (effectivePlan === 'community' && user.extractsCount >= 1) {
      return NextResponse.json({
        ok: true,
        canScan: false,
        allowed: false,
        blocked: false,
        limitReached: true,
        reason: 'limit_reached',
        extractsCount: user.extractsCount,
        plan: effectivePlan,
      });
    }

    return NextResponse.json({
      ok: true,
      canScan: true,
      allowed: true,
      blocked: false,
      limitReached: false,
      extractsCount: user.extractsCount,
      plan: effectivePlan,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
