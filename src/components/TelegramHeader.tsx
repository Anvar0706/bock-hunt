import React, { useState } from 'react';
import { MoreVertical, Cpu, Terminal, Volume2, VolumeX, Crown, ShieldCheck, Globe } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface TelegramHeaderProps {
  onResetData?: () => void;
  onOpenInfo: () => void;
  onOpenLicensing: () => void;
  onOpenAdmin: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activePlan: string;
  isAdmin?: boolean;
}

export const TelegramHeader: React.FC<TelegramHeaderProps> = ({
  onOpenInfo,
  onOpenLicensing,
  onOpenAdmin,
  soundEnabled,
  onToggleSound,
  activePlan,
  isAdmin = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="relative w-full z-40 px-3 sm:px-4 pt-3 pb-2 select-none safe-top">
      {/* Top Ambient Glow Bar */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#22D3EE]/40 to-transparent" />

      <div className="flex items-center justify-between gap-2">
        {/* Left: Futuristic Branding (constrained with min-w-0 to prevent pushing right buttons) */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <div className="relative shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-[#22D3EE]/30 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
            <Terminal className="w-4 h-4 text-[#22D3EE]" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00E676] shadow-[0_0_6px_#00E676]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-sm font-extrabold tracking-wider text-white truncate">
                {t('appTitle')}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[9.5px] sm:text-[10px] tracking-wider text-[#9CA3AF] uppercase font-semibold truncate">
                {t('appSubtitle')}
              </span>
              <span className="w-1 h-1 rounded-full bg-[#22D3EE]/60 shrink-0" />
              <button
                onClick={onOpenLicensing}
                type="button"
                className="text-[8.5px] sm:text-[9px] px-1.5 py-0.2 rounded font-mono uppercase bg-[#22D3EE]/10 text-[#38E8FF] hover:bg-[#22D3EE]/20 border border-[#22D3EE]/30 font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Crown className="w-2.5 h-2.5 text-[#38E8FF]" />
                <span>{activePlan === 'pro' ? 'PRO' : activePlan === 'enterprise' ? 'ENTERPRISE' : 'FREE'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Language Switcher, License, and Menu (Always pinned and shrink-0) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Prominent Language Switcher Pill (EN | RU) */}
          <button
            onClick={toggleLanguage}
            type="button"
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-black/50 hover:bg-white/10 border border-[#22D3EE]/30 text-[11px] font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.15)] shrink-0"
            title="Switch Language: English / Russian"
            aria-label="Language Switcher"
          >
            <Globe className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span className={language === 'en' ? 'text-[#38E8FF]' : 'text-[#64748B]'}>EN</span>
            <span className="text-white/20">|</span>
            <span className={language === 'ru' ? 'text-[#38E8FF]' : 'text-[#64748B]'}>RU</span>
          </button>

          {/* Quick License Plans Button (hidden on mobile to ensure 3-dots menu button is always visible) */}
          <button
            onClick={onOpenLicensing}
            type="button"
            className="w-8 h-8 rounded-xl hidden sm:flex items-center justify-center bg-[#22D3EE]/10 border border-[#22D3EE]/30 text-[#38E8FF] hover:bg-[#22D3EE]/20 transition-all shadow-[0_0_10px_rgba(34,211,238,0.2)] cursor-pointer active:scale-95 shrink-0"
            title={t('menuLicensing')}
            aria-label="Software Licensing"
          >
            <Crown className="w-4 h-4" />
          </button>

          {/* Telegram Menu 3-Dots Button (Guaranteed Visible) */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 active:scale-95 transition-all text-[#9CA3AF] hover:text-white hover:bg-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.4)] cursor-pointer shrink-0"
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
                <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel-3d py-2 z-40 border border-white/15 animate-modal-3d shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenLicensing();
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-xs text-[#38E8FF] hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-[#38E8FF]" />
                    <span>{t('menuLicensing')}</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-xs text-[#00E676] hover:bg-white/10 transition-colors text-left cursor-pointer"
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
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-xs text-[#F5F7FA] hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Cpu className="w-4 h-4 text-[#22D3EE]" />
                    <span>{t('menuArchitecture')}</span>
                  </button>

                  <button
                    onClick={() => {
                      onToggleSound();
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-xs text-[#F5F7FA] hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    {soundEnabled ? (
                      <>
                        <Volume2 className="w-4 h-4 text-[#00E676]" />
                        <span>{t('hapticAudio')}: {t('on')}</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 text-[#9CA3AF]" />
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
