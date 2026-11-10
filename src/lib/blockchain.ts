import {
  getAddresses,
  getPricingSettings,
  isHashUsed,
  markHashUsed,
} from './db';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const TRANSFER_TOPIC_HEX = 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const MAX_TX_AGE_MS = 72 * 60 * 60 * 1000; // 72 hours max transaction age

interface PriceMap {
  TRX: number;
  ETH: number;
  SOL: number;
  USDT: number;
}

let cachedPrices: PriceMap = { TRX: 0.31, ETH: 2040, SOL: 83, USDT: 1.0 };
let lastPriceFetch = 0;

function decodeTronAddress(b58: string) {
  try {
    const trimmed = (b58 || '').trim();
    let num = 0n;
    for (const c of trimmed) {
      const idx = BigInt(BASE58_ALPHABET.indexOf(c));
      if (idx < 0n) return null;
      num = num * 58n + idx;
    }
    let hex = num.toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    let leadingZeros = 0;
    for (const c of trimmed) {
      if (c === '1') leadingZeros++;
      else break;
    }
    const fullHex = ('00'.repeat(leadingZeros) + hex).toLowerCase();
    if (fullHex.length !== 50) return null;
    const addrWith41 = fullHex.slice(0, 42);
    const raw20 = addrWith41.slice(2);
    return { addrWith41, raw20 };
  } catch {
    return null;
  }
}

function tokenUnitsToFloat(raw: string | bigint, decimals: number): number {
  try {
    const val = typeof raw === 'bigint' ? raw : BigInt(raw);
    if (val <= 0n) return 0;
    const base = 10n ** BigInt(decimals);
    const whole = val / base;
    const frac = val % base;
    return Number(whole) + Number(frac) / Number(base);
  } catch {
    return 0;
  }
}

function isRecentTimestamp(txMs: number): boolean {
  if (!Number.isFinite(txMs) || txMs <= 0) return false;
  const diff = Date.now() - txMs;
  // Allow up to 5 min future clock skew and up to 72 hours past
  return diff >= -300_000 && diff <= MAX_TX_AGE_MS;
}

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 4500): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getLiveCryptoPrices(): Promise<PriceMap> {
  const now = Date.now();
  if (now - lastPriceFetch < 30_000) {
    return cachedPrices;
  }

  // Primary: CoinGecko
  const cg = await fetchJson(
    'https://api.coingecko.com/api/v3/simple/price?ids=tron,ethereum,solana,tether&vs_currencies=usd',
    { headers: { 'User-Agent': 'Mozilla/5.0' } },
    4000
  );
  if (cg && cg.ethereum?.usd && cg.solana?.usd && cg.tron?.usd) {
    cachedPrices = {
      TRX: Number(cg.tron.usd),
      ETH: Number(cg.ethereum.usd),
      SOL: Number(cg.solana.usd),
      USDT: Number(cg.tether?.usd || 1.0),
    };
    lastPriceFetch = now;
    return cachedPrices;
  }

  // Secondary fallback: Coinbase spot for ETH/SOL & Binance for TRX/ETH/SOL
  const [cbEth, cbSol, binTrx] = await Promise.all([
    fetchJson('https://api.coinbase.com/v2/prices/ETH-USD/spot', undefined, 3000),
    fetchJson('https://api.coinbase.com/v2/prices/SOL-USD/spot', undefined, 3000),
    fetchJson('https://api.binance.com/api/v3/ticker/price?symbol=TRXUSDT', undefined, 3000),
  ]);

  if (cbEth?.data?.amount) cachedPrices.ETH = parseFloat(cbEth.data.amount);
  if (cbSol?.data?.amount) cachedPrices.SOL = parseFloat(cbSol.data.amount);
  if (binTrx?.price) cachedPrices.TRX = parseFloat(binTrx.price);
  lastPriceFetch = now;

  return cachedPrices;
}

const ETH_STABLECOINS: Record<string, { decimals: number; symbol: string }> = {
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { decimals: 6, symbol: 'USDT' }, // Tether USD
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { decimals: 6, symbol: 'USDC' }, // USD Coin
  '0x6b175474e89094c44da98b954eedeac495271d0f': { decimals: 18, symbol: 'DAI' }, // Dai
};

