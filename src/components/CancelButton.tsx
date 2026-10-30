import React from 'react';
import { XCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface CancelButtonProps {
  onClick: () => void;
}

export const CancelButton: React.FC<CancelButtonProps> = React.memo(({ onClick }) => {
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
      type="button"
      className="w-full py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2.5 relative overflow-hidden font-bold tracking-widest text-xs uppercase button-cancel-3d text-red-400 hover:text-red-300 select-none cursor-pointer active:scale-98"
    >
      {/* Top Hairline Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-400/40 to-transparent pointer-events-none" />

      <div className="relative z-10 flex items-center gap-2">
        <XCircle className="w-4 h-4 text-red-400" />
        <span>
          {t('cancelScan')}
        </span>
      </div>
    </button>
  );
});

CancelButton.displayName = 'CancelButton';
