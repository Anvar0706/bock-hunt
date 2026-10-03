import { NextResponse } from 'next/server';
import { createWithdrawal, getReferralStats, getUser } from '@/lib/db';
import { notifyAdmin } from '@/bot';
import { getBotMsg } from '@/bot/messages';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { tgId, amount, network, address, lang = 'en' } = await req.json();

    if (!tgId || !amount || !network || !address) {
      return NextResponse.json({ ok: false, error: 'Missing required withdrawal fields' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      return NextResponse.json({
        ok: false,
        error: lang === 'ru'
          ? 'Минимальная сумма для вывода составляет $10.00 USD'
          : 'Minimum withdrawal amount is $10.00 USD',
      }, { status: 400 });
    }

    const stats = await getReferralStats(String(tgId));
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
      walletAddress: address,
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
