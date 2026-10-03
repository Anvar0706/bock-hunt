import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let cachedPrices = { TRX: 0.33, ETH: 2400, SOL: 145, USDT: 1.0 };
let lastFetch = 0;

export async function GET() {
  const now = Date.now();
  if (now - lastFetch < 30000) {
    // 30 seconds cache
    return NextResponse.json({ ok: true, prices: cachedPrices });
  }

  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tron,ethereum,solana,tether&vs_currencies=usd', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.tron?.usd) cachedPrices.TRX = Number(data.tron.usd);
      if (data.ethereum?.usd) cachedPrices.ETH = Number(data.ethereum.usd);
      if (data.solana?.usd) cachedPrices.SOL = Number(data.solana.usd);
      if (data.tether?.usd) cachedPrices.USDT = Number(data.tether.usd);
      lastFetch = now;
      return NextResponse.json({ ok: true, prices: cachedPrices });
    }
  } catch {}

  // Fallback Binance
  try {
    const [trx, eth, sol] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=TRXUSDT', { signal: AbortSignal.timeout(3000) })
        .then((r) => r.json())
        .catch(() => null),
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT', { signal: AbortSignal.timeout(3000) })
        .then((r) => r.json())
        .catch(() => null),
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT', { signal: AbortSignal.timeout(3000) })
        .then((r) => r.json())
        .catch(() => null),
    ]);
    if (trx?.price) cachedPrices.TRX = parseFloat(trx.price);
    if (eth?.price) cachedPrices.ETH = parseFloat(eth.price);
    if (sol?.price) cachedPrices.SOL = parseFloat(sol.price);
    lastFetch = now;
  } catch {}

  return NextResponse.json({ ok: true, prices: cachedPrices });
}
