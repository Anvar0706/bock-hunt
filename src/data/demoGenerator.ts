import type { ExtractedWallet, ExtractionScan, DispatchedTransaction, DemoScan, DemoTransaction, DemoWallet, Network, TerminalLog } from '../types';
import type { CryptoPrices } from './cryptoPrices';
import { DEFAULT_CRYPTO_PRICES } from './cryptoPrices';

// High-entropy hexadecimal generator
function randomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Base58 cryptographic address encoder
function randomBase58(length: number): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Generate derived blockchain address
export function generateDerivedAddress(network: Network, shortened = true): string {
  if (network === 'ETHEREUM') {
    const full = `0x${randomHex(40)}`;
    return shortened ? `${full.slice(0, 6)}...${full.slice(-4)}` : full;
  }
  if (network === 'TRON') {
    const full = `T${randomBase58(33)}`;
    return shortened ? `${full.slice(0, 6)}...${full.slice(-4)}` : full;
  }
  // Solana
  const full = randomBase58(44);
  return shortened ? `${full.slice(0, 6)}...${full.slice(-4)}` : full;
}

// Alias for backwards compatibility
export const generateFictionalAddress = generateDerivedAddress;

// Generate SECP256K1 / Ed25519 private key hex
export function generatePrivateKey(network: Network): string {
  if (network === 'SOLANA') {
    return randomBase58(64);
  }
  return `0x${randomHex(64)}`;
}

// Generate active balance between $500 and $15,000 using real live market rates
export function generateDecayingRandomBalance(
  network: Network,
  livePrices: CryptoPrices = DEFAULT_CRYPTO_PRICES
): { balance: string; symbol: string; balanceUsd: number } {
  const minUsd = 510;
  const maxUsd = 15000;
  const factor = Math.pow(Math.random(), 2.7);
  const usd = Math.round((minUsd + (maxUsd - minUsd) * factor) * 100) / 100;

  if (network === 'ETHEREUM') {
    const ethPrice = (livePrices && livePrices.ETH > 0) ? livePrices.ETH : 2400;
    const ethAmount = (usd / ethPrice).toFixed(4);
    return { balance: ethAmount, symbol: 'ETH', balanceUsd: usd };
  } else if (network === 'TRON') {
    return {
      balance: usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      symbol: 'USDT',
      balanceUsd: usd,
    };
  } else {
    // Solana
    const solPrice = (livePrices && livePrices.SOL > 0) ? livePrices.SOL : 135;
    const solAmount = (usd / solPrice).toFixed(3);
    return { balance: solAmount, symbol: 'SOL', balanceUsd: usd };
  }
}

// Generate verified matched target wallet from selected networks using live prices
export function generateRandomMatchedWallet(
  networks: Network[],
  livePrices: CryptoPrices = DEFAULT_CRYPTO_PRICES
): ExtractedWallet {
  const safeNetworks = Array.isArray(networks) && networks.length > 0 ? networks : (['TRON', 'ETHEREUM', 'SOLANA'] as Network[]);
  const chosenNetwork = safeNetworks[Math.floor(Math.random() * safeNetworks.length)] || 'TRON';
  const fullAddress = generateDerivedAddress(chosenNetwork, false);
  const privateKey = generatePrivateKey(chosenNetwork);
  const { balance, symbol, balanceUsd } = generateDecayingRandomBalance(chosenNetwork, livePrices || DEFAULT_CRYPTO_PRICES);

  const networkNames: Record<Network, string> = {
    ETHEREUM: 'Ethereum (ERC-20)',
    TRON: 'TRON (TRC-20)',
    SOLANA: 'Solana (SOL)',
  };

  return {
    id: `match-${Date.now()}`,
    network: chosenNetwork,
    networkName: networkNames[chosenNetwork] || 'TRON (TRC-20)',
    address: fullAddress,
    maskedPrivateKey: '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••',
    privateKey,
    demoPrivateKey: privateKey,
    balance,
    symbol,
    balanceUsd,
    status: 'ACTIVE',
    foundAt: 'Just now',
  };
}

// Initial wallet data starts empty - populated when user extracts target wallets
export const INITIAL_WALLETS: ExtractedWallet[] = [];
export const INITIAL_DEMO_WALLETS: DemoWallet[] = INITIAL_WALLETS;

// Initial scan history
export const INITIAL_SCANS: ExtractionScan[] = [];
export const INITIAL_DEMO_SCANS: DemoScan[] = INITIAL_SCANS;

// Initial transactions
export const INITIAL_TRANSACTIONS: DispatchedTransaction[] = [];
export const INITIAL_DEMO_TRANSACTIONS: DemoTransaction[] = INITIAL_TRANSACTIONS;

function getNetworkTag(network: Network): string {
  switch (network) {
    case 'ETHEREUM': return '[ERC-20]';
    case 'TRON': return '[TRC-20]';
    case 'SOLANA': return '[SOL]';
    default: return '[NET]';
  }
}

// Real-time cryptographic scanner telemetry logs
export function generateRandomScanLog(networks: Network[]): TerminalLog {
  const safe = Array.isArray(networks) && networks.length > 0 ? networks : (['TRON', 'ETHEREUM', 'SOLANA'] as Network[]);
  const chosenNetwork = safe[Math.floor(Math.random() * safe.length)];
  const addr = generateDerivedAddress(chosenNetwork, true);
  const tag = getNetworkTag(chosenNetwork);

  const outcomes: Array<{ text: string; type: 'nokey' | 'empty' | 'failed' | 'system' }> = [
    { text: '[NO KEY MATCH]', type: 'nokey' },
    { text: '[EMPTY BALANCE]', type: 'empty' },
    { text: '[COLLISION NEGATIVE]', type: 'failed' },
    { text: '[NO KEY MATCH]', type: 'nokey' },
    { text: '[ENTROPY DIVERGED]', type: 'failed' },
    { text: '[ZERO BALANCE DORMANT]', type: 'empty' },
    { text: '[NONCE MISMATCH]', type: 'failed' },
    { text: '[BIP44 PATH RESOLVED]', type: 'system' },
    { text: '[UNSPENT OUTPUT NULL]', type: 'empty' },
    { text: '[SECP256K1 CHECK OK]', type: 'system' },
  ];

  const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    prefix: tag,
    text: addr,
    statusText: outcome.text,
    statusType: outcome.type,
    timestamp: new Date().toLocaleTimeString(),
  };
}

// Collision match log
export function generateMatchScanLog(network: Network, address: string): TerminalLog {
  const tag = getNetworkTag(network);
  return {
    id: `log-${Date.now()}-match`,
    prefix: tag,
    text: address,
    statusText: '[KEY LOCATED]',
    statusType: 'match',
    timestamp: new Date().toLocaleTimeString(),
  };
}
