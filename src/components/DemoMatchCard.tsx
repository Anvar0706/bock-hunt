import React, { useState } from 'react';
import type { ExtractedWallet, DemoWallet } from '../types';
import { Eye, EyeOff, ShieldCheck, CheckCircle2, Send } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export interface TargetMatchCardProps {
  wallet: ExtractedWallet | DemoWallet;
  onInitiateTransfer?: (wallet: ExtractedWallet) => void;
  onSimulateTransfer?: (wallet: ExtractedWallet) => void;
}

export type DemoMatchCardProps = TargetMatchCardProps;

export const TargetMatchCard: React.FC<TargetMatchCardProps> = React.memo(({
  wallet,
  onInitiateTransfer,
  onSimulateTransfer,
}) => {
  const [revealed, setRevealed] = useState(false);
  const { t } = useLanguage();
  const isDispatched = wallet.status === 'DISPATCHED' || parseFloat(String(wallet.balance || '0').replace(/,/g, '')) === 0;

  return (
    <div className="w-full px-4 mb-4 select-none animate-modal-3d">
      <div className="rounded-2xl border border-[#00E676]/40 bg-[#121622] shadow-[0_8px_24px_-4px_rgba(0,230,118,0.15)] relative overflow-hidden">
        {/* Top Hairline Indicator */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00E676] to-transparent pointer-events-none" />

        <div className="p-4 sm:p-5 relative">
          {/* Header Badge */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#00E676]/15 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] shadow-[0_2px_8px_rgba(0,230,118,0.2)]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold tracking-wider text-white uppercase font-mono-terminal">
                  {t('targetIdentified')}
                </h3>
                <span className="text-[10px] font-mono-terminal text-[#00E676] tracking-wider uppercase font-semibold">
                  {isDispatched ? t('balanceSwept') : t('collisionVerified')}
                </span>
              </div>
            </div>

            {/* Status Tag */}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold uppercase tracking-wider ${
                isDispatched
                  ? 'bg-white/5 text-[#94A3B8] border border-white/10'
                  : 'bg-[#00E676]/10 border border-[#00E676]/30 text-[#00E676]'
              }`}
            >
              {isDispatched ? t('dispatched') : t('verified')}
            </span>
          </div>

          {/* Details Inset Grid */}
          <div className="space-y-2.5 mb-4">
            {/* Network & Balance */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#0A0D15] rounded-xl p-3 border border-white/[0.06]">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                  {t('network')}
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#F8FAFC]">
                  {wallet.networkName}
                </span>
              </div>

              <div className="bg-[#0A0D15] rounded-xl p-3 border border-[#00E676]/25">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                  {t('availableBalance')}
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#00E676] font-mono-terminal">
                  {isDispatched ? '0.00' : wallet.balance} {wallet.symbol}
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="bg-[#0A0D15] rounded-xl p-3 border border-white/[0.06]">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                {t('targetAddress')}
              </span>
              <span className="text-xs font-mono-terminal text-[#CBD5E1] break-all select-all">
                {wallet.address}
              </span>
            </div>

            {/* Extracted Private Key */}
            <div className="bg-[#0A0D15] rounded-xl p-3 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    {t('extractedKey')}
                  </span>
                  <span className="text-[9px] font-mono text-[#38E8FF] px-1.5 py-0.2 bg-[#22D3EE]/10 rounded border border-[#22D3EE]/20 font-semibold">
                    {t('encrypted')}
                  </span>
                </div>

                <button
                  onClick={() => setRevealed(!revealed)}
                  type="button"
                  className="flex items-center gap-1 text-[11px] text-[#38E8FF] hover:text-white transition-colors cursor-pointer"
                >
                  {revealed ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>{t('hide')}</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t('reveal')}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="font-mono-terminal text-xs text-[#38E8FF] break-all select-all pt-1 font-semibold">
                {revealed ? (wallet.privateKey || wallet.demoPrivateKey) : wallet.maskedPrivateKey}
              </div>
            </div>
          </div>

          {/* Verification Status & Immediate Action CTA */}
          <div className="w-full">
            {isDispatched ? (
              <div className="w-full py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-xs font-bold tracking-wider text-[#94A3B8] uppercase select-none">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>{t('balanceDispatched')} (0.00 {wallet.symbol})</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="w-full py-2 px-3 rounded-xl bg-[#00E676]/10 border border-[#00E676]/30 flex items-center justify-between text-xs font-mono-terminal select-none">
                  <span className="flex items-center gap-2 text-[#00E676] font-bold">
                    <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
                    <span>{t('targetKeyVerified')}</span>
                  </span>
                  <span className="text-[9.5px] text-[#00E676] uppercase font-bold px-2 py-0.5 rounded bg-[#00E676]/15 border border-[#00E676]/20">
                    100% UNLOCKED
                  </span>
                </div>

                <button
                  onClick={() => onInitiateTransfer?.(wallet as ExtractedWallet)}
                  type="button"
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00C853] hover:to-[#00B048] text-black font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,230,118,0.25)] active:scale-98 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4 text-black" />
                  <span>{t('initiateTransfer') || 'INITIATE TRANSFER'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

TargetMatchCard.displayName = 'TargetMatchCard';

export const DemoMatchCard = TargetMatchCard;
