export type Network = 'TRON' | 'ETHEREUM' | 'SOLANA';

export type TabType = 'scan' | 'activity' | 'wallet' | 'referral';

export type ScanState =
  | 'IDLE'
  | 'CONNECTING'
  | 'INITIALIZING'
  | 'GENERATING'
  | 'SCANNING'
  | 'MATCHED'
  | 'MATCH_FOUND'
  | 'TRANSFERRING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface TerminalLog {
  id: string;
  text: string;
  prefix?: string;
  statusText?: string;
  statusType?: 'default' | 'match' | 'system' | 'success' | 'warning' | 'nokey' | 'empty' | 'failed' | string;
  timestamp: string;
}

export interface ExtractedWallet {
  id: string;
  network: Network;
  networkName?: string;
  address: string;
  privateKey: string;
  demoPrivateKey?: string;
  maskedPrivateKey?: string;
  balance: string;
  balanceUsd: number;
  symbol: string;
  foundAt: string;
  status: 'FOUND' | 'UNLOCKED' | 'DISPATCHED' | 'ACTIVE';
}

export type DemoWallet = ExtractedWallet;

export interface ExtractionScan {
  id: string;
  scanNumber?: string | number;
  timestamp?: string;
  startedAt?: string;
  completedAt?: string;
  networks: Network[];
  addressesScanned?: number;
  recordsScanned: number;
  keysDerived?: number;
  matchesFound?: number;
  matches: number;
  durationSeconds?: number;
  totalValueUsd?: number;
  status?: 'COMPLETED' | 'ABORTED' | string;
}

export type DemoScan = ExtractionScan;

export interface DispatchedTransaction {
  id: string;
  hash: string;
  network: Network;
  from: string;
  to: string;
  amount: string;
  amountUsd?: number;
  symbol: string;
  timestamp: string;
  status: 'PENDING' | 'CONFIRMED' | 'CONFIRMED (12 BLOCKS)' | string;
  fee: string;
}

export type DemoTransaction = DispatchedTransaction;

export interface AdminDepositAddresses {
  TRON: string;
  ETHEREUM: string;
  SOLANA: string;
}

export interface AdminUser {
  id: string;
  tgId: string;
  name: string;
  username: string;
  plan: 'community' | 'pro' | 'enterprise';
  extractsCount: number;
  totalExtractedUsd: number;
  status: 'ACTIVE' | 'LIMITED' | 'RESTRICTED' | 'BLOCKED';
  joinedAt: string;
  lastActive?: string;
  blockedAt?: string;
}

export interface ExtractionRecord {
  id: string;
  tgId: string;
  userName: string;
  network: Network;
  walletAddress: string;
  balanceCrypto: number;
  balanceUsd: number;
  symbol: string;
  timestamp: string;
  status: 'COMPLETED' | 'UNLOCKED';
}

export interface PlanPriceConfig {
  weekly: number;
  monthly: number;
}

export interface PromoBannerConfig {
  enabled: boolean;
  textEn: string;
  textRu: string;
  badgeText: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  badgeBgColor: string;
  badgeTextColor: string;
}

export interface PricingSettings {
  plans: {
    pro: PlanPriceConfig;
    enterprise: PlanPriceConfig;
  };
  discount: {
    enabled: boolean;
    percent: number;
  };
  banner: PromoBannerConfig;
}

export type WithdrawalNetwork = 'TRON' | 'SOLANA' | 'ETHEREUM';

export interface ReferralRecord {
  id: string;
  referrerTgId: string;
  referredTgId: string;
  referredName: string;
  referredUsername: string;
  joinedAt: string;
  plan: 'community' | 'pro' | 'enterprise';
  earnedUsd: number;
}

export interface WithdrawalRequest {
  id: string;
  tgId: string;
  userName: string;
  userUsername: string;
  amountUsd: number;
  network: WithdrawalNetwork;
  walletAddress: string;
  requestedAt: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  txHash?: string;
  note?: string;
}

export interface ReferralStats {
  referralLink: string;
  totalReferrals: number;
  activePlansCount: number;
  availableBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingWithdrawal: number;
  referralsList: ReferralRecord[];
  withdrawalsList: WithdrawalRequest[];
}
