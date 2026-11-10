import { NextResponse } from 'next/server';
import {
  getPaymentIntentById,
  isHashUsed,
  markHashUsed,
} from '@/lib/db';
import {
  fetchRecentIncomingTxHashes,
  inspectOnChainTransaction,
  doesTxMatchIntent,
} from '@/lib/blockchain';
import { finalizeVerifiedPayment } from '@/lib/paymentActivation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { verifyOperativeRequest } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

async function handleCheck(req: Request, intentId: string, tgId: string, lang = 'en') {
  if (!intentId) {
    return NextResponse.json({ ok: false, error: 'intentId is required' }, { status: 400 });
  }

  const intent = await getPaymentIntentById(intentId);
  if (!intent) {
    return NextResponse.json({ ok: false, error: 'Payment invoice not found' }, { status: 404 });
  }

  if (tgId && intent.tgId !== String(tgId).trim()) {
    return NextResponse.json({ ok: false, error: 'Unauthorized invoice lookup' }, { status: 403 });
  }

  const auth = await verifyOperativeRequest(req, intent.tgId);
  if (!auth.ok) {
    return auth.response;
  }

  // Already confirmed (e.g., via push webhook or concurrent check)
  if (intent.status === 'COMPLETED') {
    return NextResponse.json({
      ok: true,
      status: 'COMPLETED',
      plan: intent.plan,
      planId: intent.plan,
      cycle: intent.cycle,
      network: intent.network,
      txHash: intent.txHash,
      amountUsd: intent.expectedUsd,
    });
  }

  if (Date.now() > intent.expiresAt || intent.status === 'EXPIRED') {
    return NextResponse.json({ ok: true, status: 'EXPIRED' });
  }

  // Check recent incoming txs for this network (10s cached on server)
  const candidateHashes = await fetchRecentIncomingTxHashes(
    intent.network,
    intent.depositAddress,
    intent.createdAt - 120_000
  );

  for (const hash of candidateHashes) {
    const used = await isHashUsed(hash);
    if (used) continue;

    const inspection = await inspectOnChainTransaction({
      txHash: hash,
      network: intent.network,
      expectedAddr: intent.depositAddress,
      isRu: lang === 'ru',
    });

    if (!inspection.ok) continue;

    const match = doesTxMatchIntent(intent, inspection, 'auto');
    if (!match.matched) continue;

    // Atomic double-spend lock
    const claimed = await markHashUsed(hash, {
      plan: intent.plan,
      cycle: intent.cycle,
      network: intent.network,
      amountUsd: Number(inspection.deliveredUsd.toFixed(2)),
    });

    if (!claimed) continue;

    await finalizeVerifiedPayment({
      tgId: intent.tgId,
      plan: intent.plan,
      cycle: intent.cycle,
      network: intent.network,
      amountUsd: intent.baseUsd,
      deliveredUsd: Number(inspection.deliveredUsd.toFixed(2)),
      symbol: inspection.symbol,
      txHash: hash,
      intentId: intent.id,
      lang,
      source: 'AUTO_DETECT',
    });

    return NextResponse.json({
      ok: true,
      status: 'COMPLETED',
      plan: intent.plan,
      planId: intent.plan,
      cycle: intent.cycle,
      network: intent.network,
      txHash: hash,
      symbol: inspection.symbol,
      amountUsd: intent.baseUsd,
      deliveredUsd: Number(inspection.deliveredUsd.toFixed(2)),
    });
  }

  return NextResponse.json({
    ok: true,
    status: 'PENDING',
    expiresAt: intent.expiresAt,
  });
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`check_intent:${ip}`, 40, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many status checks' }, { status: 429 });
    }

    const body = await req.json();
    return await handleCheck(req, String(body?.intentId || ''), String(body?.tgId || ''), String(body?.lang || 'en'));
  } catch (err: any) {
    console.error('Error in POST /api/payments/check-intent:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`check_intent:${ip}`, 40, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many status checks' }, { status: 429 });
    }

    const url = new URL(req.url);
    return await handleCheck(
      req,
      url.searchParams.get('intentId') || '',
      url.searchParams.get('tgId') || '',
      url.searchParams.get('lang') || 'en'
    );
  } catch (err: any) {
    console.error('Error in GET /api/payments/check-intent:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
