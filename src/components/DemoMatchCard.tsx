import React, { useState } from 'react';
import type { ExtractedWallet, DemoWallet } from '../types';
import { Eye, EyeOff, Send, Sparkles, CheckCircle2 } from 'lucide-react';
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

  const handleTransferClick = () => {
    if (onInitiateTransfer) {
      onInitiateTransfer(wallet);
    } else if (onSimulateTransfer) {
      onSimulateTransfer(wallet);
    }
  };

  return (
    <div className="w-full px-4 mb-4 animate-modal-3d">
      <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-b from-[#00E676]/60 via-[#22D3EE]/40 to-transparent shadow-[0_20px_50px_-10px_rgba(0,230,118,0.25),0_0_30px_rgba(34,211,238,0.2)]">
        {/* Glass Card Surface */}
        <div className="glass-card-elevated rounded-3xl p-5 relative overflow-hidden bg-gradient-to-b from-[#1E2C38] via-[#161D2A] to-[#121520]">
          {/* Ambient lighting reflections */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#00E676]/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#22D3EE]/15 blur-3xl pointer-events-none" />

          {/* Header Badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#00E676]/20 border border-[#00E676]/50 flex items-center justify-center text-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.4)]">
                {isDispatched ? <CheckCircle2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-wider text-white">
                  {t('targetIdentified')}
                </h3>
                <span className="text-[10px] font-mono text-[#00E676] tracking-wider uppercase font-semibold">
                  {isDispatched ? t('balanceSwept') : t('collisionVerified')}
                </span>
              </div>
            </div>

            {/* Status Tag */}
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDispatched
                  ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
                  : 'bg-[#00E676]/10 border border-[#00E676]/30 text-[#00E676]'
              }`}
            >
              {isDispatched ? t('dispatched') : t('verified')}
            </span>
          </div>

          {/* Details Grid */}
          <div className="space-y-3 mb-5">
            {/* Network & Balance */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">
                  {t('network')}
                </span>
                <span className="text-sm font-bold text-white">
                  {wallet.networkName}
                </span>
              </div>

              <div className="bg-black/30 rounded-xl p-3 border border-[#00E676]/20 shadow-[inset_0_0_12px_rgba(0,230,118,0.08)]">
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">
                  {t('availableBalance')}
                </span>
                <span className="text-sm font-bold text-[#00E676] font-mono">
                  {isDispatched ? '0.00' : wallet.balance} {wallet.symbol}
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">
                {t('targetAddress')}
              </span>
              <span className="text-xs font-mono text-[#CBD5E1] break-all select-all">
                {wallet.address}
              </span>
            </div>

            {/* Extracted Private Key */}
            <div className="bg-black/40 rounded-xl p-3 border border-[#22D3EE]/25 relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                    {t('extractedKey')}
                  </span>
                  <span className="text-[9px] font-mono text-[#38E8FF] px-1 py-0.2 bg-[#22D3EE]/10 rounded">
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

              <div className="font-mono text-xs text-[#38E8FF] break-all select-all pt-1">
                {revealed ? (wallet.privateKey || wallet.demoPrivateKey) : wallet.maskedPrivateKey}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full">
            {isDispatched ? (
              <button
                disabled
                type="button"
                className="w-full py-3.5 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-xs font-bold tracking-wider text-[#00E676] uppercase select-none cursor-not-allowed"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />
                <span>{t('balanceDispatched')} (0.00 {wallet.symbol})</span>
              </button>
            ) : (
              <button
                onClick={handleTransferClick}
                type="button"
                className="w-full py-3.5 px-4 rounded-xl button-dark-metal flex items-center justify-center gap-2 text-xs font-bold tracking-wider text-white hover:text-[#38E8FF] uppercase select-none cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>{t('initiateTransfer')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

TargetMatchCard.displayName = 'TargetMatchCard';

export const DemoMatchCard = TargetMatchCard;