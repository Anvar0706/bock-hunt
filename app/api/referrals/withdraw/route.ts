import { NextResponse } from 'next/server';
import { createWithdrawalSafe, getUser } from '@/lib/db';
import { notifyAdmin } from '@/bot';
import { getBotMsg } from '@/bot/messages';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { verifyOperativeRequest } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipRate = checkRateLimit(`withdraw_ip:${ip}`, 8, 600000);
    if (!ipRate.allowed) {
      return NextResponse.json({
        ok: false,
        error: 'Too many withdrawal requests from this network. Please wait.',
      }, { status: 429 });
    }

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

    if (!tgId || effectiveAmount === undefined || !network || !effectiveAddress) {
      return NextResponse.json({ ok: false, error: 'Missing required withdrawal fields' }, { status: 400 });
    }

    const cleanTgId = String(tgId).trim();
    const auth = await verifyOperativeRequest(req, cleanTgId);
    if (!auth.ok) {
      return auth.response;
    }

    const userRate = checkRateLimit(`withdraw:${cleanTgId}`, 4, 600000);
    if (!userRate.allowed) {
      return NextResponse.json({
        ok: false,
        error: lang === 'ru'
          ? 'Слишком много запросов на вывод. Пожалуйста, подождите немного.'
          : 'Too many withdrawal requests. Please wait a few minutes before trying again.',
      }, { status: 429 });
    }

    const numAmount = Number(effectiveAmount);
    if (!Number.isFinite(numAmount) || numAmount < 10 || numAmount > 100000) {
      return NextResponse.json({
        ok: false,
        error: lang === 'ru'
          ? 'Минимальная сумма для вывода составляет $10.00 USD'
          : 'Minimum withdrawal amount is $10.00 USD',
      }, { status: 400 });
    }

    const cleanNet = String(network).toUpperCase();
    const isValidAddress =
      (cleanNet === 'TRON' && /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(effectiveAddress)) ||
      (cleanNet === 'ETHEREUM' && /^0x[a-fA-F0-9]{40}$/.test(effectiveAddress)) ||
      (cleanNet === 'SOLANA' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(effectiveAddress));

    if (!isValidAddress) {
      return NextResponse.json({
        ok: false,
        error: lang === 'ru'
          ? 'Неверный формат адреса кошелька для данной сети!'
          : 'Invalid destination address format for selected network!',
      }, { status: 400 });
    }

    const user = await getUser(cleanTgId);
    const result = await createWithdrawalSafe({
      tgId: cleanTgId,
      userName: user?.name || 'Operative',
      userUsername: user?.username || '',
      amountUsd: numAmount,
      network: cleanNet,
      walletAddress: effectiveAddress,
    });

    if (!result.ok) {
      if (result.reason === 'blocked') {
        return NextResponse.json({
          ok: false,
          error: lang === 'ru' ? 'Аккаунт заблокирован администратором.' : 'Account access restricted by administrator.',
        }, { status: 403 });
      }
      if (result.reason === 'cooldown') {
        return NextResponse.json({
          ok: false,
          error: lang === 'ru'
            ? 'Заявка на вывод уже создана и обрабатывается.'
            : 'A withdrawal request is already pending. Please allow 15 seconds.',
        }, { status: 429 });
      }
      return NextResponse.json({
        ok: false,
        error: lang === 'ru'
          ? 'Недостаточно средств на балансе!'
          : 'Insufficient available referral balance!',
      }, { status: 400 });
    }

    const adminAlert = getBotMsg('en', 'withdrawalAdminAlert', {
      id: result.withdrawal.id,
      userName: user?.name || 'Operative',
      userId: cleanTgId,
      userUname: user?.username || 'none',
      amountUsd: numAmount,
      network: cleanNet,
      address: effectiveAddress,
    });
    notifyAdmin(adminAlert).catch(() => {});

    return NextResponse.json({ ok: true, withdrawal: result.withdrawal });
  } catch (err: any) {
    console.error('Error in /api/referrals/withdraw:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
