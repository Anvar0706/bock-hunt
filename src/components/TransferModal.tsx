import React, { useState } from 'react';
import type { ExtractedWallet, DispatchedTransaction, DemoWallet, PricingSettings } from '../types';
import { X, Send, CheckCircle2, Copy, Check, AlertTriangle, Crown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { getEffectiveProPrice } from '../data/adminSettings';

interface TransferModalProps {
  wallet: ExtractedWallet | DemoWallet;
  isOpen: boolean;
  onClose: () => void;
  onRecordTransaction: (tx: DispatchedTransaction) => void;
  activePlan?: string;
  onOpenLicensing?: () => void;
  pricingSettings?: PricingSettings;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  wallet,
  isOpen,
  onClose,
  onRecordTransaction,
  activePlan = 'community',
  onOpenLicensing,
  pricingSettings,
}) => {
  const { t, language } = useLanguage();
  const proPrice = getEffectiveProPrice(pricingSettings, 'weekly');
  const [recipient, setRecipient] = useState(() =>
    wallet.network === 'ETHEREUM'
      ? '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      : wallet.network === 'TRON'
      ? 'TLsV52sRDL79HXGGm9yzwKibb6XuUadTnS'
      : '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
  );
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [completedTx, setCompletedTx] = useState<DispatchedTransaction | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const fee = wallet.network === 'ETHEREUM' ? '0.003 ETH' : wallet.network === 'TRON' ? '1.50 USDT' : '0.0005 SOL';
  const fullAmount = wallet.balance;
  const isZeroBalance = parseFloat(fullAmount.replace(/,/g, '')) === 0;

  // License Rule: If balance > $100 and user is on Community plan, withdrawal requires a license ($25)
  const isCommunityPlan = activePlan === 'community';
  const isAboveFreeLimit = wallet.balanceUsd > 100;
  const isBlockedByLicense = isCommunityPlan && isAboveFreeLimit;

  const handleExecuteDispatch = () => {
    if (isBlockedByLicense || isZeroBalance) return;
    setIsBroadcasting(true);

    setTimeout(() => {
      const hexPart = Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const newTx: DispatchedTransaction = {
        id: `tx-${Date.now()}`,
        from: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
        to: `${recipient.slice(0, 6)}...${recipient.slice(-4)}`,
        amount: `${fullAmount}`,
        symbol: wallet.symbol,
        network: wallet.network,
        fee,
        status: 'CONFIRMED (12 BLOCKS)',
        hash: `0x${hexPart}`,
        timestamp: 'Just now',
      };

      setCompletedTx(newTx);
      onRecordTransaction(newTx);
      setIsBroadcasting(false);
    }, 2200);
  };

  const handleCopyHash = () => {
    if (completedTx) {
      navigator.clipboard?.writeText(completedTx.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUpgradeClick = () => {
    onClose();
    if (onOpenLicensing) {
      onOpenLicensing();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      {/* 3D Glass Modal Container */}
      <div className="relative w-full max-w-md animate-modal-3d">
        <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-b from-[#38E8FF]/60 via-white/10 to-black/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(34,211,238,0.2)]">
          {/* Smoked Dark Glass Panel */}
          <div className="glass-panel-3d rounded-3xl p-5 relative overflow-hidden bg-[#161824]">
            {/* Top edge light */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#38E8FF]/80 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE]">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-wider text-white">
                    {t('assetDispatch')}
                  </h3>
                  <span className="text-[10px] font-mono text-[#22D3EE] tracking-wider uppercase font-semibold">
                    {t('oneClickSweep')}
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!completedTx ? (
              /* Transaction Form */
              <div className="space-y-3.5">
                {/* License Gate Warning if balance > $100 and Community plan */}
                {isBlockedByLicense && (
                  <div className="p-3.5 rounded-2xl bg-[#FFB300]/15 border border-[#FFB300]/40 text-[#FFD54F] space-y-1.5 animate-fadeIn">
                    <div className="flex items-center gap-2 font-bold text-xs text-[#FFC107]">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{t('licenseRequiredTitle')}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#CBD5E1]">
                      {language === 'ru'
                        ? `Бесплатный тариф Community позволяет выводить суммы только до $100.00 USD. На найденном кошельке находится крупная сумма. Для вывода требуется лицензия PRO ($${proPrice}/нед) или ENTERPRISE.`
                        : `Free Community tier only permits withdrawals under $100.00 USD. This wallet holds live value. A PRO License ($${proPrice}/wk) or ENTERPRISE License is required to dispatch high-capacity balances.`}
                    </p>
                  </div>
                )}

                {/* Source Wallet Address */}
                <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">
                    {t('sourceAddress')} ({wallet.networkName})
                  </span>
                  <span className="text-xs font-mono text-[#CBD5E1] break-all">
                    {wallet.address}
                  </span>
                </div>

                {/* Fixed Non-Editable Extracted Amount */}
                <div className="bg-black/40 rounded-xl p-3 border border-[#00E676]/30 shadow-[inset_0_0_15px_rgba(0,230,118,0.06)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block">
                      {t('transferAmount')} ({wallet.symbol})
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#00E676]/15 text-[#00E676] font-bold border border-[#00E676]/30">
                      {t('fullBalance100')}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base sm:text-lg font-mono font-extrabold text-[#00E676]">
                      {fullAmount} {wallet.symbol}
                    </span>
                    <span className="text-xs font-mono text-[#9CA3AF]">
                      ~${wallet.balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </span>
                  </div>
                  <span className="text-[9.5px] font-mono text-[#64748B] block mt-1">
                    {t('sweepNotice')}
                  </span>
                </div>

                {/* Destination Recipient Address */}
                <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                  <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">
                    {t('destinationAddress')} ({wallet.symbol})
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={`Enter your ${wallet.symbol} address`}
                    disabled={isBlockedByLicense || isZeroBalance}
                    className="w-full bg-transparent text-xs font-mono text-[#38E8FF] focus:outline-none border-b border-white/10 focus:border-[#22D3EE] py-1 disabled:opacity-50"
                  />
                </div>

                {/* Estimated Fee */}
                <div className="bg-black/40 rounded-xl p-2.5 border border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                    {t('networkGasFee')}
                  </span>
                  <span className="text-xs font-mono font-semibold text-[#CBD5E1]">
                    {fee}
                  </span>
                </div>

                {/* CTA Buttons */}
                {isBlockedByLicense ? (
                  <button
                    onClick={handleUpgradeClick}
                    type="button"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FFB300] to-[#FF8F00] text-black font-extrabold flex items-center justify-center gap-2 text-xs tracking-wider uppercase select-none cursor-pointer shadow-[0_0_20px_rgba(255,179,0,0.4)] active:scale-98 transition-all"
                  >
                    <Crown className="w-4 h-4 text-black" />
                    <span>
                      {language === 'ru'
                        ? `КУПИТЬ PRO ($${proPrice}) ДЛЯ ВЫВОДА`
                        : `UPGRADE TO PRO LICENSE ($${proPrice}) TO DISPATCH`}
                    </span>
                  </button>
                ) : isZeroBalance ? (
                  <button
                    disabled
                    type="button"
                    className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold tracking-widest text-[#9CA3AF] uppercase cursor-not-allowed"
                  >
                    {t('alreadyWithdrawn')} (0.00)
                  </button>
                ) : (
                  <button
                    onClick={handleExecuteDispatch}
                    disabled={isBroadcasting}
                    type="button"
                    className="w-full py-3.5 rounded-2xl button-dark-metal flex items-center justify-center gap-2 text-xs font-bold tracking-widest text-white hover:text-[#38E8FF] uppercase select-none cursor-pointer"
                  >
                    {isBroadcasting ? (
                      <span className="animate-pulse text-[#38E8FF]">
                        {t('broadcasting')}
                      </span>
                    ) : (
                      <span>{t('confirmDispatch')} ({fullAmount} {wallet.symbol})</span>
                    )}
                  </button>
                )}
              </div>
            ) : (
              /* Execution Complete State */
              <div className="text-center py-2 space-y-4 animate-modal-3d">
                <div className="w-12 h-12 rounded-2xl mx-auto bg-[#00E676]/15 border border-[#00E676]/40 flex items-center justify-center text-[#00E676] shadow-[0_0_20px_rgba(0,230,118,0.3)]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="text-base font-extrabold text-white">
                    {t('txBroadcasted')}
                  </h4>
                  <p className="text-xs font-mono text-[#00E676] font-semibold mt-0.5">
                    ALL {completedTx.amount} {completedTx.symbol} DISPATCHED // 100% SWEEP
                  </p>
                </div>

                {/* TX Hash box */}
                <div className="bg-black/50 rounded-xl p-3 border border-white/10 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                      {t('txHash')}
                    </span>
                    <button
                      onClick={handleCopyHash}
                      type="button"
                      className="flex items-center gap-1 text-[10px] text-[#38E8FF] hover:text-white cursor-pointer"
                    >
                      {copied ? (
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
                  <span className="text-xs font-mono text-[#38E8FF] break-all select-all">
                    {completedTx.hash}
                  </span>
                </div>

                {/* Status Box */}
                <div className="p-2.5 rounded-xl bg-[#22D3EE]/10 border border-[#22D3EE]/25 text-[10.5px] font-mono text-[#38E8FF] font-semibold">
                  STATUS: {completedTx.status}
                </div>

                <button
                  onClick={onClose}
                  type="button"
                  className="w-full py-3 rounded-2xl button-dark-metal text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
                >
                  {t('closeConsole')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};