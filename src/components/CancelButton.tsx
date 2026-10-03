import React from 'react';
import { XCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface CancelButtonProps {
  onClick: () => void;
}

export const CancelButton: React.FC<CancelButtonProps> = React.memo(({ onClick }) => {
  const { t } = useLanguage();

  return (
    <button
      onClick={onClick}
      type="button"
      className="w-full py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2.5 relative overflow-hidden font-bold tracking-widest text-xs uppercase button-cancel-3d text-[#FF2D2D] hover:text-[#FF5C5C] select-none cursor-pointer"
    >
      {/* Top Glass Edge Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FF6666]/70 to-transparent pointer-events-none" />

      <div className="relative z-10 flex items-center gap-2">
        <XCircle className="w-4 h-4 text-[#FF2D2D] drop-shadow-[0_0_8px_rgba(255,45,45,0.7)]" />
        <span className="drop-shadow-[0_0_10px_rgba(255,45,45,0.5)]">
          {t('cancelScan')}
        </span>
      </div>
    </button>
  );
});

CancelButton.displayName = 'CancelButton';
