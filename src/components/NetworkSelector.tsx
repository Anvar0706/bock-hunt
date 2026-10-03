import React from 'react';
import type { Network } from '../types';
import { Network3DButton } from './Network3DButton';
import { Layers } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface NetworkSelectorProps {
  selectedNetworks: Network[];
  onToggleNetwork: (network: Network) => void;
  disabled?: boolean;
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = React.memo(({
  selectedNetworks,
  onToggleNetwork,
  disabled = false,
}) => {
  const { t } = useLanguage();
  const networks: Network[] = ['TRON', 'ETHEREUM', 'SOLANA'];

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

          <div className="flex items-center gap-1 text-[10px] font-mono text-[#38E8FF] bg-[#22D3EE]/10 px-2 py-0.5 rounded-full border border-[#22D3EE]/20">
            <span>{selectedNetworks.length} {t('activeNetworks')}</span>
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
