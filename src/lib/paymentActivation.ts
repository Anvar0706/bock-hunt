import {
  updateUser,
  getUser,
  creditReferralCommission,
  getReferralStats,
  logAudit,
  completePaymentIntent,
} from './db';
import {
  notifyPaymentSuccess,
  notifyAdmin,
  sendTelegramMessage,
} from '../bot';
import { getBotMsg } from '../bot/messages';

export async function finalizeVerifiedPayment(params: {
  tgId: string;
  plan: string;
  cycle: string;
  network: string;
  amountUsd: number;
  deliveredUsd: number;
  symbol: string;
  txHash: string;
  intentId?: string;
  lang?: string;
  source?: string;
}) {
  const {
    tgId,
    plan,
    cycle,
    network,
    amountUsd,
    deliveredUsd,
    symbol,
    txHash,
    intentId,
    lang,
    source = 'WEBAPP',
  } = params;

  const tgIdStr = String(tgId).trim();

  // If linked to an invoice intent, atomically lock COMPLETED status to prevent double-credit race
  if (intentId) {
    const completed = await completePaymentIntent(intentId, txHash);
    if (!completed) {
      return { alreadyProcessed: true };
    }
  }

  // 1. Upgrade operative tier (also updates referrals.plan)
  await updateUser(tgIdStr, { plan });
  await logAudit('PAYMENT_AUDIT', 'payment_verified', tgIdStr, {
    plan,
    cycle,
    network,
    amountUsd,
    deliveredUsd,
    hash: String(txHash).slice(0, 80),
    intentId: intentId || null,
    source,
  }).catch(() => {});

  const user = await getUser(tgIdStr);
  const effectiveLang = lang || user?.lang || 'en';

  // 2. Credit 50% referral commission if applicable
  const commissionAmount = (Number(amountUsd) || 0) * 0.5;
  if (commissionAmount > 0) {
    const commissionResult = await creditReferralCommission(tgIdStr, commissionAmount);
    if (commissionResult) {
      const referrerStats = await getReferralStats(commissionResult.referrerTgId);
      const referrer = await getUser(commissionResult.referrerTgId);
      const refLang = referrer?.lang || 'en';

      const refMsg = getBotMsg(refLang, 'referralBonus', {
        buyerName: user?.name || 'Operative',
        plan,
        commissionUsd: commissionAmount,
        balanceUsd: referrerStats.availableBalance,
      });
      sendTelegramMessage(commissionResult.referrerTgId, refMsg).catch(() => {});

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

  // 3. Notify user and admin
  notifyPaymentSuccess(
    tgIdStr,
    {
      plan,
      cycle,
      network,
      amountUsd,
      symbol,
      hash: txHash,
    },
    effectiveLang
  ).catch(() => {});

  const adminAlert = getBotMsg('en', 'txAdminAlert', {
    userName: user?.name || 'Operative',
    userId: tgIdStr,
    userUname: user?.username || 'none',
    plan,
    cycle,
    network,
    amountUsd,
    symbol,
    hash: txHash,
    source,
  });
  notifyAdmin(adminAlert).catch(() => {});

  return { alreadyProcessed: false };
}
