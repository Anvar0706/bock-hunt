import { NextResponse } from 'next/server';
import { createWithdrawal, getReferralStats, getUser } from '@/lib/db';
import { notifyAdmin } from '@/bot';
import { getBotMsg } from '@/bot/messages';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tgId,
      amount,
      amountUsd,
      network,
      address,
      walletAddress,
      lang = 'en',
    } = body || {};

    const effectiveAmount = amountUsd !== undefined ? amountUsd : amount;
    const effectiveAddress = String(walletAddress || address || '').trim();

    if (tgId) {
      const rate = checkRateLimit(`withdraw:${tgId}`, 4, 600000); // 4 per 10 minutes
      if (!rate.allowed) {
        return NextResponse.json({
          ok: false,
          error: lang === 'ru'
            ? 'Слишком много запросов на вывод. Пожалуйста, подождите немного.'
            : 'Too many withdrawal requests. Please wait a few minutes before trying again.',
        }, { status: 429 });
      }
    }

    if (!tgId || effectiveAmount === undefined || !network || !effectiveAddress) {
      return NextResponse.json({ ok: false, error: 'Missing required withdrawal fields' }, { status: 400 });
    }

    const numAmount = Number(effectiveAmount);
    if (!Number.isFinite(numAmount) || numAmount < 10) {
      return NextResponse.json({
        ok: false,
        error: lang === 'ru'
          ? 'Минимальная сумма для вывода составляет $10.00 USD'
          : 'Minimum withdrawal amount is $10.00 USD',
      }, { status: 400 });
    }

    const cleanAddr = effectiveAddress;
    const isValidAddress =
      (network === 'TRON' && /^T[1-9A-HJ-NP-za-km-z]{33}$/.test(cleanAddr)) ||
      (network === 'ETHEREUM' && /^0x[a-fA-F0-9]{40}$/.test(cleanAddr)) ||
      (network === 'SOLANA' && /^[1-9A-HJ-NP-za-km-z]{32,44}$/.test(cleanAddr));

    if (!isValidAddress) {
      return NextResponse.json({
        ok: false,
        error: lang === 'ru'
          ? 'Неверный формат адреса кошелька для данной сети!'
          : 'Invalid destination address format for selected network!',
      }, { status: 400 });
    }

    const stats = await getReferralStats(String(tgId));

    // Prevent concurrent double-spend requests
    const existingPending = stats.withdrawalsList?.find(
      (w) => w.status === 'PENDING' && Date.now() - new Date(w.requestedAt).getTime() < 15000
    );
    if (existingPending) {
      return NextResponse.json({
        ok: false,
        error: lang === 'ru'
          ? 'Заявка на вывод уже создана и обрабатывается.'
          : 'A withdrawal request is already pending. Please allow 15 seconds.',
      }, { status: 429 });
    }

    if (numAmount > stats.availableBalance) {
      return NextResponse.json({
        ok: false,
        error: lang === 'ru'
          ? 'Недостаточно средств на балансе!'
          : 'Insufficient available referral balance!',
      }, { status: 400 });
    }

    const user = await getUser(String(tgId));

    const withdrawal = await createWithdrawal({
      tgId: String(tgId),
      userName: user?.name || 'Operative',
      userUsername: user?.username || '',
      amountUsd: numAmount,
      network,
      walletAddress: effectiveAddress,
    });

    // Alert Admin via Telegram Bot
    const adminAlert = getBotMsg('en', 'withdrawalAdminAlert', {
      id: withdrawal.id,
      userName: user?.name || 'Operative',
      userId: String(tgId),
      userUname: user?.username || 'none',
      amountUsd: numAmount,
      network,
      address,
    });
    notifyAdmin(adminAlert).catch(() => {});

    return NextResponse.json({ ok: true, withdrawal });
  } catch (err: any) {
    console.error('Error in /api/referrals/withdraw:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
