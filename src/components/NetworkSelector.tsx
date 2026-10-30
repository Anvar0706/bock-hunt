import React from 'react';
import type { Network } from '../types';
import { Network3DButton } from './Network3DButton';
import { Layers, Zap, Sparkles } from 'lucide-react';
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
}) => {
  const { t } = useLanguage();
  const networks: Network[] = ['TRON', 'ETHEREUM', 'SOLANA'];
  const isCommunity = activePlan === 'community';

  return (
    <div className="w-full px-4 mb-4 select-none">
      {/* Floating Precision Glass Panel */}
      <div className="glass-panel-3d rounded-2xl p-4 relative overflow-hidden border border-white/10 bg-[#151722]/80 backdrop-blur-xl">
        {/* Ambient Top Glow Accent */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#22D3EE]/8 rounded-full blur-2xl pointer-events-none" />

        {/* Panel Header: Minimalist & Tactical */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span className="text-[11px] font-mono font-bold tracking-wider text-[#9CA3AF] uppercase">
              {t('selectNetworks')}
            </span>
          </div>

          {/* Mode Pill Indicator */}
          <div className="flex items-center gap-1.5">
            {isCommunity ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] font-mono text-[#94A3B8] bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/10 font-medium">
                  {t('singleChainActive')}
                </span>
                {onOpenLicensing && (
                  <button
                    onClick={onOpenLicensing}
                    type="button"
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-[9.5px] font-mono font-semibold transition-all active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.08)]"
                    title={t('upgradeParallelBtn')}
                  >
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    <span>{t('parallelClusterPro')}</span>
                  </button>
                )}
              </div>
            ) : (
              <span className="flex items-center gap-1.5 text-[9.5px] font-mono text-[#00E676] bg-[#00E676]/10 px-2.5 py-0.5 rounded-full border border-[#00E676]/30 font-bold shadow-[0_0_10px_rgba(0,230,118,0.15)]">
                <Zap className="w-2.5 h-2.5 text-[#00E676] animate-pulse" />
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
      </div>
    </div>
  );
});

NetworkSelector.displayName = 'NetworkSelector';
