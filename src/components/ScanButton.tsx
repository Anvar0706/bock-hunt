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

  const handleClick = () => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('medium');
    } catch {}
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isScanning}
      type="button"
      className={`w-full py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2.5 relative overflow-hidden font-bold tracking-[0.08em] text-xs uppercase transition-all duration-150 select-none cursor-pointer ${
        isScanning
          ? 'button-dark-metal text-[#38E8FF] cursor-not-allowed opacity-90'
          : isWarning
          ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:text-white'
          : 'button-dark-metal text-white hover:text-[#38E8FF]'
      } ${disabled && !isWarning ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {/* Top Hairline Light Accent */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* Icon & Label */}
      <div className="relative z-10 flex items-center gap-2">
        {isScanning ? (
          <>
            <Loader2 className="w-4 h-4 text-[#22D3EE] animate-spin" />
            <span className="font-mono-terminal">
              {t('scanningBtn')}
            </span>
          </>
        ) : (
          <>
            {customIcon || (
              <ShieldCheck className="w-4 h-4 text-[#22D3EE]" />
            )}
            <span>
              {customLabel || t('startScan')}
            </span>
          </>
        )}
      </div>
    </button>
  );
});

ScanButton.displayName = 'ScanButton';
