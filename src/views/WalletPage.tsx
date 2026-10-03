import React, { useState } from 'react';
import type { ExtractedWallet, DispatchedTransaction, DemoWallet, DemoTransaction, PricingSettings } from '../types';
import { TransferModal } from '../components/TransferModal';
import { useLivePrices } from '../hooks/useLivePrices';
import { useLanguage } from '../i18n/LanguageContext';
import { Wallet, Send, Copy, Check, ArrowUpRight, ShieldAlert, Sparkles } from 'lucide-react';

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
    navigator.clipboard?.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="w-full px-4 pb-24 animate-fadeIn">
      {/* Header (Without any reset button) */}
      <div className="flex items-center justify-between mb-3 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#00E676]/15 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.25)]">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-wider text-white">
              {t('vaultAssets')}
            </h2>
            <span className="text-[10px] font-mono text-[#00E676] tracking-wider uppercase font-semibold">
              {t('extractedHoldings')}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-[#38E8FF]">
          {activeWallets.length} {t('statusAvailable')}
        </div>
      </div>

      {/* Live Market Price Ticker */}
      <div className="mb-3.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-1.5 text-[#38E8FF]">
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-[#00E676] animate-pulse' : 'bg-[#9CA3AF]'}`} />
          <span className="font-bold">{t('liveRates')}</span>
        </div>
        <div className="flex items-center gap-2 text-[#CBD5E1]">
          <span>ETH: ${livePrices.ETH.toLocaleString('en-US', { maximumFractionDigits: 1 })}</span>
          <span className="text-white/20">•</span>
          <span>SOL: ${livePrices.SOL.toLocaleString('en-US', { maximumFractionDigits: 1 })}</span>
          <span className="text-white/20">•</span>
          <span>TRX: ${livePrices.TRX.toFixed(3)}</span>
        </div>
      </div>

      {/* 1. Total Balance Hero Card */}
      <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-b from-[#22D3EE]/50 via-white/10 to-black/80 shadow-[0_20px_45px_-10px_rgba(34,211,238,0.2)] mb-4">
        <div className="glass-card-elevated rounded-3xl p-5 bg-gradient-to-br from-[#1A2233] via-[#141824] to-[#0F111A] relative overflow-hidden">
          {/* Top highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#38E8FF]/80 to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#22D3EE]/10 blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] font-bold tracking-widest text-[#9CA3AF] uppercase">
              {t('totalBalance')}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#00E676]/10 border border-[#00E676]/30 text-[9.5px] font-mono font-bold text-[#00E676]">
              {t('confirmed')}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
              ${totalBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h1>
            <span className="text-xs font-mono text-[#38E8FF]">{t('usdLiveValue')}</span>
          </div>

          {/* Quick Action Button */}
          {activeWallets.length > 0 ? (
            <button
              onClick={() => setSelectedWalletForTransfer(activeWallets[0])}
              type="button"
              className="w-full py-3 rounded-2xl button-dark-metal flex items-center justify-center gap-2 text-xs font-bold tracking-wider text-white hover:text-[#38E8FF] uppercase select-none cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>{t('dispatchAssets')}</span>
            </button>
          ) : (
            <button
              onClick={onNavigateToScan}
              type="button"
              className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-xs font-bold tracking-wider text-[#38E8FF] hover:bg-white/10 uppercase select-none cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#38E8FF]" />
              <span>{t('startScanToFind')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Individual Extracted Asset Cards */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h3 className="text-xs font-bold tracking-wider text-[#9CA3AF] uppercase">
          {t('assetHoldings')} ({wallets.length})
        </h3>
      </div>

      <div className="space-y-3 mb-6">
        {wallets.length === 0 ? (
          <div className="glass-panel-3d rounded-2xl p-6 text-center border-dashed border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#22D3EE]/10 border border-[#22D3EE]/20 flex items-center justify-center mx-auto text-[#22D3EE]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#CBD5E1] leading-relaxed max-w-xs mx-auto">
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
                className={`glass-card-elevated rounded-2xl p-4 relative overflow-hidden group transition-all duration-300 border-white/10 ${
                  isDispatched ? 'opacity-70 bg-black/30' : 'hover:border-[#22D3EE]/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isDispatched ? 'bg-[#9CA3AF]' : 'bg-[#22D3EE] shadow-[0_0_8px_#22D3EE]'
                      }`}
                    />
                    <span className="text-sm font-bold text-white">
                      {wallet.networkName}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        isDispatched
                          ? 'bg-red-500/10 text-[#FF5252] border border-red-500/20'
                          : 'bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20'
                      }`}
                    >
                      {isDispatched ? t('statusWithdrawn') : t('statusAvailable')}
                    </span>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-sm font-mono font-bold ${
                        isDispatched ? 'text-[#9CA3AF] line-through' : 'text-[#00E676]'
                      }`}
                    >
                      {wallet.balance} {wallet.symbol}
                    </div>
                    <div className="text-[10px] font-mono text-[#9CA3AF]">
                      ~${liveUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Address bar with copy button */}
                <div className="flex items-center justify-between bg-black/40 rounded-xl px-3 py-2 border border-white/5 mt-3">
                  <span className="text-[11px] font-mono text-[#CBD5E1] truncate mr-2">
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
                  <div className="mt-3 pt-2 border-t border-white/5 flex justify-end">
                    <button
                      onClick={() => setSelectedWalletForTransfer(wallet)}
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-[#22D3EE]/10 hover:bg-[#22D3EE]/20 border border-[#22D3EE]/30 text-xs font-mono font-bold text-[#38E8FF] flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Send className="w-3 h-3 text-[#22D3EE]" />
                      <span>{t('dispatchAssets')}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Transaction History */}
      <h3 className="text-xs font-bold tracking-wider text-[#9CA3AF] uppercase mb-2.5 px-1">
        {t('recentActivity')}
      </h3>

      <div className="space-y-2.5">
        {transactions.length === 0 ? (
          <div className="glass-panel-3d rounded-2xl p-4 text-center text-xs text-[#9CA3AF] border-white/5">
            {t('noTransactionsYet')}
          </div>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="glass-panel-3d rounded-2xl p-3.5 border-white/5 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#22D3EE]">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">
                    Transfer to {tx.to}
                  </div>
                  <div className="text-[10px] font-mono text-[#9CA3AF]">
                    {tx.timestamp} • {tx.fee} fee
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono font-bold text-white">
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
