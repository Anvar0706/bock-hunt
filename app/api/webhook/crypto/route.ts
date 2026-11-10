import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  getAddresses,
  isHashUsed,
  markHashUsed,
  listActivePendingIntents,
} from '@/lib/db';
import {
  inspectOnChainTransaction,
  doesTxMatchIntent,
} from '@/lib/blockchain';
import { finalizeVerifiedPayment } from '@/lib/paymentActivation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function safeTimingEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`crypto_webhook:${ip}`, 60, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const rawBody = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const alchemySig = req.headers.get('x-alchemy-signature') || '';
    const alchemyKey = (process.env.ALCHEMY_SIGNING_KEY || '').trim();
    const heliusSecret = (process.env.HELIUS_WEBHOOK_SECRET || '').trim();
    const genericSecret = (process.env.CRYPTO_WEBHOOK_SECRET || '').trim();
    const authHeader = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const webhookSecretHeader = (req.headers.get('x-webhook-secret') || '').trim();

    // Detect provider format & enforce configured cryptographic secrets
    const eventsToProcess: Array<{ network: string; txHash: string }> = [];

    if (payload?.event?.activity && Array.isArray(payload.event.activity)) {
      // Alchemy Address Activity Webhook (Ethereum)
      if (alchemyKey) {
        const expected = crypto.createHmac('sha256', alchemyKey).update(rawBody, 'utf8').digest('hex');
        if (!alchemySig || !safeTimingEqual(alchemySig.toLowerCase(), expected.toLowerCase())) {
          return NextResponse.json({ ok: false, error: 'Invalid Alchemy webhook signature' }, { status: 401 });
        }
      }
      for (const act of payload.event.activity) {
        if (act?.hash) {
          eventsToProcess.push({ network: 'ETHEREUM', txHash: String(act.hash) });
        }
      }
    } else if (Array.isArray(payload)) {
      // Helius Solana Enhanced Webhook (array of tx events)
      if (heliusSecret && !safeTimingEqual(authHeader, heliusSecret)) {
        return NextResponse.json({ ok: false, error: 'Invalid Helius webhook secret' }, { status: 401 });
      }
      for (const item of payload) {
        const sig = item?.signature || item?.transaction?.signatures?.[0];
        if (sig) {
          eventsToProcess.push({ network: 'SOLANA', txHash: String(sig) });
        }
      }
    } else if (payload?.txHash || payload?.txID || payload?.hash) {
      // Generic / TRON / Custom Webhook
      if (genericSecret && !safeTimingEqual(webhookSecretHeader || authHeader, genericSecret)) {
        return NextResponse.json({ ok: false, error: 'Invalid webhook secret' }, { status: 401 });
      }
      const net = String(payload.network || 'TRON').toUpperCase();
      const txHash = String(payload.txHash || payload.txID || payload.hash);
      eventsToProcess.push({ network: net, txHash });
    } else {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (eventsToProcess.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    const addrs = await getAddresses();
    let activatedCount = 0;

    for (const ev of eventsToProcess) {
      const expectedAddr = (addrs[ev.network] || '').trim();
      if (!expectedAddr) continue;

      if (await isHashUsed(ev.txHash)) continue;

      // Always perform independent on-chain RPC audit regardless of webhook body
      const inspection = await inspectOnChainTransaction({
        txHash: ev.txHash,
        network: ev.network,
        expectedAddr,
      });

      if (!inspection.ok) continue;

      const pendingIntents = await listActivePendingIntents(ev.network);
      const matchedIntent = pendingIntents.find(
        (intent) => doesTxMatchIntent(intent, inspection, 'auto').matched
      );

      if (!matchedIntent) continue;

      const claimed = await markHashUsed(ev.txHash, {
        plan: matchedIntent.plan,
        cycle: matchedIntent.cycle,
        network: ev.network,
        amountUsd: Number(inspection.deliveredUsd.toFixed(2)),
      });

      if (!claimed) continue;

      await finalizeVerifiedPayment({
        tgId: matchedIntent.tgId,
        plan: matchedIntent.plan,
        cycle: matchedIntent.cycle,
        network: ev.network,
        amountUsd: matchedIntent.baseUsd,
        deliveredUsd: Number(inspection.deliveredUsd.toFixed(2)),
        symbol: inspection.symbol,
        txHash: ev.txHash,
        intentId: matchedIntent.id,
        source: 'WEBHOOK',
      });

      activatedCount++;
    }

    return NextResponse.json({ ok: true, activated: activatedCount });
  } catch (err: any) {
    console.error('Error in /api/webhook/crypto:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Webhook error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'BlockHunt Crypto Push Webhook Receiver' });
}
