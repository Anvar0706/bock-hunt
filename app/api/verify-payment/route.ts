import { NextResponse } from 'next/server';
import { verifyOnChainPayment } from '@/lib/blockchain';
import { updateUser, getUser, creditReferralCommission, getReferralStats } from '@/lib/db';
import { notifyPaymentSuccess, notifyPaymentFailed, notifyAdmin, sendTelegramMessage } from '@/bot';
import { getBotMsg } from '@/bot/messages';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      txHash,
      network = 'TRON',
      plan = 'pro',
      billingCycle = 'weekly',
      cycle = 'weekly',
      lang = 'en',
      tgId,
      source = 'WEBAPP',
    } = body || {};

    const effectiveCycle = billingCycle || cycle || 'weekly';

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
      tgId: tgId ? String(tgId) : undefined,
    });

    if (!verification.ok) {
      if (tgId) {
        notifyPaymentFailed(String(tgId), verification.error || '', lang).catch(() => {});
      }
      return NextResponse.json(verification, { status: 400 });
    }

    // On-Chain verification confirmed!
    if (tgId) {
      const tgIdStr = String(tgId);
      // Upgrade user plan
      await updateUser(tgIdStr, { plan });
      const user = await getUser(tgIdStr);

      // Check if user was referred by someone -> credit 50% commission
      const commissionAmount = (Number(verification.amountUsd) || 0) * 0.5;
      if (commissionAmount > 0) {
        const commissionResult = await creditReferralCommission(tgIdStr, commissionAmount);
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
            buyerId: tgIdStr,
            plan,
            commissionUsd: commissionAmount,
          });
          notifyAdmin(adminRefAlert).catch(() => {});
        }
      }

      // Notify User
      notifyPaymentSuccess(tgIdStr, {
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
        userId: tgIdStr,
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
    }

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
