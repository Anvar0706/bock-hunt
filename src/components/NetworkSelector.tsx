import React from 'react';
import type { Network } from '../types';
import { Network3DButton } from './Network3DButton';
import { Layers, Radio } from 'lucide-react';
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
}) => {
  const { t } = useLanguage();
  const networks: Network[] = ['TRON', 'ETHEREUM', 'SOLANA'];
  const isCommunity = activePlan === 'community';

  return (
    <div className="w-full px-4 mb-4 select-none">
      {/* Precision Hardware Inset Panel */}
      <div className="rounded-2xl p-4 relative overflow-hidden border border-white/[0.07] bg-[#12151F] shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        {/* Panel Header: Tactical & Clean */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#38E8FF]" />
            <span className="text-[11px] font-mono font-semibold tracking-wider text-[#94A3B8] uppercase">
              {t('selectNetworks')}
            </span>
          </div>

          {/* Mode Pill: Strict telemetry, zero nagware */}
          <div>
            {isCommunity ? (
              <span className="inline-flex items-center gap-1.5 text-[9.5px] font-mono text-[#94A3B8] bg-white/[0.04] px-2.5 py-0.5 rounded-md border border-white/[0.06] font-medium tracking-wide">
                <Radio className="w-2.5 h-2.5 text-[#38E8FF]" />
                <span>{selectedNetworks[0] || 'TRON'} // SINGLE-STREAM</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[9.5px] font-mono text-[#00E676] bg-[#00E676]/10 px-2.5 py-0.5 rounded-md border border-[#00E676]/30 font-semibold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                <span>{selectedNetworks.length}/3 PARALLEL CLUSTER</span>
              </span>
            )}
          </div>
        </div>

        {/* Network Hardware Buttons Grid */}
        <div className={`flex items-center justify-around gap-2 pt-1 pb-1 ${disabled ? 'pointer-events-none opacity-70' : ''}`}>
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
