import React, { useState } from 'react';
import { ShieldAlert, Lock, RefreshCw, Send, AlertTriangle } from 'lucide-react';
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
      setCheckResult('Status verified with security server.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0609]/95 backdrop-blur-xl select-none">
      {/* Background Cyber Ambient Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#FF0055]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#FF1744]/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Cyber Frame */}
      <div className="relative w-full max-w-md rounded-3xl p-[1.5px] bg-gradient-to-b from-[#FF1744] via-[#FF0055]/30 to-black shadow-[0_20px_50px_rgba(255,0,85,0.25)] flex flex-col overflow-hidden animate-modal-3d">
        <div className="rounded-3xl p-6 bg-[#12080D]/95 border border-[#FF1744]/20 flex flex-col items-center text-center relative overflow-hidden">
          
          {/* Top warning line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF1744] to-transparent" />

          {/* Security Icon Badge */}
          <div className="relative mb-5 mt-2">
            <div className="w-20 h-20 rounded-2xl bg-[#FF1744]/10 border border-[#FF1744]/40 flex items-center justify-center text-[#FF2A55] shadow-[0_0_25px_rgba(255,23,68,0.35)] relative">
              <ShieldAlert className="w-10 h-10 animate-pulse" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FF1744] text-white flex items-center justify-center shadow-[0_0_8px_#FF1744]">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Protocol Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF1744]/15 border border-[#FF1744]/30 text-[#FF5252] text-[10px] font-mono font-bold tracking-widest uppercase mb-3">
            <AlertTriangle className="w-3 h-3 text-[#FF1744]" />
            <span>{t('blockedProtocolCode')}</span>
          </div>

          {/* Main Title */}
          <h2 className="text-xl font-black tracking-wider text-white mb-1.5 drop-shadow-[0_2px_8px_rgba(255,23,68,0.4)]">
            {t('blockedTitle')}
          </h2>
          <span className="text-[11px] font-mono text-[#FF5252] tracking-widest uppercase font-semibold mb-4">
            {t('blockedSubtitle')}
          </span>

          {/* Explanation text */}
          <p className="text-xs text-[#CBD5E1] leading-relaxed mb-5 max-w-xs font-sans">
            {t('blockedDesc')}
          </p>

          {/* Session details card */}
          <div className="w-full bg-black/60 rounded-2xl p-3.5 border border-[#FF1744]/20 mb-6 text-left font-mono text-[11px] space-y-1.5">
            <div className="flex justify-between items-center text-[#94A3B8]">
              <span>OPERATIVE:</span>
              <span className="text-white font-bold">{userName}</span>
            </div>
            <div className="flex justify-between items-center text-[#94A3B8]">
              <span>TELEGRAM ID:</span>
              <span className="text-[#FF5252] font-semibold">{tgId}</span>
            </div>
            <div className="flex justify-between items-center text-[#94A3B8]">
              <span>STATUS:</span>
              <span className="text-[#FF1744] font-bold tracking-wide">RESTRICTED / LOCKED</span>
            </div>
          </div>

          {/* Feedback message */}
          {checkResult && (
            <div className="mb-3 text-[11px] font-mono text-[#38E8FF] animate-fade-in">
              {checkResult}
            </div>
          )}

          {/* Actions */}
          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={handleOpenSupport}
              type="button"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF1744] to-[#FF0055] hover:brightness-110 text-white font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,23,68,0.4)] transition-all cursor-pointer active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              <span>{t('blockedContactSupport')}</span>
            </button>

            <button
              onClick={handleCheck}
              disabled={checking}
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#CBD5E1] hover:text-white font-mono text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-[#38E8FF]' : ''}`} />
              <span>{checking ? 'VERIFYING...' : t('blockedCheckStatus')}</span>
            </button>
          </div>

          {/* Security Notice */}
          <span className="text-[9px] font-mono text-[#64748B] mt-5 uppercase tracking-wider">
            BlockHunt Security Perimeter Engine • v3.8
          </span>
        </div>
      </div>
    </div>
  );
};
