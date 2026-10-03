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
    <div className="grid grid-cols-2 gap-3 w-full px-4 mb-3">
      {/* CARD 1: WALLET FOUND */}
      <div
        className={`glass-card-elevated rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-colors duration-150 ${
          isMatched
            ? 'border-[#00E676]/40 shadow-[0_12px_28px_-6px_rgba(0,230,118,0.25)]'
            : isLost
            ? 'border-[#FF2D2D]/60 shadow-[0_0_20px_rgba(255,45,45,0.3)]'
            : isBusy
            ? 'border-[#FFB800]/40 shadow-[0_0_15px_rgba(255,184,0,0.2)]'
            : isScanning
            ? 'border-[#22D3EE]/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
            : 'border-white/10 hover:border-[#22D3EE]/30'
        }`}
      >
        {/* Subtle top reflection */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        {isMatched && (
          <div className="absolute -right-8 -top-8 w-20 h-20 bg-[#00E676]/15 blur-xl pointer-events-none rounded-full" />
        )}
        {isLost && !isMatched && (
          <div className="absolute -right-8 -top-8 w-20 h-20 bg-[#FF2D2D]/20 blur-xl pointer-events-none rounded-full animate-pulse" />
        )}
        {isBusy && !isMatched && !isLost && (
          <div className="absolute -right-8 -top-8 w-20 h-20 bg-[#FFB800]/15 blur-xl pointer-events-none rounded-full animate-pulse" />
        )}
        {isScanning && !isMatched && !isBusy && !isLost && (
          <div className="absolute -right-8 -top-8 w-20 h-20 bg-[#22D3EE]/10 blur-xl pointer-events-none rounded-full animate-pulse" />
        )}

        <div className="flex items-center justify-between mb-2">
          <span className="text-[10.5px] font-bold tracking-wider text-[#9CA3AF] uppercase">
            {t('cardTargetWallet')}
          </span>
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              isMatched
                ? 'bg-[#00E676]/15 text-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.3)]'
                : isLost
                ? 'bg-[#FF2D2D]/15 text-[#FF2D2D]'
                : isBusy
                ? 'bg-[#FFB800]/15 text-[#FFB800]'
                : isScanning
                ? 'bg-[#22D3EE]/15 text-[#22D3EE]'
                : 'bg-white/5 text-[#9CA3AF]'
            }`}
          >
            <WalletCards className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex items-baseline">
          <span
            className={`font-mono text-base sm:text-lg font-bold truncate ${
              isMatched
                ? 'text-[#00E676] drop-shadow-[0_0_8px_rgba(0,230,118,0.4)]'
                : isLost
                ? 'text-[#FF2D2D] drop-shadow-[0_0_8px_rgba(255,45,45,0.6)]'
                : isBusy
                ? 'text-[#FFB800] drop-shadow-[0_0_8px_rgba(255,184,0,0.4)]'
                : isScanning
                ? 'text-[#E0F2FE]'
                : 'text-white'
            }`}
          >
            {walletFoundText}
          </span>
        </div>

        {/* Bottom micro status dot */}
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isMatched
                ? 'bg-[#00E676] shadow-[0_0_6px_#00E676]'
                : isLost
                ? 'bg-[#FF2D2D] animate-ping'
                : isBusy
                ? 'bg-[#FFB800] animate-ping'
                : isScanning
                ? 'bg-[#22D3EE] animate-ping'
                : 'bg-[#9CA3AF]/40'
            }`}
          />
          <span className="text-[9px] font-mono tracking-tight text-[#9CA3AF]">
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

      {/* CARD 2: PRIVATE KEY */}
      <div
        className={`glass-card-elevated rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-colors duration-150 ${
          isMatched
            ? 'border-[#22D3EE]/40 shadow-[0_12px_28px_-6px_rgba(34,211,238,0.25)]'
            : isLost
            ? 'border-[#FF2D2D]/60 shadow-[0_0_20px_rgba(255,45,45,0.3)]'
            : isBusy
            ? 'border-[#FFB800]/40 shadow-[0_0_15px_rgba(255,184,0,0.2)]'
            : isScanning
            ? 'border-[#22D3EE]/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
            : 'border-white/10 hover:border-[#22D3EE]/30'
        }`}
      >
        {/* Subtle top reflection */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        {isMatched && (
          <div className="absolute -right-8 -top-8 w-20 h-20 bg-[#22D3EE]/15 blur-xl pointer-events-none rounded-full" />
        )}
        {isLost && !isMatched && (
          <div className="absolute -right-8 -top-8 w-20 h-20 bg-[#FF2D2D]/20 blur-xl pointer-events-none rounded-full animate-pulse" />
        )}
        {isBusy && !isMatched && !isLost && (
          <div className="absolute -right-8 -top-8 w-20 h-20 bg-[#FFB800]/15 blur-xl pointer-events-none rounded-full animate-pulse" />
        )}
        {isScanning && !isMatched && !isBusy && !isLost && (
          <div className="absolute -right-8 -top-8 w-20 h-20 bg-[#22D3EE]/10 blur-xl pointer-events-none rounded-full animate-pulse" />
        )}

        <div className="flex items-center justify-between mb-2">
          <span className="text-[10.5px] font-bold tracking-wider text-[#9CA3AF] uppercase">
            {t('cardPrivateKey')}
          </span>
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              isMatched
                ? 'bg-[#22D3EE]/15 text-[#22D3EE] shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                : isLost
                ? 'bg-[#FF2D2D]/15 text-[#FF2D2D]'
                : isBusy
                ? 'bg-[#FFB800]/15 text-[#FFB800]'
                : isScanning
                ? 'bg-[#22D3EE]/15 text-[#22D3EE]'
                : 'bg-white/5 text-[#9CA3AF]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex items-baseline">
          <span
            className={`font-mono text-base sm:text-lg font-bold truncate ${
              isMatched
                ? 'text-[#38E8FF] drop-shadow-[0_0_8px_rgba(56,232,255,0.4)]'
                : isLost
                ? 'text-[#FF8080]'
                : isBusy
                ? 'text-[#FFD54F]'
                : isScanning
                ? 'text-[#94A3B8]'
                : 'text-white'
            }`}
          >
            {privateKeyText}
          </span>
        </div>

        {/* Bottom micro status dot */}
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isMatched
                ? 'bg-[#22D3EE] shadow-[0_0_6px_#22D3EE]'
                : isLost
                ? 'bg-[#FF2D2D] animate-pulse'
                : isBusy
                ? 'bg-[#FFB800] animate-pulse'
                : isScanning
                ? 'bg-[#22D3EE] animate-pulse'
                : 'bg-[#9CA3AF]/40'
            }`}
          />
          <span className="text-[9px] font-mono tracking-tight text-[#9CA3AF]">
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
