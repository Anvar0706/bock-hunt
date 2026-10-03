export interface CryptoPrices {
  ETH: number;
  SOL: number;
  TRX: number;
  USDT: number;
}

// Fallback baseline prices in case user is offline or API fails
export const DEFAULT_CRYPTO_PRICES: CryptoPrices = {
  ETH: 2400.0,
  SOL: 97.0,
  TRX: 0.33,
  USDT: 1.0,
};

let cachedPrices: CryptoPrices = { ...DEFAULT_CRYPTO_PRICES };
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache

// Fetch live crypto prices from backend oracle API or public fallback APIs
export async function fetchLiveCryptoPrices(): Promise<CryptoPrices> {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_TTL_MS && lastFetchTime !== 0) {
    return cachedPrices;
  }

  // Attempt 1: Local Backend Oracle (/api/crypto-prices) - fastest & no CORS/rate limits
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('/api/crypto-prices', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.prices) {
        cachedPrices = {
          ETH: Number(data.prices.ETH) || DEFAULT_CRYPTO_PRICES.ETH,
          SOL: Number(data.prices.SOL) || DEFAULT_CRYPTO_PRICES.SOL,
          TRX: Number(data.prices.TRX) || DEFAULT_CRYPTO_PRICES.TRX,
          USDT: Number(data.prices.USDT) || 1.0,
        };
        lastFetchTime = now;
        return cachedPrices;
      }
    }
  } catch {}

  // Attempt 2: CoinGecko Simple Price API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,solana,tron,tether&vs_currencies=usd',
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      cachedPrices = {
        ...cachedPrices,
        ETH: Number(data.ethereum?.usd) || DEFAULT_CRYPTO_PRICES.ETH,
        SOL: Number(data.solana?.usd) || DEFAULT_CRYPTO_PRICES.SOL,
        TRX: Number(data.tron?.usd) || DEFAULT_CRYPTO_PRICES.TRX,
        USDT: Number(data.tether?.usd) || 1.0,
      };
      lastFetchTime = now;
      return cachedPrices;
    }
  } catch (err) {
    console.warn('CoinGecko fetch failed, trying Coinbase/Binance fallback...', err);
  }

  // Attempt 3: Coinbase & Binance Spot Price API fallback
  try {
    const [ethRes, solRes, binanceTrx] = await Promise.all([
      fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot').then((r) => r.json()).catch(() => null),
      fetch('https://api.coinbase.com/v2/prices/SOL-USD/spot').then((r) => r.json()).catch(() => null),
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=TRXUSDT').then((r) => r.json()).catch(() => null),
    ]);

    cachedPrices = {
      ...cachedPrices,
      ETH: Number(ethRes?.data?.amount) || cachedPrices.ETH,
      SOL: Number(solRes?.data?.amount) || cachedPrices.SOL,
      TRX: Number(binanceTrx?.price) || cachedPrices.TRX,
      USDT: 1.0,
    };
    lastFetchTime = now;
    return cachedPrices;
  } catch (err) {
    console.warn('Fallback fetch failed, using existing cache:', err);
  }

  return cachedPrices;
}

// Helper to convert USD amount to target crypto using live prices
export function convertUsdToCrypto(
  usdAmount: number,
  symbol: 'ETH' | 'SOL' | 'USDT' | 'TRX',
  livePrices: CryptoPrices = cachedPrices
): { cryptoAmount: string; rate: number } {
  const price = livePrices[symbol] || 1;
  const rawAmount = usdAmount / price;

  if (symbol === 'ETH') {
    return { cryptoAmount: rawAmount.toFixed(4), rate: price };
  }
  if (symbol === 'SOL') {
    return { cryptoAmount: rawAmount.toFixed(3), rate: price };
  }
  if (symbol === 'TRX') {
    return { cryptoAmount: rawAmount.toFixed(2), rate: price };
  }
  // USDT
  return {
    cryptoAmount: usdAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    rate: 1.0,
  };
}
