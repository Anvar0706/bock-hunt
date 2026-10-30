import React from 'react';
import type { Network } from '../types';
import { Network3DButton } from './Network3DButton';
import { Layers, Crown, Zap, Lock, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface NetworkSelectorProps {
  selectedNetworks: Network[];
  onToggleNetwork: (network: Network) => void;
  disabled?: boolean;
  activePlan?: string;
  onOpenLicensing?: () => void;
  notice?: string | null;
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = React.memo(({
  selectedNetworks,
  onToggleNetwork,
  disabled = false,
  activePlan = 'community',
  onOpenLicensing,
  notice,
}) => {
  const { t } = useLanguage();
  const networks: Network[] = ['TRON', 'ETHEREUM', 'SOLANA'];
  const isCommunity = activePlan === 'community';

  return (
    <div className="w-full px-4 mb-4">
      {/* Floating Glass Panel */}
      <div className="glass-panel-3d rounded-2xl p-4 relative overflow-hidden">
        {/* Subtle cyan ambient glow in the top-right corner */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#22D3EE]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Panel Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span className="text-xs font-bold tracking-wider text-[#9CA3AF] uppercase">
              {t('selectNetworks')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isCommunity ? (
              <>
                <span className="text-[9.5px] font-mono text-[#38E8FF] bg-[#22D3EE]/10 px-2 py-0.5 rounded-full border border-[#22D3EE]/20 font-bold">
                  1/1 {t('activeNetworks')}
                </span>
                {onOpenLicensing && (
                  <button
                    onClick={onOpenLicensing}
                    type="button"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFB300]/15 hover:bg-[#FFB300]/25 border border-[#FFB300]/40 text-[#FFC107] text-[9.5px] font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(255,179,0,0.2)]"
                    title={t('upgradeParallelBtn')}
                  >
                    <Crown className="w-2.5 h-2.5 text-[#FFC107]" />
                    <span>{t('parallelClusterPro')}</span>
                  </button>
                )}
              </>
            ) : (
              <span className="flex items-center gap-1 text-[9.5px] font-mono text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded-full border border-[#00E676]/30 font-bold">
                <Zap className="w-2.5 h-2.5 text-[#00E676]" />
                <span>{selectedNetworks.length}/3 {t('parallelActive')}</span>
              </span>
            )}
          </div>
        </div>

        {/* Network Hardware Buttons Grid */}
        <div className={`flex items-center justify-around gap-2 pt-1 pb-1 ${disabled ? 'pointer-events-none opacity-80' : ''}`}>
          {networks.map((net) => (
            <Network3DButton
              key={net}
              network={net}
              isSelected={selectedNetworks.includes(net)}
              onToggle={onToggleNetwork}
            />
          ))}
        </div>

        {/* Notice Banner if triggered */}
        {notice && (
          <div className="mt-2.5 p-2 rounded-xl bg-[#FFB300]/15 border border-[#FFB300]/30 flex items-center justify-between text-[10.5px] text-[#FFD54F] animate-fadeIn font-mono">
            <div className="flex items-center gap-1.5 min-w-0 pr-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB300] shrink-0" />
              <span className="truncate">{notice}</span>
            </div>
            {onOpenLicensing && (
              <button
                onClick={onOpenLicensing}
                type="button"
                className="ml-2 px-2 py-0.5 rounded bg-[#FFB300] text-black font-extrabold text-[9px] uppercase tracking-wider shrink-0 cursor-pointer active:scale-95"
              >
                PRO
              </button>
            )}
          </div>
        )}

        {/* Community Single Network Notice */}
        {isCommunity && !notice && (
          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
            <div className="flex items-center gap-1.5 text-[#9CA3AF] min-w-0 pr-1">
              <Lock className="w-3 h-3 text-[#FFB300] shrink-0" />
              <span className="truncate">{t('singleNetworkNotice')}</span>
            </div>
            {onOpenLicensing && (
              <button
                onClick={onOpenLicensing}
                type="button"
                className="text-[#FFC107] hover:text-white font-bold shrink-0 ml-1.5 underline decoration-[#FFB300]/50 cursor-pointer flex items-center gap-0.5"
              >
                <span>PRO</span>
                <span>&rarr;</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

NetworkSelector.displayName = 'NetworkSelector';
