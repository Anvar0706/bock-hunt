import { NextResponse } from 'next/server';
import { verifyOnChainPayment } from '@/lib/blockchain';
import { updateUser, getUser, creditReferralCommission, getReferralStats, logAudit } from '@/lib/db';
import { notifyPaymentSuccess, notifyPaymentFailed, notifyAdmin, sendTelegramMessage } from '@/bot';
import { getBotMsg } from '@/bot/messages';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

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
      source = 'WEBAPP',
    } = body || {};

    const rawPlan = String(body?.plan || body?.planId || 'pro').toLowerCase();
    if (rawPlan !== 'pro' && rawPlan !== 'enterprise') {
      return NextResponse.json({ ok: false, error: 'Invalid subscription plan.' }, { status: 400 });
    }
    const plan = rawPlan;
    const effectiveCycle = (billingCycle || cycle) === 'monthly' ? 'monthly' : 'weekly';

    const cleanTgId = tgId ? String(tgId).trim() : '';
    if (!/^\d{5,16}$/.test(cleanTgId)) {
      return NextResponse.json({
        ok: false,
        error: lang === 'ru' ? 'Требуется авторизация Telegram!' : 'Valid Telegram session is required for activation!',
      }, { status: 403 });
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
    });

    if (!verification.ok) {
      await logAudit('PAYMENT_AUDIT', 'payment_rejected', cleanTgId, {
        reason: (verification as any).fraudReason || 'failed',
        error: verification.error,
        network,
        plan,
        hash: String(txHash).slice(0, 80),
      }).catch(() => {});

      notifyPaymentFailed(cleanTgId, verification.error || '', lang).catch(() => {});
      return NextResponse.json(verification, { status: 400 });
    }

    // Strict On-Chain verification confirmed!
    await updateUser(cleanTgId, { plan });
    await logAudit('PAYMENT_AUDIT', 'payment_verified', cleanTgId, {
      plan,
      cycle: effectiveCycle,
      network,
      amountUsd: verification.amountUsd,
      deliveredUsd: verification.deliveredUsd,
      hash: String(txHash).slice(0, 80),
    }).catch(() => {});

    const user = await getUser(cleanTgId);

    // Check if user was referred by someone -> credit 50% commission
    const commissionAmount = (Number(verification.amountUsd) || 0) * 0.5;
    if (commissionAmount > 0) {
      const commissionResult = await creditReferralCommission(cleanTgId, commissionAmount);
      if (commissionResult) {
        const referrerStats = await getReferralStats(commissionResult.referrerTgId);
        const referrer = await getUser(commissionResult.referrerTgId);
        const refLang = referrer?.lang || 'en';

        // Notify Referrer
        const refMsg = getBotMsg(refLang, 'referralBonus', {
          buyerName: user?.name || 'Operative',
          plan,
          commissionUsd: commissionAmount,
          balanceUsd: referrerStats.availableBalance,
        });
        sendTelegramMessage(commissionResult.referrerTgId, refMsg).catch(() => {});

        // Alert Admin of referral commission
        const adminRefAlert = getBotMsg('en', 'referralBonusAdminAlert', {
          referrerId: commissionResult.referrerTgId,
          buyerName: user?.name || 'Operative',
          buyerId: cleanTgId,
          plan,
          commissionUsd: commissionAmount,
        });
        notifyAdmin(adminRefAlert).catch(() => {});
      }
    }

    // Notify User
    notifyPaymentSuccess(cleanTgId, {
      plan,
      cycle: effectiveCycle,
      network,
      amountUsd: verification.amountUsd,
      symbol: verification.symbol,
      hash: txHash,
    }, lang).catch(() => {});

    // Alert Admin
    const adminAlert = getBotMsg('en', 'txAdminAlert', {
      userName: user?.name || 'Operative',
      userId: cleanTgId,
      userUname: user?.username || 'none',
      plan,
      cycle: effectiveCycle,
      network,
      amountUsd: verification.amountUsd,
      symbol: verification.symbol,
      hash: txHash,
      source,
    });
    notifyAdmin(adminAlert).catch(() => {});

    return NextResponse.json({
      ok: true,
      plan,
      cycle: effectiveCycle,
      network,
      amountUsd: verification.amountUsd,
      symbol: verification.symbol,
      hash: txHash,
      logs: verification.logs,
    });
  } catch (err: any) {
    console.error('Error in /api/verify-payment:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
