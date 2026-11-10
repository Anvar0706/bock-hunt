import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { ADMIN_TG_ID, verifyOperativeRequest } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`scan_verify:${ip}`, 30, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const { tgId } = await req.json();
    const cleanTgId = tgId ? String(tgId).trim() : '';

    if (!cleanTgId || !/^\d{5,16}$/.test(cleanTgId)) {
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ ok: true, canScan: true, allowed: true, plan: 'community', extractsCount: 0 });
      }
      return NextResponse.json({
        ok: false,
        canScan: false,
        allowed: false,
        reason: 'invalid_session',
        error: 'Valid Telegram session required.',
      }, { status: 403 });
    }

    const auth = await verifyOperativeRequest(req, cleanTgId);
    if (!auth.ok) {
      return auth.response;
    }

    const user = await getUser(cleanTgId);
    if (!user) {
      return NextResponse.json({
        ok: false,
        canScan: false,
        allowed: false,
        reason: 'uninitialized',
        error: 'Operative profile not synchronized.',
      }, { status: 403 });
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

    const effectivePlan = user.plan || 'community';
    const isOwner = cleanTgId === ADMIN_TG_ID;
    if (!isOwner && effectivePlan === 'community' && user.extractsCount >= 1) {
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
