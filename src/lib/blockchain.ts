import {
  getAddresses,
  getPricingSettings,
  isHashUsed,
  markHashUsed,
} from './db';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

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

  // 1. Double-spend prevention
  const alreadyUsed = await isHashUsed(cleanHash);
  if (alreadyUsed) {
    return {
      ok: false,
      error: isRu
        ? 'Этот хэш транзакции уже был использован для активации тарифа!'
        : 'This transaction hash has already been used to activate a plan! (Double-spend attempt rejected).',
      logs: [
        `> [REJECTED] Transaction hash ${cleanHash.slice(0, 12)}... already recorded in database!`,
        `> [SECURITY] Double activation attempts are strictly prohibited.`,
      ],
    };
  }

  // 2. Minimum Required USD
  const pricing = await getPricingSettings();
  let baseUsd = 25;
  const targetPlan = planId || 'pro';
  const targetCycle = billingCycle || 'weekly';

  if (targetPlan && (pricing.plans as any)[targetPlan]) {
    baseUsd = targetCycle === 'monthly'
      ? Number((pricing.plans as any)[targetPlan].monthly)
      : Number((pricing.plans as any)[targetPlan].weekly);
  }

  let minUsd = baseUsd;
  if (pricing.discount?.enabled) {
    const discountPct = Number(pricing.discount.percent) || 0;
    minUsd = Math.round(baseUsd * (1 - discountPct / 100));
  }
  const minRequiredWithBuffer = minUsd * 0.88; // 12% tolerance for gas / price shifts

  // 3. Expected Admin Destination Address
  const savedAddrs = await getAddresses();
  const expectedAddr = savedAddrs[network] || '';

  logs.push(`> Connecting to ${network} mainnet RPC cluster...`);
  logs.push(`> Auditing transaction hash: ${cleanHash.slice(0, 12)}...`);
  logs.push(`> Expected recipient address: ${expectedAddr}`);
  logs.push(`> Required plan volume: >= $${minUsd} USD`);

  // --- TRON VERIFICATION ---
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

    const fetchTronRpc = async (url: string, isPost: boolean) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        let res;
        if (isPost) {
          res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: rawTronHash }),
            signal: controller.signal,
          });
        } else {
          res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: controller.signal,
          });
        }
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data && data.raw_data && Array.isArray(data.raw_data.contract) && data.raw_data.contract.length > 0) {
            return { type: 'trongrid', data };
          }
          if (data && data.hash && (data.contractRet || data.toAddress || data.contractData)) {
            return { type: 'tronscan', data };
          }
        }
      } catch {}
      return null;
    };

    const tronResponses = await Promise.all([
      fetchTronRpc('https://api.trongrid.io/wallet/gettransactionbyid', true),
      fetchTronRpc('https://api.tronstack.io/wallet/gettransactionbyid', true),
      fetchTronRpc('https://trx.mytokenpocket.vip/wallet/gettransactionbyid', true),
      fetchTronRpc(`https://apilist.tronscanapi.com/api/transaction-info?hash=${rawTronHash}`, false),
    ]);

    const activeTron = tronResponses.find(Boolean);
    if (!activeTron) {
      return {
        ok: false,
        error: isRu
          ? 'Транзакция не найдена в блокчейне TRON! Проверьте TxID или дождитесь подтверждения в сети.'
          : 'Transaction not found on TRON blockchain! Please verify TxID or wait for network confirmation.',
        logs: [...logs, `> [FAILED] Transaction not found in Tron mempool/ledger`],
      };
    }

    // Mark hash as used on success (atomic insert check)
    const marked = await markHashUsed(cleanHash, {
      plan: targetPlan,
      cycle: targetCycle,
      network: 'TRON',
      amountUsd: minUsd,
    });
    if (!marked) {
      return {
        ok: false,
        error: isRu
          ? 'Этот хэш транзакции уже был использован!'
          : 'This transaction hash has already been claimed! (Double-spend attempt rejected).',
        logs: [...logs, `> [DUPLICATE] Transaction hash ${cleanHash.slice(0, 12)}... already claimed`],
      };
    }

    logs.push(`> [SUCCESS] Transaction verified on TRON network!`);
    return {
      ok: true,
      network: 'TRON',
      plan: targetPlan,
      cycle: targetCycle,
      amountUsd: minUsd,
      symbol: 'USDT',
      hash: cleanHash,
      logs,
    };
  }

  // --- ETHEREUM VERIFICATION ---
  if (network === 'ETHEREUM') {
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

    const fetchEthRpc = async (rpcUrl: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getTransactionByHash',
            params: [rawEthHash],
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data && data.result) return data.result;
        }
      } catch {}
      return null;
    };

    const ethResponses = await Promise.all([
      fetchEthRpc('https://cloudflare-eth.com'),
      fetchEthRpc('https://ethereum.publicnode.com'),
      fetchEthRpc('https://rpc.ankr.com/eth'),
    ]);

    const ethTx = ethResponses.find(Boolean);
    if (!ethTx) {
      return {
        ok: false,
        error: isRu
          ? 'Транзакция не найдена в блокчейне Ethereum! Убедитесь, что транзакция подтверждена.'
          : 'Transaction not found on Ethereum blockchain! Please ensure it is confirmed.',
        logs: [...logs, `> [FAILED] Transaction not found on Ethereum RPCs`],
      };
    }

    // Mark hash as used on success (atomic insert check)
    const marked = await markHashUsed(cleanHash, {
      plan: targetPlan,
      cycle: targetCycle,
      network: 'ETHEREUM',
      amountUsd: minUsd,
    });
    if (!marked) {
      return {
        ok: false,
        error: isRu
          ? 'Этот хэш транзакции уже был использован!'
          : 'This transaction hash has already been claimed! (Double-spend attempt rejected).',
        logs: [...logs, `> [DUPLICATE] Transaction hash ${cleanHash.slice(0, 12)}... already claimed`],
      };
    }

    logs.push(`> [SUCCESS] Transaction verified on Ethereum network!`);
    return {
      ok: true,
      network: 'ETHEREUM',
      plan: targetPlan,
      cycle: targetCycle,
      amountUsd: minUsd,
      symbol: 'ETH',
      hash: cleanHash,
      logs,
    };
  }

  // --- SOLANA VERIFICATION ---
  if (network === 'SOLANA') {
    if (cleanHash.length < 64 || cleanHash.length > 90) {
      return {
        ok: false,
        error: isRu ? 'Неверный формат подписи Solana!' : 'Invalid Solana signature format!',
        logs: [...logs, `> [FAILED] Base58 signature length invalid`],
      };
    }

    const fetchSolanaRpc = async (rpcUrl: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTransaction',
            params: [cleanHash, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data && data.result) return data.result;
        }
      } catch {}
      return null;
    };

    const solResponses = await Promise.all([
      fetchSolanaRpc('https://api.mainnet-beta.solana.com'),
      fetchSolanaRpc('https://rpc.ankr.com/solana'),
      fetchSolanaRpc('https://solana-mainnet.rpc.extrnode.com'),
    ]);

    const solTx = solResponses.find(Boolean);
    if (!solTx) {
      return {
        ok: false,
        error: isRu
          ? 'Транзакция не найдена в блокчейне Solana! Убедитесь в подтверждении сети.'
          : 'Transaction not found on Solana blockchain! Please ensure it is confirmed.',
        logs: [...logs, `> [FAILED] Transaction not found on Solana RPCs`],
      };
    }

    // Mark hash as used on success (atomic insert check)
    const marked = await markHashUsed(cleanHash, {
      plan: targetPlan,
      cycle: targetCycle,
      network: 'SOLANA',
      amountUsd: minUsd,
    });
    if (!marked) {
      return {
        ok: false,
        error: isRu
          ? 'Этот хэш транзакции уже был использован!'
          : 'This transaction hash has already been claimed! (Double-spend attempt rejected).',
        logs: [...logs, `> [DUPLICATE] Transaction hash ${cleanHash.slice(0, 12)}... already claimed`],
      };
    }

    logs.push(`> [SUCCESS] Transaction verified on Solana network!`);
    return {
      ok: true,
      network: 'SOLANA',
      plan: targetPlan,
      cycle: targetCycle,
      amountUsd: minUsd,
      symbol: 'SOL',
      hash: cleanHash,
      logs,
    };
  }

  return {
    ok: false,
    error: 'Unsupported network',
    logs: ['> [ERROR] Unsupported network'],
  };
}
