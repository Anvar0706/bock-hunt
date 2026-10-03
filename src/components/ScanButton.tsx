import React from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface ScanButtonProps {
  onClick: () => void;
  isScanning: boolean;
  disabled?: boolean;
  customLabel?: string;
  customIcon?: React.ReactNode;
  isWarning?: boolean;
}

export const ScanButton: React.FC<ScanButtonProps> = React.memo(({
  onClick,
  isScanning,
  disabled = false,
  customLabel,
  customIcon,
  isWarning = false,
}) => {
  const { t } = useLanguage();

  return (
    <button
      onClick={onClick}
      disabled={disabled || isScanning}
      type="button"
      className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 relative overflow-hidden font-bold tracking-widest text-sm uppercase transition-all duration-200 select-none ${
        isScanning
          ? 'button-dark-metal animate-breathing-glow text-[#38E8FF] cursor-not-allowed opacity-95'
          : isWarning
          ? 'bg-gradient-to-r from-[#FFB300]/20 via-[#FF8F00]/20 to-[#FFB300]/20 border border-[#FFB300]/50 text-[#FFD54F] hover:text-white cursor-pointer shadow-[0_0_20px_rgba(255,179,0,0.25)]'
          : 'button-dark-metal text-white hover:text-[#38E8FF] cursor-pointer'
      } ${disabled && !isWarning ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {/* Top Glass Edge Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#38E8FF]/80 to-transparent pointer-events-none" />

      {/* Button Interior Ambient Light */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#22D3EE]/10 to-transparent pointer-events-none" />

      {/* Icon & Label */}
      <div className="relative z-10 flex items-center gap-2.5">
        {isScanning ? (
          <>
            <Loader2 className="w-5 h-5 text-[#22D3EE] animate-spin" />
            <span className="drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
              {t('scanningBtn')}
            </span>
          </>
        ) : (
          <>
            {customIcon || (
              <ShieldCheck className="w-5 h-5 text-[#22D3EE] drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]" />
            )}
            <span className="drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
              {customLabel || t('startScan')}
            </span>
          </>
        )}
      </div>
    </button>
  );
});

ScanButton.displayName = 'ScanButton';
