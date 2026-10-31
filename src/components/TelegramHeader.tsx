import React, { useState } from 'react';
import { MoreVertical, Cpu, Terminal, Volume2, VolumeX, ShieldCheck, Globe, Zap, Compass } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface TelegramHeaderProps {
  onResetData?: () => void;
  onOpenInfo: () => void;
  onOpenLicensing: () => void;
  onOpenAdmin: () => void;
  onOpenTour?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activePlan: string;
  isAdmin?: boolean;
}

export const TelegramHeader: React.FC<TelegramHeaderProps> = ({
  onOpenInfo,
  onOpenLicensing,
  onOpenAdmin,
  onOpenTour,
  soundEnabled,
  onToggleSound,
  activePlan,
  isAdmin = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="relative w-full z-40 px-3 sm:px-4 pt-3 pb-2 select-none safe-top">
      {/* Top Hairline Accent Line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex items-center justify-between gap-2">
        {/* Left: Monolithic Institutional Branding */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
          <div className="relative shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-[#12151F] border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            <Terminal className="w-4 h-4 text-[#22D3EE]" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#00E676]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-[13px] font-bold tracking-[0.14em] text-white uppercase truncate font-mono-terminal">
                {t('appTitle') || 'BLOCKHUNT PROTOCOL'}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 truncate pt-0.5">
              <span className="text-[9.5px] tracking-wider text-[#64748B] uppercase font-semibold truncate">
                {t('appSubtitle') || 'SECURITY SCANNER'}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
              <button
                onClick={onOpenLicensing}
                type="button"
                className="text-[9px] px-2 py-0.5 rounded-full font-mono uppercase bg-white/[0.04] text-[#CBD5E1] hover:text-white border border-white/10 font-medium transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activePlan === 'pro' || activePlan === 'enterprise' ? 'bg-[#00E676]' : 'bg-[#22D3EE]'}`} />
                <span>{activePlan === 'pro' ? 'PRO CLUSTER' : activePlan === 'enterprise' ? 'ENTERPRISE' : 'COMMUNITY'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Language Switcher & Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Prominent Language Switcher Pill (EN | RU) */}
          <button
            onClick={toggleLanguage}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#12151F] hover:bg-[#181D2A] border border-white/10 text-[11px] font-mono font-semibold transition-all active:scale-95 cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.4)] shrink-0"
            title="Switch Language: English / Russian"
            aria-label="Language Switcher"
          >
            <Globe className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span className={language === 'en' ? 'text-white font-bold' : 'text-[#64748B]'}>EN</span>
            <span className="text-white/20">|</span>
            <span className={language === 'ru' ? 'text-white font-bold' : 'text-[#64748B]'}>RU</span>
          </button>

          {/* Telegram Menu 3-Dots Button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#12151F] border border-white/10 active:scale-95 transition-all text-[#94A3B8] hover:text-white hover:bg-[#181D2A] shadow-[0_2px_6px_rgba(0,0,0,0.4)] cursor-pointer shrink-0"
              aria-label="Menu"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#12151F] py-2 z-40 border border-white/12 animate-modal-3d shadow-[0_20px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenLicensing();
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-xs text-[#CBD5E1] hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-[#22D3EE]" />
                    <span>{t('menuLicensing')}</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-xs text-[#00E676] hover:bg-white/5 transition-colors text-left cursor-pointer font-medium"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#00E676]" />
                      <span>{t('menuAdmin')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenInfo();
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-xs text-[#CBD5E1] hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <Cpu className="w-4 h-4 text-[#94A3B8]" />
                    <span>{t('menuArchitecture')}</span>
                  </button>

                  {onOpenTour && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenTour();
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-xs text-[#CBD5E1] hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                    >
                      <Compass className="w-4 h-4 text-[#22D3EE]" />
                      <span>{t('tourGuideMenu')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onToggleSound();
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-xs text-[#CBD5E1] hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    {soundEnabled ? (
                      <>
                        <Volume2 className="w-4 h-4 text-[#00E676]" />
                        <span>{t('hapticAudio')}: {t('on')}</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 text-[#64748B]" />
                        <span>{t('hapticAudio')}: {t('off')}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
