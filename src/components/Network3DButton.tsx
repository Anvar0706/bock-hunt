import React from 'react';
import type { Network } from '../types';
import { NETWORKS } from '../data/demoNetworks';

interface Network3DButtonProps {
  network: Network;
  isSelected: boolean;
  onToggle: (network: Network) => void;
}

export const Network3DButton: React.FC<Network3DButtonProps> = ({
  network,
  isSelected,
  onToggle,
}) => {
  const config = NETWORKS[network];

  // Render network-specific geometric vector
  const renderLogo = () => {
    switch (network) {
      case 'ETHEREUM':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L5 12.5L12 16.5L19 12.5L12 2Z"
              fill={isSelected ? '#38E8FF' : '#94A3B8'}
              fillOpacity={isSelected ? 0.95 : 0.6}
            />
            <path
              d="M12 16.5L5 12.5L12 22L19 12.5L12 16.5Z"
              fill={isSelected ? '#22D3EE' : '#64748B'}
              fillOpacity={isSelected ? 0.8 : 0.4}
            />
            <path
              d="M12 2L12 16.5L19 12.5L12 2Z"
              fill={isSelected ? '#7DF9FF' : '#CBD5E1'}
              fillOpacity={isSelected ? 0.9 : 0.5}
            />
          </svg>
        );
      case 'TRON':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 4L3 9L11 13L15 21L21 4Z"
              stroke={isSelected ? '#FF334B' : '#94A3B8'}
              strokeWidth="2"
              strokeLinejoin="round"
              fill={isSelected ? 'rgba(255, 51, 75, 0.25)' : 'none'}
            />
            <path
              d="M11 13L21 4"
              stroke={isSelected ? '#FF6B7D' : '#64748B'}
              strokeWidth="1.5"
            />
          </svg>
        );
      case 'SOLANA':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path
              d="M4.5 7.5H16.5L19.5 4.5H7.5L4.5 7.5Z"
              fill={isSelected ? '#00E676' : '#94A3B8'}
            />
            <path
              d="M7.5 13.5H19.5L16.5 10.5H4.5L7.5 13.5Z"
              fill={isSelected ? '#22D3EE' : '#64748B'}
            />
            <path
              d="M4.5 19.5H16.5L19.5 16.5H7.5L4.5 19.5Z"
              fill={isSelected ? '#00E676' : '#94A3B8'}
            />
          </svg>
        );
    }
  };

  return (
    <button
      onClick={() => onToggle(network)}
      type="button"
      className="flex flex-col items-center gap-2 group focus:outline-none select-none transition-all duration-300"
    >
      {/* Outer Hardware Socket */}
      <div
        className={`relative w-15 h-15 rounded-2xl flex items-center justify-center p-1 transition-all duration-200 ${
          isSelected
            ? 'scale-100 shadow-[0_4px_16px_rgba(0,0,0,0.6)] border border-white/20 bg-[#161A26]'
            : 'scale-95 opacity-50 hover:opacity-75 border border-white/[0.06] bg-[#0E1118]'
        }`}
      >
        {/* Inner Precision Bezel Ring */}
        <div
          className={`relative w-full h-full rounded-xl flex items-center justify-center transition-all duration-200 ${
            isSelected
              ? 'bg-[#181C28] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
              : 'bg-[#10131A] border border-transparent'
          }`}
        >
          {/* Logo */}
          <div className="relative z-10 transition-transform duration-200 group-hover:scale-105">
            {renderLogo()}
          </div>
        </div>

        {/* Small active indicator dot */}
        {isSelected && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00E676] border-2 border-[#0A0C10]" />
        )}
      </div>

      {/* Label and Tag */}
      <div className="flex flex-col items-center">
        <span
          className={`text-xs font-bold tracking-wide transition-colors ${
            isSelected ? 'text-white' : 'text-[#64748B]'
          }`}
        >
          {config.name}
        </span>
        <span
          className={`text-[9.5px] font-mono transition-colors ${
            isSelected ? 'text-[#38E8FF]' : 'text-[#475569]'
          }`}
        >
          {config.tag}
        </span>
      </div>
    </button>
  );
};
