import { NextResponse } from 'next/server';
import { verifyOnChainPayment } from '@/lib/blockchain';
import { getUser, logAudit } from '@/lib/db';
import { finalizeVerifiedPayment } from '@/lib/paymentActivation';
import { notifyPaymentFailed } from '@/bot';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { verifyOperativeRequest } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`payment_verify:${ip}`, 10, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many verification attempts. Please wait.' }, { status: 429 });
    }

    const body = await req.json();
    const {
      txHash,
      network = 'TRON',
      billingCycle = 'weekly',
      cycle = 'weekly',
      lang = 'en',
      tgId,
      intentId,
      source = 'WEBAPP',
    } = body || {};

    const rawPlan = String(body?.plan || body?.planId || 'pro').toLowerCase();
    if (rawPlan !== 'pro' && rawPlan !== 'enterprise') {
      return NextResponse.json({ ok: false, error: 'Invalid subscription plan.' }, { status: 400 });
    }
    const plan = rawPlan;
    const effectiveCycle = (billingCycle || cycle) === 'monthly' ? 'monthly' : 'weekly';

    const cleanTgId = tgId ? String(tgId).trim() : '';
    const auth = await verifyOperativeRequest(req, cleanTgId);
    if (!auth.ok) {
      return auth.response;
    }

    const existingUser = await getUser(cleanTgId);
    if (existingUser && (existingUser.status === 'BLOCKED' || existingUser.status === 'RESTRICTED')) {
      return NextResponse.json({
        ok: false,
        error: lang === 'ru' ? 'Аккаунт заблокирован администратором.' : 'Account access restricted by administrator.',
      }, { status: 403 });
    }

    if (!txHash) {
      return NextResponse.json({
        ok: false,
        error: lang === 'ru' ? 'Укажите хэш транзакции!' : 'Please enter a transaction hash!',
      }, { status: 400 });
    }

    const verification = await verifyOnChainPayment({
      txHash,
      network,
      planId: plan,
      billingCycle: effectiveCycle,
      lang,
      tgId: cleanTgId,
      intentId: intentId ? String(intentId) : undefined,
    });

    if (!verification.ok) {
      await logAudit('PAYMENT_AUDIT', 'payment_rejected', cleanTgId, {
        reason: (verification as any).fraudReason || 'failed',
        error: verification.error,
        network,
        plan,
        intentId: intentId || null,
        hash: String(txHash).slice(0, 80),
      }).catch(() => {});

      notifyPaymentFailed(cleanTgId, verification.error || '', lang).catch(() => {});
      return NextResponse.json(verification, { status: 400 });
    }

    await finalizeVerifiedPayment({
      tgId: cleanTgId,
      plan: verification.plan,
      cycle: verification.cycle,
      network: verification.network,
      amountUsd: Number(verification.amountUsd),
      deliveredUsd: Number(verification.deliveredUsd),
      symbol: verification.symbol,
      txHash: verification.hash,
      intentId: verification.intentId,
      lang,
      source,
    });

    return NextResponse.json({
      ok: true,
      plan: verification.plan,
      planId: verification.plan,
      cycle: verification.cycle,
      network: verification.network,
      amountUsd: verification.amountUsd,
      symbol: verification.symbol,
      hash: verification.hash,
      logs: verification.logs,
    });
  } catch (err: any) {
    console.error('Error in /api/verify-payment:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