const TRON_STABLECOIN_MAP = (() => {
  const usdt = decodeTronAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
  const usdc = decodeTronAddress('TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8');
  return {
    byRaw20: new Map<string, { decimals: number; symbol: string }>([
      ...(usdt ? [[usdt.raw20, { decimals: 6, symbol: 'USDT' }] as const] : []),
      ...(usdc ? [[usdc.raw20, { decimals: 6, symbol: 'USDC' }] as const] : []),
    ]),
    byBase58: new Map<string, { decimals: number; symbol: string }>([
      ['TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', { decimals: 6, symbol: 'USDT' }],
      ['TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8', { decimals: 6, symbol: 'USDC' }],
    ]),
  };
})();

const SOL_STABLECOINS: Record<string, { decimals: number; symbol: string }> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { decimals: 6, symbol: 'USDC' },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: { decimals: 6, symbol: 'USDT' },
};

async function verifyTronTransaction(
  rawTronHash: string,
  expectedAddr: string,
  minRequiredWithBuffer: number,
  minUsd: number,
  prices: PriceMap,
  isRu: boolean,
  logs: string[]
): Promise<
  | { ok: true; deliveredUsd: number; symbol: string }
  | { ok: false; error: string; fraudReason?: string }
> {
  const decodedExpected = decodeTronAddress(expectedAddr);
  if (!decodedExpected) {
    return { ok: false, error: 'System deposit address misconfigured for TRON.' };
  }

  const postOpts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: rawTronHash }),
  };

  const [tgTx1, tgInfo1, tgTx2, tsInfo] = await Promise.all([
    fetchJson('https://api.trongrid.io/wallet/gettransactionbyid', postOpts, 4500),
    fetchJson('https://api.trongrid.io/wallet/gettransactioninfobyid', postOpts, 4500),
    fetchJson('https://api.tronstack.io/wallet/gettransactionbyid', postOpts, 4500),
    fetchJson(
      `https://apilist.tronscanapi.com/api/transaction-info?hash=${rawTronHash}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
      4500
    ),
  ]);

  const tgTx = tgTx1?.txID ? tgTx1 : tgTx2?.txID ? tgTx2 : null;
  const tgInfo = tgInfo1?.id ? tgInfo1 : null;
  const hasTronScan = Boolean(tsInfo && tsInfo.hash);

  if (!tgTx && !hasTronScan) {
    logs.push(`> [FAILED] Transaction not found on TRON ledger`);
    return {
      ok: false,
      error: isRu
        ? 'Транзакция не найдена в блокчейне TRON! Проверьте TxID или дождитесь подтверждения.'
        : 'Transaction not found on TRON blockchain! Please verify TxID or wait for network confirmation.',
    };
  }

  // 1. Confirmation & SUCCESS status check
  if (tgTx) {
    const retStatus = tgTx.ret?.[0]?.contractRet;
    if (retStatus && retStatus !== 'SUCCESS') {
      logs.push(`> [REJECTED] TRON execution failed with status: ${retStatus}`);
      return {
        ok: false,
        fraudReason: `tron_status_${retStatus}`,
        error: isRu
          ? `Транзакция отклонена сетью TRON (${retStatus}).`
          : `TRON transaction failed on-chain (${retStatus}).`,
      };
    }
    if (!tgInfo && !hasTronScan) {
      logs.push(`> [FAILED] Transaction is still unconfirmed in mempool`);
      return {
        ok: false,
        error: isRu
          ? 'Транзакция ещё не подтверждена в блокчейне TRON. Подождите 1 минуту.'
          : 'Transaction is not yet confirmed on TRON. Please wait for block confirmation.',
      };
    }
  } else if (hasTronScan) {
    if (tsInfo.confirmed === false) {
      return {
        ok: false,
        error: isRu
          ? 'Транзакция ещё не подтверждена в сети TRON.'
          : 'Transaction is not yet confirmed on TRON.',
      };
    }
    if (tsInfo.contractRet && tsInfo.contractRet !== 'SUCCESS') {
      return {
        ok: false,
        fraudReason: `tronscan_status_${tsInfo.contractRet}`,
        error: isRu
          ? `Транзакция завершилась с ошибкой (${tsInfo.contractRet}).`
          : `TRON transaction failed (${tsInfo.contractRet}).`,
      };
    }
  }

  // 2. Recency check
  const txTimestampMs = Number(
    tgInfo?.blockTimeStamp || tsInfo?.timestamp || tgTx?.raw_data?.timestamp || 0
  );
  if (!isRecentTimestamp(txTimestampMs)) {
    logs.push(`> [REJECTED] Transaction expired (>72h old)`);
    return {
      ok: false,
      fraudReason: 'expired_tx',
      error: isRu
        ? 'Срок действия транзакции истёк (старше 72 часов).'
        : 'Transaction is too old (>72 hours). Please submit a fresh payment.',
    };
  }

  // 3. Recipient & Delivered USD calculation
  let deliveredUsd = 0;
  let detectedSymbol = 'USDT';

  // Parse TronGrid native TRX + TRC20 logs
  if (tgTx) {
    const contract = tgTx.raw_data?.contract?.[0];
    if (contract?.type === 'TransferContract') {
      const val = contract.parameter?.value || {};
      const toHex = String(val.to_address || '').toLowerCase();
      if (toHex === decodedExpected.addrWith41 || toHex === expectedAddr.toLowerCase()) {
        const trxAmt = tokenUnitsToFloat(BigInt(val.amount || 0), 6);
        deliveredUsd += trxAmt * prices.TRX;
        detectedSymbol = 'TRX';
      }
    }

    if (tgInfo && Array.isArray(tgInfo.log)) {
      for (const entry of tgInfo.log) {
        const contractRaw20 = String(entry.address || '').toLowerCase();
        const tokenMeta = TRON_STABLECOIN_MAP.byRaw20.get(contractRaw20);
        const topics: string[] = Array.isArray(entry.topics) ? entry.topics : [];
        if (
          tokenMeta &&
          topics.length >= 3 &&
          String(topics[0] || '').toLowerCase() === TRANSFER_TOPIC_HEX
        ) {
          const toRaw20 = String(topics[2] || '').slice(-40).toLowerCase();
          if (toRaw20 === decodedExpected.raw20) {
            const rawDataHex = String(entry.data || '0').replace(/^0x/, '') || '0';
            const amt = tokenUnitsToFloat(BigInt('0x' + rawDataHex), tokenMeta.decimals);
            deliveredUsd += amt * prices.USDT;
            detectedSymbol = tokenMeta.symbol;
          }
        }
      }
    }
  } else if (hasTronScan) {
    if (tsInfo.contractType === 1 && tsInfo.toAddress === expectedAddr) {
      const trxAmt = tokenUnitsToFloat(BigInt(tsInfo.contractData?.amount || 0), 6);
      deliveredUsd += trxAmt * prices.TRX;
      detectedSymbol = 'TRX';
    }
    if (Array.isArray(tsInfo.trc20TransferInfo)) {
      for (const t of tsInfo.trc20TransferInfo) {
        const tokenMeta = TRON_STABLECOIN_MAP.byBase58.get(String(t.contract_address || ''));
        if (tokenMeta && t.to_address === expectedAddr) {
          const amt = tokenUnitsToFloat(BigInt(t.amount_str || 0), Number(t.decimals || tokenMeta.decimals));
          deliveredUsd += amt * prices.USDT;
          detectedSymbol = tokenMeta.symbol;
        }
      }
    }
  }

  if (deliveredUsd <= 0) {
    logs.push(`> [REJECTED] Recipient mismatch! No TRX/USDT received at ${expectedAddr}`);
    return {
      ok: false,
      fraudReason: 'recipient_mismatch',
      error: isRu
        ? 'Получатель не совпадает! В данной транзакции средства не поступали на наш адрес.'
        : 'Recipient mismatch! No funds in this transaction were sent to the designated deposit address.',
    };
  }

  if (deliveredUsd < minRequiredWithBuffer) {
    logs.push(`> [REJECTED] Underpayment: Received ~$${deliveredUsd.toFixed(2)} USD, Required >= $${minUsd} USD`);
    return {
      ok: false,
      fraudReason: 'underpayment',
      error: isRu
        ? `Недостаточная сумма оплаты: получено ~$${deliveredUsd.toFixed(2)}, требуется $${minUsd}.`
        : `Insufficient payment amount: received ~$${deliveredUsd.toFixed(2)} USD, plan requires $${minUsd} USD.`,
    };
  }

  return { ok: true, deliveredUsd, symbol: detectedSymbol };
}

async function verifyEthereumTransaction(
  rawEthHash: string,
  expectedAddr: string,
  minRequiredWithBuffer: number,
  minUsd: number,
  prices: PriceMap,
  isRu: boolean,
  logs: string[]
): Promise<
  | { ok: true; deliveredUsd: number; symbol: string }
  | { ok: false; error: string; fraudReason?: string }
> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(expectedAddr)) {
    return { ok: false, error: 'System deposit address misconfigured for ETHEREUM.' };
  }
  const expectedLower = expectedAddr.toLowerCase();

  const ethRpcs = [
    'https://ethereum.publicnode.com',
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://cloudflare-eth.com',
  ];

  const rpcCall = async (rpcUrl: string, method: string, params: unknown[]) => {
    const res = await fetchJson(
      rpcUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      },
      4500
    );
    return res?.result ?? null;
  };

  const [txResults, receiptResults] = await Promise.all([
    Promise.all(ethRpcs.map((u) => rpcCall(u, 'eth_getTransactionByHash', [rawEthHash]))),
    Promise.all(ethRpcs.map((u) => rpcCall(u, 'eth_getTransactionReceipt', [rawEthHash]))),
  ]);

  const tx = txResults.find(Boolean);
  const receipt = receiptResults.find(Boolean);

  if (!tx) {
    logs.push(`> [FAILED] Transaction not found on Ethereum RPCs`);
    return {
      ok: false,
      error: isRu
        ? 'Транзакция не найдена в блокчейне Ethereum! Убедитесь, что транзакция подтверждена.'
        : 'Transaction not found on Ethereum blockchain! Please ensure it is confirmed.',
    };
  }

  if (!receipt || !receipt.blockNumber) {
    logs.push(`> [FAILED] Transaction is still pending (no block receipt)`);
    return {
      ok: false,
      error: isRu
        ? 'Транзакция ещё не подтверждена в блоке Ethereum. Дождитесь подтверждения.'
        : 'Ethereum transaction is still pending confirmation. Please wait for it to mine.',
    };
  }

  if (receipt.status !== '0x1') {
    logs.push(`> [REJECTED] Ethereum receipt status failed (${receipt.status})`);
    return {
      ok: false,
      fraudReason: `eth_status_${receipt.status}`,
      error: isRu
        ? 'Транзакция в сети Ethereum завершилась ошибкой (Reverted).'
        : 'Ethereum transaction failed / reverted on-chain.',
    };
  }

  // Block timestamp recency check
  const blockResults = await Promise.all(
    ethRpcs.slice(0, 3).map((u) => rpcCall(u, 'eth_getBlockByNumber', [receipt.blockNumber, false]))
  );
  const block = blockResults.find(Boolean);
  if (!block?.timestamp || !isRecentTimestamp(Number(BigInt(block.timestamp)) * 1000)) {
    logs.push(`> [REJECTED] Transaction expired (>72h old)`);
    return {
      ok: false,
      fraudReason: 'expired_tx',
      error: isRu
        ? 'Срок действия транзакции истёк (старше 72 часов).'
        : 'Transaction is too old (>72 hours). Please submit a fresh payment.',
    };
  }

  let deliveredUsd = 0;
  let detectedSymbol = 'ETH';

  // 1. Native ETH transfer directly to admin wallet
  if ((tx.to || '').toLowerCase() === expectedLower) {
    const ethAmt = tokenUnitsToFloat(BigInt(tx.value || '0x0'), 18);
    deliveredUsd += ethAmt * prices.ETH;
    detectedSymbol = 'ETH';
  }

  // 2. ERC-20 Official Stablecoin Transfer events to admin wallet
  if (Array.isArray(receipt.logs)) {
    for (const entry of receipt.logs) {
      const tokenAddr = String(entry.address || '').toLowerCase();
      const tokenMeta = ETH_STABLECOINS[tokenAddr];
      const topics: string[] = Array.isArray(entry.topics) ? entry.topics : [];
      if (
        tokenMeta &&
        topics.length >= 3 &&
        String(topics[0] || '').toLowerCase() === '0x' + TRANSFER_TOPIC_HEX
      ) {
        const toAddr = '0x' + String(topics[2] || '').slice(-40).toLowerCase();
        if (toAddr === expectedLower) {
          const amt = tokenUnitsToFloat(BigInt(entry.data || '0x0'), tokenMeta.decimals);
          deliveredUsd += amt * prices.USDT;
          detectedSymbol = tokenMeta.symbol;
        }
      }
    }
  }

  if (deliveredUsd <= 0) {
    logs.push(`> [REJECTED] Recipient mismatch! No ETH/USDT received at ${expectedAddr}`);
    return {
      ok: false,
      fraudReason: 'recipient_mismatch',
      error: isRu
        ? 'Получатель не совпадает! В данной транзакции средства не поступали на наш адрес.'
        : 'Recipient mismatch! No funds in this transaction were sent to the designated deposit address.',
    };
  }

  if (deliveredUsd < minRequiredWithBuffer) {
    logs.push(`> [REJECTED] Underpayment: Received ~$${deliveredUsd.toFixed(2)} USD, Required >= $${minUsd} USD`);
    return {
      ok: false,
      fraudReason: 'underpayment',
      error: isRu
        ? `Недостаточная сумма оплаты: получено ~$${deliveredUsd.toFixed(2)}, требуется $${minUsd}.`
        : `Insufficient payment amount: received ~$${deliveredUsd.toFixed(2)} USD, plan requires $${minUsd} USD.`,
    };
  }

  return { ok: true, deliveredUsd, symbol: detectedSymbol };
}

async function verifySolanaTransaction(
  cleanHash: string,
  expectedAddr: string,
  minRequiredWithBuffer: number,
  minUsd: number,
  prices: PriceMap,
  isRu: boolean,
  logs: string[]
): Promise<
  | { ok: true; deliveredUsd: number; symbol: string }
  | { ok: false; error: string; fraudReason?: string }
> {
  const solRpcs = [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
    'https://solana-mainnet.rpc.extrnode.com',
  ];

  const responses = await Promise.all(
    solRpcs.map(async (rpcUrl) => {
      const res = await fetchJson(
        rpcUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTransaction',
            params: [cleanHash, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
          }),
        },
        4500
      );
      return res?.result ?? null;
    })
  );

  const solTx = responses.find(Boolean);
  if (!solTx || !solTx.meta) {
    logs.push(`> [FAILED] Transaction not found on Solana RPCs`);
    return {
      ok: false,
      error: isRu
        ? 'Транзакция не найдена в блокчейне Solana! Убедитесь в подтверждении сети.'
        : 'Transaction not found on Solana blockchain! Please ensure it is confirmed.',
    };
  }

  if (solTx.meta.err !== null) {
    logs.push(`> [REJECTED] Solana transaction failed on-chain`);
    return {
      ok: false,
      fraudReason: 'sol_tx_err',
      error: isRu
        ? 'Транзакция в сети Solana завершилась с ошибкой.'
        : 'Solana transaction failed on-chain.',
    };
  }

  if (solTx.blockTime && !isRecentTimestamp(Number(solTx.blockTime) * 1000)) {
    logs.push(`> [REJECTED] Transaction expired (>72h old)`);
    return {
      ok: false,
      fraudReason: 'expired_tx',
      error: isRu
        ? 'Срок действия транзакции истёк (старше 72 часов).'
        : 'Transaction is too old (>72 hours). Please submit a fresh payment.',
    };
  }

  let deliveredUsd = 0;
  let detectedSymbol = 'SOL';

  // 1. Native SOL delta for expectedAddr
  const accountKeys: any[] = solTx.transaction?.message?.accountKeys || [];
  const addrIdx = accountKeys.findIndex((k) => {
    const pubkey = typeof k === 'string' ? k : k?.pubkey;
    return pubkey === expectedAddr;
  });

  if (addrIdx >= 0) {
    const preLamports = BigInt(solTx.meta.preBalances?.[addrIdx] ?? 0);
    const postLamports = BigInt(solTx.meta.postBalances?.[addrIdx] ?? 0);
    if (postLamports > preLamports) {
      const solAmt = tokenUnitsToFloat(postLamports - preLamports, 9);
      deliveredUsd += solAmt * prices.SOL;
      detectedSymbol = 'SOL';
    }
  }

  // 2. SPL Official USDT/USDC balance delta for owner == expectedAddr
  const preTokens: any[] = solTx.meta.preTokenBalances || [];
  const postTokens: any[] = solTx.meta.postTokenBalances || [];

  for (const post of postTokens) {
    const tokenMeta = SOL_STABLECOINS[String(post.mint || '')];
    if (tokenMeta && post.owner === expectedAddr) {
      const pre = preTokens.find(
        (p) => p.accountIndex === post.accountIndex && p.mint === post.mint
      );
      const postRaw = BigInt(post.uiTokenAmount?.amount ?? 0);
      const preRaw = BigInt(pre?.uiTokenAmount?.amount ?? 0);
      if (postRaw > preRaw) {
        const dec = Number(post.uiTokenAmount?.decimals ?? tokenMeta.decimals);
        const amt = tokenUnitsToFloat(postRaw - preRaw, dec);
        deliveredUsd += amt * prices.USDT;
        detectedSymbol = tokenMeta.symbol;
      }
    }
  }

  if (deliveredUsd <= 0) {
    logs.push(`> [REJECTED] Recipient mismatch! No SOL/USDC/USDT received at ${expectedAddr}`);
    return {
      ok: false,
      fraudReason: 'recipient_mismatch',
      error: isRu
        ? 'Получатель не совпадает! В данной транзакции средства не поступали на наш адрес.'
        : 'Recipient mismatch! No funds in this transaction were sent to the designated deposit address.',
    };
  }

  if (deliveredUsd < minRequiredWithBuffer) {
    logs.push(`> [REJECTED] Underpayment: Received ~$${deliveredUsd.toFixed(2)} USD, Required >= $${minUsd} USD`);
    return {
      ok: false,
      fraudReason: 'underpayment',
      error: isRu
        ? `Недостаточная сумма оплаты: получено ~$${deliveredUsd.toFixed(2)}, требуется $${minUsd}.`
        : `Insufficient payment amount: received ~$${deliveredUsd.toFixed(2)} USD, plan requires $${minUsd} USD.`,
    };
  }

  return { ok: true, deliveredUsd, symbol: detectedSymbol };
}

export async function verifyOnChainPayment(params: {
  txHash: string;
  network: string;
  planId: string;
  billingCycle: string;
  lang?: string;
  tgId?: string;
}) {
  const { txHash, network, planId, billingCycle, lang } = params;
  const isRu = lang === 'ru';
  const logs: string[] = [];

  const cleanHash = (txHash || '').trim();
  if (!cleanHash) {
    return {
      ok: false,
      error: isRu ? 'Укажите хэш транзакции!' : 'Please provide a transaction hash!',
      logs: ['> [FAILED] Empty transaction hash'],
    };
  }

  if (planId !== 'pro' && planId !== 'enterprise') {
    return {
      ok: false,
      error: 'Invalid plan selected.',
      logs: ['> [FAILED] Invalid plan identifier'],
    };
  }

  const targetPlan = planId;
  const targetCycle = billingCycle === 'monthly' ? 'monthly' : 'weekly';

  // 1. Double-spend pre-check
  const alreadyUsed = await isHashUsed(cleanHash);
  if (alreadyUsed) {
    return {
      ok: false,
      fraudReason: 'duplicate_hash',
      error: isRu
        ? 'Этот хэш транзакции уже был использован для активации тарифа!'
        : 'This transaction hash has already been used to activate a plan! (Double-spend attempt rejected).',
      logs: [
        `> [REJECTED] Transaction hash ${cleanHash.slice(0, 12)}... already recorded in database!`,
        `> [SECURITY] Double activation attempts are strictly prohibited.`,
      ],
    };
  }

  // 2. Minimum Required USD from Pricing Settings
  const pricing = await getPricingSettings();
  const baseUsd =
    targetCycle === 'monthly'
      ? Number((pricing.plans as any)[targetPlan]?.monthly || (targetPlan === 'enterprise' ? 199 : 79))
      : Number((pricing.plans as any)[targetPlan]?.weekly || (targetPlan === 'enterprise' ? 69 : 25));

  let minUsd = baseUsd;
  if (pricing.discount?.enabled) {
    const discountPct = Number(pricing.discount.percent) || 0;
    minUsd = Math.round(baseUsd * (1 - discountPct / 100));
  }
  const minRequiredWithBuffer = minUsd * 0.88; // 12% tolerance for live price shifts / fees

  // 3. Expected Admin Destination Address
  const savedAddrs = await getAddresses();
  const expectedAddr = (savedAddrs[network] || '').trim();
  if (!expectedAddr) {
    return {
      ok: false,
      error: 'Deposit wallet is not configured for this network.',
      logs: [`> [ERROR] Deposit address missing for ${network}`],
    };
  }

  logs.push(`> Connecting to ${network} mainnet RPC cluster...`);
  logs.push(`> Auditing transaction hash: ${cleanHash.slice(0, 12)}...`);
  logs.push(`> Expected recipient address: ${expectedAddr}`);
  logs.push(`> Required plan volume: >= $${minUsd} USD`);

  const prices = await getLiveCryptoPrices();
  let result:
    | { ok: true; deliveredUsd: number; symbol: string }
    | { ok: false; error: string; fraudReason?: string };

  if (network === 'TRON') {
    const rawTronHash = cleanHash.replace(/^0x/i, '');
    if (!/^[0-9a-fA-F]{64}$/.test(rawTronHash)) {
      return {
        ok: false,
        error: isRu
          ? 'Неверный формат TxID! Хэш транзакции TRON должен состоять ровно из 64 hex-символов.'
          : 'Invalid TxID format! TRON transaction hash must be exactly 64 hexadecimal characters.',
        logs: [...logs, `> [FAILED] Regex format mismatch: Expected 64-hex Tron TxID`],
      };
    }
    result = await verifyTronTransaction(rawTronHash, expectedAddr, minRequiredWithBuffer, minUsd, prices, isRu, logs);
  } else if (network === 'ETHEREUM') {
    const rawEthHash = cleanHash.startsWith('0x') ? cleanHash : `0x${cleanHash}`;
    if (!/^0x[0-9a-fA-F]{64}$/.test(rawEthHash)) {
      return {
        ok: false,
        error: isRu
          ? 'Неверный формат TxID для Ethereum! Должен начинаться с 0x и содержать 66 символов.'
          : 'Invalid Ethereum TxID format! Must start with 0x and be 66 characters long.',
        logs: [...logs, `> [FAILED] Invalid 0x-hex format for Ethereum`],
      };
    }
    result = await verifyEthereumTransaction(rawEthHash, expectedAddr, minRequiredWithBuffer, minUsd, prices, isRu, logs);
  } else if (network === 'SOLANA') {
    if (!/^[1-9A-HJ-NP-Za-km-z]{64,95}$/.test(cleanHash)) {
      return {
        ok: false,
        error: isRu ? 'Неверный формат подписи Solana!' : 'Invalid Solana signature format!',
        logs: [...logs, `> [FAILED] Base58 signature format invalid`],
      };
    }
    result = await verifySolanaTransaction(cleanHash, expectedAddr, minRequiredWithBuffer, minUsd, prices, isRu, logs);
  } else {
    return {
      ok: false,
      error: 'Unsupported network',
      logs: ['> [ERROR] Unsupported network'],
    };
  }

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fraudReason: result.fraudReason,
      logs,
    };
  }

  // 4. Atomic claim in used_hashes ONLY AFTER strict on-chain audit passes
  const marked = await markHashUsed(cleanHash, {
    plan: targetPlan,
    cycle: targetCycle,
    network,
    amountUsd: Number(result.deliveredUsd.toFixed(2)),
  });

  if (!marked) {
    return {
      ok: false,
      fraudReason: 'race_duplicate_hash',
      error: isRu
        ? 'Этот хэш транзакции уже был использован!'
        : 'This transaction hash has already been claimed! (Double-spend attempt rejected).',
      logs: [...logs, `> [DUPLICATE] Transaction hash ${cleanHash.slice(0, 12)}... already claimed`],
    };
  }

  logs.push(
    `> [SUCCESS] Verified $${result.deliveredUsd.toFixed(2)} USD (${result.symbol}) to ${expectedAddr.slice(0, 10)}...!`
  );

  return {
    ok: true,
    network,
    plan: targetPlan,
    cycle: targetCycle,
    amountUsd: minUsd,
    deliveredUsd: Number(result.deliveredUsd.toFixed(2)),
    symbol: result.symbol,
    hash: cleanHash,
    logs,
  };
}
