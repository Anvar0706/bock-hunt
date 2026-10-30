import React from 'react';
import { KeyRound, WalletCards } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface WalletStatusCardProps {
  walletFoundText: string;
  privateKeyText: string;
  isMatched?: boolean;
  isScanning?: boolean;
}

export const WalletStatusCards: React.FC<WalletStatusCardProps> = React.memo(({
  walletFoundText,
  privateKeyText,
  isMatched = false,
  isScanning = false,
}) => {
  const { t } = useLanguage();
  const isBusy = walletFoundText.includes('BUSY') || walletFoundText.includes('ЗАНЯТЫ');
  const isLost = walletFoundText.includes('LOST') || walletFoundText.includes('ПОТЕРЯНА');

  return (
    <div className="grid grid-cols-2 gap-3 w-full px-4 mb-3 select-none">
      {/* CARD 1: WALLET FOUND / INGESTION STREAM */}
      <div
        className={`rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden transition-all duration-150 border bg-[#12151F] ${
          isMatched
            ? 'border-[#00E676]/50 shadow-[0_4px_16px_rgba(0,230,118,0.15)]'
            : isLost
            ? 'border-[#EF4444]/50'
            : isBusy
            ? 'border-[#F59E0B]/40'
            : isScanning
            ? 'border-white/15'
            : 'border-white/10'
        }`}
      >
        {/* Subtle top reflection hairline */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold tracking-wider text-[#94A3B8] uppercase">
            {t('cardTargetWallet')}
          </span>
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              isMatched
                ? 'bg-[#00E676]/15 text-[#00E676]'
                : isLost
                ? 'bg-[#EF4444]/15 text-[#EF4444]'
                : isBusy
                ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                : isScanning
                ? 'bg-[#22D3EE]/15 text-[#22D3EE]'
                : 'bg-white/5 text-[#94A3B8]'
            }`}
          >
            <WalletCards className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex items-baseline py-0.5">
          <span
            className={`font-mono-terminal text-sm sm:text-base font-bold truncate ${
              isMatched
                ? 'text-[#00E676]'
                : isLost
                ? 'text-[#EF4444]'
                : isBusy
                ? 'text-[#F59E0B]'
                : isScanning
                ? 'text-[#E2E8F0]'
                : 'text-[#CBD5E1]'
            }`}
          >
            {walletFoundText}
          </span>
        </div>

        {/* Bottom micro status dot */}
        <div className="flex items-center gap-1.5 mt-2 pt-1 border-t border-white/[0.04]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isMatched
                ? 'bg-[#00E676]'
                : isLost
                ? 'bg-[#EF4444] animate-ping'
                : isBusy
                ? 'bg-[#F59E0B] animate-ping'
                : isScanning
                ? 'bg-[#22D3EE] animate-pulse'
                : 'bg-[#64748B]'
            }`}
          />
          <span className="text-[9.5px] font-mono-terminal tracking-tight text-[#94A3B8]">
            {isMatched
              ? t('statusLocated')
              : isLost
              ? t('connectionLost')
              : isBusy
              ? t('allServersBusy')
              : isScanning
              ? t('statusExtracting')
              : t('statusReadyForScan')}
          </span>
        </div>
      </div>

      {/* CARD 2: PRIVATE KEY / ENTROPY RESOLVER */}
      <div
        className={`rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden transition-all duration-150 border bg-[#12151F] ${
          isMatched
            ? 'border-[#22D3EE]/50 shadow-[0_4px_16px_rgba(34,211,238,0.15)]'
            : isLost
            ? 'border-[#EF4444]/50'
            : isBusy
            ? 'border-[#F59E0B]/40'
            : isScanning
            ? 'border-white/15'
            : 'border-white/10'
        }`}
      >
        {/* Subtle top reflection hairline */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold tracking-wider text-[#94A3B8] uppercase">
            {t('cardPrivateKey')}
          </span>
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              isMatched
                ? 'bg-[#22D3EE]/15 text-[#22D3EE]'
                : isLost
                ? 'bg-[#EF4444]/15 text-[#EF4444]'
                : isBusy
                ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                : isScanning
                ? 'bg-[#22D3EE]/15 text-[#22D3EE]'
                : 'bg-white/5 text-[#94A3B8]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex items-baseline py-0.5">
          <span
            className={`font-mono-terminal text-sm sm:text-base font-bold truncate ${
              isMatched
                ? 'text-[#38E8FF]'
                : isLost
                ? 'text-[#FCA5A5]'
                : isBusy
                ? 'text-[#FDE68A]'
                : isScanning
                ? 'text-[#94A3B8]'
                : 'text-[#CBD5E1]'
            }`}
          >
            {privateKeyText}
          </span>
        </div>

        {/* Bottom micro status dot */}
        <div className="flex items-center gap-1.5 mt-2 pt-1 border-t border-white/[0.04]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isMatched
                ? 'bg-[#22D3EE]'
                : isLost
                ? 'bg-[#EF4444] animate-pulse'
                : isBusy
                ? 'bg-[#F59E0B] animate-pulse'
                : isScanning
                ? 'bg-[#22D3EE] animate-pulse'
                : 'bg-[#64748B]'
            }`}
          />
          <span className="text-[9.5px] font-mono-terminal tracking-tight text-[#94A3B8]">
            {isMatched
              ? t('statusEntropyResolved')
              : isLost
              ? t('reestablishing')
              : isBusy
              ? t('reconnecting')
              : isScanning
              ? t('analyzing')
              : t('statusKeyBuffer')}
          </span>
        </div>
      </div>
    </div>
  );
});

WalletStatusCards.displayName = 'WalletStatusCards';
