import React, { useState, useCallback } from 'react';
import {
  Globe,
  Terminal,
  KeyRound,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Layers,
  Zap,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface AppTourGuideProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled?: boolean;
}

export const AppTourGuide: React.FC<AppTourGuideProps> = ({
  isOpen,
  onClose,
  soundEnabled = true,
}) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const playTourBeep = useCallback(
    (freq = 640) => {
      if (!soundEnabled) return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } catch {}
    },
    [soundEnabled]
  );

  const triggerHaptic = useCallback(() => {
    try {
      (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { selectionChanged: () => void } } } })
        ?.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    } catch {}
  }, []);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      playTourBeep(720);
      triggerHaptic();
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      playTourBeep(520);
      triggerHaptic();
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    playTourBeep(960);
    triggerHaptic();
    try {
      localStorage.setItem('blockhunt_tour_completed', 'true');
    } catch {}
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/85 backdrop-blur-md animate-modal-backdrop select-none">
      {/* Outer Shell Modal */}
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0D111A] border border-white/15 p-5 sm:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.9)] overflow-hidden animate-modal-3d flex flex-col justify-between">
        {/* Top Glow Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#22D3EE] to-transparent pointer-events-none" />

        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
            <span className="text-[10px] font-mono-terminal font-bold uppercase tracking-widest text-[#38E8FF]">
              {t('tourBadge')}
            </span>
            <span className="text-white/20 font-mono text-[10px]">/</span>
            <span className="text-[10px] font-mono-terminal font-semibold text-[#94A3B8]">
              {String(currentStep).padStart(2, '0')} OF {String(totalSteps).padStart(2, '0')}
            </span>
          </div>

          <button
            onClick={handleComplete}
            type="button"
            className="w-7 h-7 rounded-xl flex items-center justify-center bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[#94A3B8] hover:text-white transition-all cursor-pointer active:scale-95"
            aria-label="Close Tour"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Step Content */}
        <div className="min-h-[220px] flex flex-col justify-center py-2">
          {/* STEP 1: BLOCKCHAIN NETWORKS */}
          {currentStep === 1 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#22D3EE]/10 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-mono-terminal text-[#38E8FF] uppercase tracking-wider font-semibold">
                    {t('tourStep1Badge')}
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                    {t('tourStep1Title')}
                  </h3>
                </div>
              </div>

              {/* Step 1 Visual Mock */}
              <div className="p-3 rounded-2xl bg-[#12151F] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono-terminal text-[#64748B]">
                  <span>SUPPORTED CLUSTERS</span>
                  <span className="text-[#38E8FF]">LIVE NODES</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 font-mono-terminal text-[10.5px]">
                  <div className="px-2 py-1.5 rounded-xl bg-white/[0.05] border border-[#22D3EE]/40 text-white flex items-center justify-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />
                    <span>TRON</span>
                  </div>
                  <div className="px-2 py-1.5 rounded-xl bg-white/[0.02] border border-white/10 text-[#94A3B8] flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                    <span>ETH</span>
                  </div>
                  <div className="px-2 py-1.5 rounded-xl bg-white/[0.02] border border-white/10 text-[#94A3B8] flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                    <span>SOL</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#94A3B8] leading-relaxed">
                {t('tourStep1Desc')}
              </p>
            </div>
          )}

          {/* STEP 2: LIVE TELEMETRY CONSOLE */}
          {currentStep === 2 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#00E676]/10 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] shrink-0 shadow-[0_0_15px_rgba(0,230,118,0.2)]">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-mono-terminal text-[#00E676] uppercase tracking-wider font-semibold">
                    {t('tourStep2Badge')}
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                    {t('tourStep2Title')}
                  </h3>
                </div>
              </div>

              {/* Step 2 Visual Mock */}
              <div className="p-3 rounded-2xl bg-[#0F131C] border border-white/10 space-y-1.5 font-mono-terminal text-[10px]">
                <div className="flex items-center justify-between text-[#64748B] border-b border-white/[0.06] pb-1">
                  <span className="text-[#38E8FF]">CONSOLE v3.8</span>
                  <span className="text-[#00E676] font-semibold">~14.2k keys/s</span>
                </div>
                <div className="text-slate-400 truncate flex items-center gap-1.5">
                  <span className="text-[8.5px] text-[#475569]">05:01:03</span>
                  <span className="text-[8.5px] text-[#38E8FF] px-1 rounded bg-white/[0.04]">TRC-20</span>
                  <span className="truncate text-slate-300">TYDzsY...Fz1h</span>
                  <span className="text-red-400 text-[8.5px] shrink-0">[DORMANT]</span>
                </div>
                <div className="text-[#22D3EE] flex items-center gap-1">
                  <span>&gt; STREAM: STANDBY // BIP-44 RESOLVED</span>
                </div>
              </div>

              <p className="text-xs text-[#94A3B8] leading-relaxed">
                {t('tourStep2Desc')}
              </p>
            </div>
          )}

          {/* STEP 3: TARGET COLLISION & VAULT */}
          {currentStep === 3 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-mono-terminal text-amber-400 uppercase tracking-wider font-semibold">
                    {t('tourStep3Badge')}
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                    {t('tourStep3Title')}
                  </h3>
                </div>
              </div>

              {/* Step 3 Visual Mock */}
              <div className="p-3 rounded-2xl bg-[#00E676]/10 border border-[#00E676]/30 space-y-1 font-mono-terminal text-[10px]">
                <div className="flex items-center justify-between text-[#00E676] font-bold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    KEY COLLISION VERIFIED
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#00E676]/20 text-[#00E676] text-[9px]">
                    $1,450.00 USDT
                  </span>
                </div>
                <div className="text-white text-[10.5px] font-semibold truncate">
                  Address: TYDzsYUEpvnYmQK4WKnEQsKzRxsPNmFz1h
                </div>
                <div className="text-[#94A3B8] text-[9px] truncate">
                  Key: 0x3a10••••••••••••••••••••••••••••••••••••••••••••••••f449
                </div>
              </div>

              <p className="text-xs text-[#94A3B8] leading-relaxed">
                {t('tourStep3Desc')}
              </p>
            </div>
          )}

          {/* STEP 4: INSTANT DISPATCH & TIERS */}
          {currentStep === 4 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#22D3EE]/10 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-mono-terminal text-[#38E8FF] uppercase tracking-wider font-semibold">
                    {t('tourStep4Badge')}
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                    {t('tourStep4Title')}
                  </h3>
                </div>
              </div>

              {/* Step 4 Visual Mock */}
              <div className="p-3 rounded-2xl bg-[#12151F] border border-white/10 space-y-2 font-mono-terminal text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">DISPATCH CLEARANCE</span>
                  <span className="text-[#00E676] font-bold">0.00% FEE</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#38E8FF]" />
                    <span className="text-white font-semibold">PRO MULTI-CHAIN</span>
                  </div>
                  <span className="text-[9px] text-[#38E8FF] font-bold">3x SPEED • NO QUEUES</span>
                </div>
              </div>

              <p className="text-xs text-[#94A3B8] leading-relaxed">
                {t('tourStep4Desc')}
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="pt-3 border-t border-white/10 space-y-3">
          {/* Step Indicator Dots */}
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentStep === idx + 1
                    ? 'w-6 bg-[#22D3EE] shadow-[0_0_8px_#22D3EE]'
                    : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                onClick={handlePrev}
                type="button"
                className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#CBD5E1] hover:text-white transition-all cursor-pointer active:scale-95 flex items-center gap-1 shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{t('tourPrev')}</span>
              </button>
            )}

            <button
              onClick={handleNext}
              type="button"
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs font-mono-terminal uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-lg ${
                currentStep === totalSteps
                  ? 'bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00C853] hover:to-[#00B048] text-black shadow-[0_4px_16px_rgba(0,230,118,0.3)]'
                  : 'bg-gradient-to-r from-[#22D3EE] to-[#0EA5E9] hover:from-[#38E8FF] hover:to-[#0284C7] text-black shadow-[0_4px_16px_rgba(34,211,238,0.25)]'
              }`}
            >
              <span>{currentStep === totalSteps ? t('tourFinish') : t('tourNext')}</span>
              <ChevronRight className="w-3.5 h-3.5 text-black" />
            </button>
          </div>

          {/* Subtle Skip Link */}
          {currentStep < totalSteps && (
            <div className="text-center pt-0.5">
              <button
                onClick={handleComplete}
                type="button"
                className="text-[10px] font-mono-terminal text-[#64748B] hover:text-[#94A3B8] transition-colors cursor-pointer"
              >
                {t('tourSkip')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
