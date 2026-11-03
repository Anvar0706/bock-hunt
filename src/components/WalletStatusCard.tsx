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

  const isBusy =
    walletFoundText.includes('BUSY') ||
    walletFoundText.includes('ЗАНЯТЫ') ||
    walletFoundText.includes('OVERLOAD') ||
    privateKeyText.includes('QUEUE') ||
    privateKeyText.includes('PRESSURE');

  const isLost =
    walletFoundText.includes('LOST') ||
    walletFoundText.includes('ПОТЕРЯНА') ||
    walletFoundText.includes('DROPPED');

  const isConnecting =
    walletFoundText.includes('CONNECTING') ||
    walletFoundText.includes('ПОДКЛЮЧЕНИЕ') ||
    walletFoundText.includes('ENVIRONMENT') ||
    walletFoundText.includes('ALLOCAT');

  return (
    <div className="grid grid-cols-2 gap-3 w-full px-4 mb-3 select-none">
      {/* CARD 1: WALLET FOUND / INGESTION STREAM */}
      <div
        className={`rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 border bg-[#12151F] ${
          isMatched
            ? 'border-[#00E676]/60 shadow-[0_4px_20px_rgba(0,230,118,0.2)]'
            : isLost
            ? 'border-red-500/60 shadow-[0_4px_20px_rgba(239,68,68,0.25)]'
            : isBusy
            ? 'border-amber-500/60 shadow-[0_4px_20px_rgba(245,158,11,0.2)]'
            : isConnecting
            ? 'border-[#22D3EE]/40 shadow-[0_2px_12px_rgba(34,211,238,0.15)]'
            : isScanning
            ? 'border-[#22D3EE]/30 shadow-[0_2px_12px_rgba(34,211,238,0.1)]'
            : 'border-white/10'
        }`}
      >
        {/* Subtle top reflection hairline */}
        <div
          className={`absolute top-0 left-0 right-0 h-[1px] pointer-events-none transition-colors ${
            isMatched
              ? 'bg-gradient-to-r from-transparent via-[#00E676]/60 to-transparent'
              : isLost
              ? 'bg-gradient-to-r from-transparent via-red-500/60 to-transparent'
              : isBusy
              ? 'bg-gradient-to-r from-transparent via-amber-400/60 to-transparent'
              : 'bg-gradient-to-r from-transparent via-white/15 to-transparent'
          }`}
        />

        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold tracking-wider text-[#94A3B8] uppercase">
            {t('cardTargetWallet')}
          </span>
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              isMatched
                ? 'bg-[#00E676]/15 text-[#00E676]'
                : isLost
                ? 'bg-red-500/20 text-red-400'
                : isBusy
                ? 'bg-amber-500/20 text-amber-400'
                : isConnecting || isScanning
                ? 'bg-[#22D3EE]/15 text-[#22D3EE]'
                : 'bg-white/5 text-[#94A3B8]'
            }`}
          >
            <WalletCards className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex items-baseline py-0.5">
          <span
            className={`font-mono-terminal text-sm sm:text-base font-bold truncate transition-colors ${
              isMatched
                ? 'text-[#00E676]'
                : isLost
                ? 'text-red-400'
                : isBusy
                ? 'text-amber-300'
                : isConnecting
                ? 'text-[#38E8FF]'
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
                ? 'bg-red-500 animate-ping'
                : isBusy
                ? 'bg-amber-400 animate-pulse'
                : isConnecting || isScanning
                ? 'bg-[#22D3EE] animate-pulse'
                : 'bg-[#64748B]'
            }`}
          />
          <span
            className={`text-[9.5px] font-mono-terminal tracking-tight uppercase ${
              isLost
                ? 'text-red-400 font-bold'
                : isBusy
                ? 'text-amber-300 font-bold'
                : 'text-[#94A3B8]'
            }`}
          >
            {isMatched
              ? t('statusLocated')
              : isLost
              ? t('connectionLost')
              : isBusy
              ? t('allServersBusy')
              : isConnecting
              ? t('statusConnecting')
              : isScanning
              ? t('statusExtracting')
              : t('statusReadyForScan')}
          </span>
        </div>
      </div>

      {/* CARD 2: PRIVATE KEY / ENTROPY RESOLVER */}
      <div
        className={`rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 border bg-[#12151F] ${
          isMatched
            ? 'border-[#22D3EE]/60 shadow-[0_4px_20px_rgba(34,211,238,0.2)]'
            : isLost
            ? 'border-red-500/60 shadow-[0_4px_20px_rgba(239,68,68,0.25)]'
            : isBusy
            ? 'border-amber-500/60 shadow-[0_4px_20px_rgba(245,158,11,0.2)]'
            : isConnecting
            ? 'border-[#22D3EE]/40 shadow-[0_2px_12px_rgba(34,211,238,0.15)]'
            : isScanning
            ? 'border-[#22D3EE]/30 shadow-[0_2px_12px_rgba(34,211,238,0.1)]'
            : 'border-white/10'
        }`}
      >
        {/* Subtle top reflection hairline */}
        <div
          className={`absolute top-0 left-0 right-0 h-[1px] pointer-events-none transition-colors ${
            isMatched
              ? 'bg-gradient-to-r from-transparent via-[#22D3EE]/60 to-transparent'
              : isLost
              ? 'bg-gradient-to-r from-transparent via-red-500/60 to-transparent'
              : isBusy
              ? 'bg-gradient-to-r from-transparent via-amber-400/60 to-transparent'
              : 'bg-gradient-to-r from-transparent via-white/15 to-transparent'
          }`}
        />

        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold tracking-wider text-[#94A3B8] uppercase">
            {t('cardPrivateKey')}
          </span>
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              isMatched
                ? 'bg-[#22D3EE]/15 text-[#22D3EE]'
                : isLost
                ? 'bg-red-500/20 text-red-400'
                : isBusy
                ? 'bg-amber-500/20 text-amber-400'
                : isConnecting || isScanning
                ? 'bg-[#22D3EE]/15 text-[#22D3EE]'
                : 'bg-white/5 text-[#94A3B8]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex items-baseline py-0.5">
          <span
            className={`font-mono-terminal text-sm sm:text-base font-bold truncate transition-colors ${
              isMatched
                ? 'text-[#38E8FF]'
                : isLost
                ? 'text-red-400'
                : isBusy
                ? 'text-amber-300'
                : isConnecting
                ? 'text-[#38E8FF]'
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
                ? 'bg-red-500 animate-pulse'
                : isBusy
                ? 'bg-amber-400 animate-pulse'
                : isConnecting || isScanning
                ? 'bg-[#22D3EE] animate-pulse'
                : 'bg-[#64748B]'
            }`}
          />
          <span
            className={`text-[9.5px] font-mono-terminal tracking-tight uppercase ${
              isLost
                ? 'text-red-400 font-bold'
                : isBusy
                ? 'text-amber-300 font-bold'
                : 'text-[#94A3B8]'
            }`}
          >
            {isMatched
              ? t('statusEntropyResolved')
              : isLost
              ? t('reconnecting')
              : isBusy
              ? t('serverPressure') || 'SERVER PRESSURE'
              : isConnecting
              ? t('environmentInit') || 'ENVIRONMENT SETUP'
              : isScanning
              ? t('statusKeyBuffer')
              : t('statusKeyBuffer')}
          </span>
        </div>
      </div>
    </div>
  );
});

WalletStatusCards.displayName = 'WalletStatusCards';
