import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, Send, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface BlockedScreenProps {
  tgId?: string;
  userName?: string;
  onRefreshStatus?: () => Promise<void> | void;
}

export const BlockedScreen: React.FC<BlockedScreenProps> = ({
  tgId = 'UNKNOWN',
  userName = 'Operative',
  onRefreshStatus,
}) => {
  const { t } = useLanguage();
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const handleCheck = async () => {
    if (checking) return;
    setChecking(true);
    setCheckResult(null);
    try {
      if (onRefreshStatus) {
        await onRefreshStatus();
      }
      setCheckResult('Status verified with security gateway.');
    } catch {
      setCheckResult('Unable to reach security gateway.');
    } finally {
      setTimeout(() => setChecking(false), 800);
      setTimeout(() => setCheckResult(null), 3000);
    }
  };

  const handleOpenSupport = () => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink('https://t.me/Block_huntbot');
    } else {
      window.open('https://t.me/Block_huntbot', '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0C10] select-none">
      {/* Precision Incident Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-red-500/25 bg-[#12151F] shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden p-6 text-center animate-modal-3d">
        {/* Top Warning Hairline */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-red-500/60 to-transparent pointer-events-none" />

        {/* Security Incident Icon */}
        <div className="relative mb-4 mt-1 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_4px_16px_rgba(239,68,68,0.15)]">
            <ShieldAlert className="w-8 h-8" />
          </div>
        </div>

        {/* Protocol Tag */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono font-semibold tracking-wider uppercase mb-2.5 mx-auto">
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span>INCIDENT #BH-SEC-403</span>
        </div>

        {/* Main Title */}
        <h2 className="text-lg font-bold tracking-tight text-white mb-1">
          {t('blockedTitle')}
        </h2>
        <span className="text-[11px] font-mono text-red-400 tracking-wider uppercase font-semibold mb-3">
          {t('blockedSubtitle')}
        </span>

        {/* Explanation text */}
        <p className="text-xs text-[#94A3B8] leading-relaxed mb-4 max-w-xs mx-auto">
          {t('blockedDesc')}
        </p>

        {/* Telemetry Record Inset */}
        <div className="w-full bg-[#0B0D14] rounded-xl p-3 border border-white/[0.06] mb-5 text-left font-mono text-[11px] space-y-1.5">
          <div className="flex justify-between items-center text-[#94A3B8]">
            <span>OPERATIVE:</span>
            <span className="text-white font-semibold">{userName}</span>
          </div>
          <div className="flex justify-between items-center text-[#94A3B8]">
            <span>TELEGRAM ID:</span>
            <span className="text-red-400 font-semibold">{tgId}</span>
          </div>
          <div className="flex justify-between items-center text-[#94A3B8]">
            <span>PERIMETER STATE:</span>
            <span className="text-red-400 font-bold tracking-wide">RESTRICTED // LOCKED</span>
          </div>
        </div>

        {/* Feedback message */}
        {checkResult && (
          <div className="mb-3 text-[11px] font-mono text-[#38E8FF]">
            {checkResult}
          </div>
        )}

        {/* Actions */}
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={handleOpenSupport}
            type="button"
            className="w-full py-3 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-semibold text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t('blockedContactSupport')}</span>
          </button>

          <button
            onClick={handleCheck}
            disabled={checking}
            type="button"
            className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[#CBD5E1] hover:text-white font-mono text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-[#38E8FF]' : ''}`} />
            <span>{checking ? 'VERIFYING...' : t('blockedCheckStatus')}</span>
          </button>
        </div>

        {/* Footer */}
        <span className="text-[9px] font-mono text-[#64748B] mt-4 uppercase tracking-wider">
          BlockHunt Security Perimeter Engine • v3.8
        </span>
      </div>
    </div>
  );
};
