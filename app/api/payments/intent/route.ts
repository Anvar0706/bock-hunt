import { NextResponse } from 'next/server';
import {
  getAddresses,
  getPricingSettings,
  getUser,
  createOrReusePaymentIntent,
} from '@/lib/db';
import { getLiveCryptoPrices } from '@/lib/blockchain';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { verifyOperativeRequest } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`payment_intent:${ip}`, 30, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many requests. Please wait.' }, { status: 429 });
    }

    const body = await req.json();
    const {
      tgId,
      plan = 'pro',
      billingCycle = 'weekly',
      cycle = 'weekly',
      network = 'TRON',
    } = body || {};

    const cleanTgId = tgId ? String(tgId).trim() : '';
    const auth = await verifyOperativeRequest(req, cleanTgId);
    if (!auth.ok) {
      return auth.response;
    }

    const cleanPlan = String(plan).toLowerCase();
    if (cleanPlan !== 'pro' && cleanPlan !== 'enterprise') {
      return NextResponse.json({ ok: false, error: 'Invalid plan selected.' }, { status: 400 });
    }

    const cleanCycle = (billingCycle || cycle) === 'monthly' ? 'monthly' : 'weekly';
    const cleanNet = String(network).toUpperCase();
    if (cleanNet !== 'TRON' && cleanNet !== 'ETHEREUM' && cleanNet !== 'SOLANA') {
      return NextResponse.json({ ok: false, error: 'Unsupported network.' }, { status: 400 });
    }

    const user = await getUser(cleanTgId);
    if (user && (user.status === 'BLOCKED' || user.status === 'RESTRICTED')) {
      return NextResponse.json(
        { ok: false, error: 'Account access restricted by administrator.' },
        { status: 403 }
      );
    }

    const [pricing, addrs, prices] = await Promise.all([
      getPricingSettings(),
      getAddresses(),
      getLiveCryptoPrices(),
    ]);

    const depositAddress = (addrs[cleanNet] || '').trim();
    if (!depositAddress) {
      return NextResponse.json(
        { ok: false, error: `Deposit wallet not configured for ${cleanNet}` },
        { status: 500 }
      );
    }

    let baseUsd =
      cleanCycle === 'monthly'
        ? Number((pricing.plans as any)[cleanPlan]?.monthly || (cleanPlan === 'enterprise' ? 199 : 79))
        : Number((pricing.plans as any)[cleanPlan]?.weekly || (cleanPlan === 'enterprise' ? 69 : 25));

    if (pricing.discount?.enabled) {
      const discountPct = Number(pricing.discount.percent) || 0;
      baseUsd = Math.round(baseUsd * (1 - discountPct / 100));
    }

    const nativeSymbol = cleanNet === 'TRON' ? 'TRX' : cleanNet === 'SOLANA' ? 'SOL' : 'ETH';
    const nativePriceUsd =
      cleanNet === 'TRON' ? prices.TRX : cleanNet === 'SOLANA' ? prices.SOL : prices.ETH;

    const intent = await createOrReusePaymentIntent({
      tgId: cleanTgId,
      plan: cleanPlan,
      cycle: cleanCycle,
      network: cleanNet,
      depositAddress,
      baseUsd,
      nativePriceUsd,
      nativeSymbol,
      stableSymbol: 'USDT',
    });

    return NextResponse.json({ ok: true, intent, prices });
  } catch (err: any) {
    console.error('Error in /api/payments/intent:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
