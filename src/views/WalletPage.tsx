import React, { useState } from 'react';
import type { ExtractedWallet, DispatchedTransaction, DemoWallet, DemoTransaction, PricingSettings } from '../types';
import { TransferModal } from '../components/TransferModal';
import { useLivePrices } from '../hooks/useLivePrices';
import { useLanguage } from '../i18n/LanguageContext';
import { Wallet, Send, Copy, Check, ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';

interface WalletPageProps {
  wallets: ExtractedWallet[] | DemoWallet[];
  transactions: DispatchedTransaction[] | DemoTransaction[];
  onRecordTransaction: (tx: DispatchedTransaction) => void;
  activePlan?: string;
  onOpenLicensing?: () => void;
  onNavigateToScan?: () => void;
  pricingSettings?: PricingSettings;
}

export const WalletPage: React.FC<WalletPageProps> = ({
  wallets,
  transactions,
  onRecordTransaction,
  activePlan = 'community',
  onOpenLicensing,
  onNavigateToScan,
  pricingSettings,
}) => {
  const [selectedWalletForTransfer, setSelectedWalletForTransfer] = useState<ExtractedWallet | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { t } = useLanguage();

  // Live Crypto Prices
  const { prices: livePrices, isLive } = useLivePrices();

  // Dynamic valuation using live price sources
  const calculateLiveUsd = (wallet: ExtractedWallet): number => {
    const rawNumber = parseFloat(wallet.balance.replace(/,/g, ''));
    if (isNaN(rawNumber) || rawNumber <= 0) return 0;
    if (wallet.symbol === 'ETH') return rawNumber * livePrices.ETH;
    if (wallet.symbol === 'SOL') return rawNumber * livePrices.SOL;
    if (wallet.symbol === 'TRX') return rawNumber * livePrices.TRX;
    return rawNumber * 1.0; // USDT
  };

  // Only active (non-dispatched) wallets count toward total available balance
  const activeWallets = wallets.filter(
    (w) => w.status !== 'DISPATCHED' && parseFloat(w.balance.replace(/,/g, '')) > 0
  );
  const totalBalanceUsd = activeWallets.reduce((acc, w) => acc + calculateLiveUsd(w), 0);

  const handleCopyAddress = (id: string, address: string) => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    } catch {}
    navigator.clipboard?.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="w-full px-4 pb-32 animate-fadeIn select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#00E676]/15 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] shadow-[0_2px_8px_rgba(0,230,118,0.2)]">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-wider text-white uppercase font-mono-terminal">
              {t('vaultAssets') || 'VAULT RESERVES'}
            </h2>
            <span className="text-[10px] font-mono-terminal text-[#00E676] tracking-wider uppercase font-semibold">
              {t('extractedHoldings')}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono text-[#CBD5E1]">
          {activeWallets.length} {t('statusAvailable')}
        </div>
      </div>

      {/* Live Market Price Ticker */}
      <div className="mb-3.5 px-3 py-1.5 rounded-xl bg-[#0E121B] border border-white/[0.06] flex items-center justify-between text-[10px] font-mono-terminal">
        <div className="flex items-center gap-1.5 text-[#38E8FF]">
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-[#00E676]' : 'bg-[#64748B]'}`} />
          <span className="font-semibold">{t('liveRates')}</span>
        </div>
        <div className="flex items-center gap-2 text-[#94A3B8]">
          <span>ETH: ${livePrices.ETH.toLocaleString('en-US', { maximumFractionDigits: 1 })}</span>
          <span className="text-white/20">•</span>
          <span>SOL: ${livePrices.SOL.toLocaleString('en-US', { maximumFractionDigits: 1 })}</span>
          <span className="text-white/20">•</span>
          <span>TRX: ${livePrices.TRX.toFixed(3)}</span>
        </div>
      </div>

      {/* 1. Total Balance Hero Card - Institutional Obsidian */}
      <div className="rounded-2xl border border-white/10 bg-[#12151F] shadow-[0_12px_32px_rgba(0,0,0,0.85)] p-5 mb-4 relative overflow-hidden">
        {/* Top Hairline Accent */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold tracking-widest text-[#94A3B8] uppercase">
            {t('totalBalance')}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#00E676]/10 border border-[#00E676]/30 text-[9.5px] font-mono font-bold text-[#00E676]">
            {t('confirmed')}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono-terminal">
            ${totalBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
          <span className="text-xs font-mono text-[#64748B]">{t('usdLiveValue')}</span>
        </div>

        {/* Quick Action Button */}
        {activeWallets.length > 0 ? (
          <button
            onClick={() => setSelectedWalletForTransfer(activeWallets[0])}
            type="button"
            className="w-full py-3 rounded-xl button-dark-metal flex items-center justify-center gap-2 text-xs font-bold tracking-wider text-white hover:text-[#38E8FF] uppercase cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>{t('withdrawAssets')}</span>
          </button>
        ) : (
          <button
            onClick={onNavigateToScan}
            type="button"
            className="w-full py-3 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] flex items-center justify-center gap-2 text-xs font-bold tracking-wider text-[#38E8FF] uppercase cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#38E8FF]" />
            <span>{t('startScanToFind')}</span>
          </button>
        )}
      </div>

      {/* 2. Individual Extracted Asset Cards */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h3 className="text-xs font-bold tracking-wider text-[#94A3B8] uppercase">
          {t('assetHoldings')} ({wallets.length})
        </h3>
      </div>

      <div className="space-y-2.5 mb-6">
        {wallets.length === 0 ? (
          <div className="rounded-2xl p-6 text-center border border-dashed border-white/10 bg-[#0E121B] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-[#94A3B8]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8] leading-relaxed max-w-xs mx-auto">
                {t('noHoldingsYet')}
              </p>
            </div>
            {onNavigateToScan && (
              <button
                onClick={onNavigateToScan}
                type="button"
                className="px-4 py-2 rounded-xl button-dark-metal text-xs font-bold text-white uppercase tracking-wider cursor-pointer"
              >
                {t('startScanToFind')}
              </button>
            )}
          </div>
        ) : (
          wallets.map((wallet) => {
            const isDispatched = wallet.status === 'DISPATCHED' || parseFloat(wallet.balance.replace(/,/g, '')) === 0;
            const liveUsd = isDispatched ? 0 : calculateLiveUsd(wallet);

            return (
              <div
                key={wallet.id}
                className={`rounded-2xl p-4 relative overflow-hidden transition-all duration-150 border bg-[#12151F] ${
                  isDispatched ? 'opacity-65 border-white/[0.04]' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isDispatched ? 'bg-[#64748B]' : 'bg-[#00E676]'
                      }`}
                    />
                    <span className="text-sm font-bold text-white">
                      {wallet.networkName}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        isDispatched
                          ? 'bg-white/5 text-[#94A3B8] border border-white/10'
                          : 'bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30'
                      }`}
                    >
                      {isDispatched ? t('statusWithdrawn') : t('statusAvailable')}
                    </span>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-sm font-mono-terminal font-bold ${
                        isDispatched ? 'text-[#64748B] line-through' : 'text-[#00E676]'
                      }`}
                    >
                      {wallet.balance} {wallet.symbol}
                    </div>
                    <div className="text-[10px] font-mono-terminal text-[#64748B]">
                      ~${liveUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Address Inset Bar */}
                <div className="flex items-center justify-between bg-[#0B0D14] rounded-xl px-3 py-2 border border-white/[0.04] mt-2.5">
                  <span className="text-[11px] font-mono-terminal text-[#CBD5E1] truncate mr-2 select-all">
                    {wallet.address}
                  </span>
                  <button
                    onClick={() => handleCopyAddress(wallet.id, wallet.address)}
                    type="button"
                    className="flex items-center gap-1 text-[10px] font-mono text-[#38E8FF] hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedId === wallet.id ? (
                      <>
                        <Check className="w-3 h-3 text-[#00E676]" />
                        <span className="text-[#00E676]">{t('copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{t('copy')}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Action button if wallet is available */}
                {!isDispatched && (
                  <div className="mt-3 pt-2 border-t border-white/[0.04] flex justify-end">
                    <button
                      onClick={() => setSelectedWalletForTransfer(wallet)}
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Send className="w-3 h-3 text-[#22D3EE]" />
                      <span>{t('withdraw')}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Transaction History */}
      <h3 className="text-xs font-bold tracking-wider text-[#94A3B8] uppercase mb-2.5 px-1">
        {t('recentActivity')}
      </h3>

      <div className="space-y-2">
        {transactions.length === 0 ? (
          <div className="rounded-2xl p-4 text-center text-xs text-[#64748B] border border-white/[0.04] bg-[#0E121B]">
            {t('noTransactionsYet')}
          </div>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="rounded-2xl p-3 border border-white/[0.06] bg-[#12151F] flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#22D3EE]">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">
                    {t('transferTo')} {tx.to}
                  </div>
                  <div className="text-[10px] font-mono-terminal text-[#64748B]">
                    {tx.timestamp} • {tx.fee} {t('feeLabel')}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono-terminal font-bold text-white">
                  -{tx.amount} {tx.symbol}
                </div>
                <span className="text-[9px] font-mono text-[#00E676] bg-[#00E676]/10 px-1.5 py-0.2 rounded font-semibold">
                  {t('confirmed')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Transfer Modal */}
      {selectedWalletForTransfer && (
        <TransferModal
          wallet={selectedWalletForTransfer}
          isOpen={Boolean(selectedWalletForTransfer)}
          onClose={() => setSelectedWalletForTransfer(null)}
          onRecordTransaction={onRecordTransaction}
          activePlan={activePlan}
          onOpenLicensing={onOpenLicensing}
          pricingSettings={pricingSettings}
        />
      )}
    </div>
  );
};
