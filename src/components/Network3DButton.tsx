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
      {/* Outer 3D Hardware Socket */}
      <div
        className={`relative w-16 h-16 rounded-full flex items-center justify-center p-1 hardware-socket transition-all duration-300 ${
          isSelected
            ? 'scale-105 shadow-[0_0_24px_rgba(34,211,238,0.35),0_12px_24px_rgba(0,0,0,0.6)] border border-white/25'
            : 'scale-95 opacity-55 hover:opacity-80 border border-white/5'
        }`}
      >
        {/* Glow halo when selected */}
        {isSelected && (
          <div
            className="absolute inset-0 rounded-full blur-md opacity-40 pointer-events-none transition-opacity duration-300"
            style={{ backgroundColor: config.color }}
          />
        )}

        {/* Inner Metallic Bezel Ring */}
        <div
          className={`relative w-full h-full rounded-full flex items-center justify-center transition-all duration-300 ${
            isSelected
              ? 'bg-gradient-to-b from-[#2A2E3D] via-[#1A1C28] to-[#12131C] border border-white/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),inset_0_-2px_4px_rgba(0,0,0,0.8)]'
              : 'bg-[#151722] border border-white/5'
          }`}
        >
          {/* Glass reflection crescent on top half */}
          <div className="absolute top-1 left-2 right-2 h-4 bg-gradient-to-b from-white/20 to-transparent rounded-t-full pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10 transition-transform duration-200 group-hover:scale-110">
            {renderLogo()}
          </div>
        </div>

        {/* Small active indicator dot */}
        {isSelected && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#00E676] shadow-[0_0_8px_#00E676] border border-[#0d1522]" />
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
