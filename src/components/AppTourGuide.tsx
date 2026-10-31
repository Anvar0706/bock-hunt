import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe,
  Terminal,
  KeyRound,
  Zap,
  ChevronRight,
  ChevronLeft,
  X,
  Compass,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface AppTourGuideProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled?: boolean;
}

interface StepConfig {
  targetId: string;
  badgeEn: string;
  badgeRu: string;
  titleEn: string;
  titleRu: string;
  descEn: string;
  descRu: string;
  preferredPosition: 'top' | 'bottom';
  icon: React.ElementType;
}

const TOUR_STEPS: StepConfig[] = [
  {
    targetId: 'tour-network-selector',
    badgeEn: 'TARGET NETWORKS',
    badgeRu: 'ВЫБОР СЕТЕЙ',
    titleEn: 'Select Blockchain Networks',
    titleRu: 'Выбор блокчейн-сетей',
    descEn: 'Select TRON, Ethereum, or Solana mempool chains. Community tier searches 1 chain; upgrade to PRO to scan all 3 simultaneously in parallel.',
    descRu: 'Выбирайте мемпулы TRON, Ethereum или Solana. В тарифе Community доступен поиск по 1 сети; на тарифе PRO открывается параллельное 3x сканирование.',
    preferredPosition: 'top',
    icon: Globe,
  },
  {
    targetId: 'tour-terminal-console',
    badgeEn: 'TELEMETRY CONSOLE',
    badgeRu: 'КОНСОЛЬ ТЕЛЕМЕТРИИ',
    titleEn: 'Live Mempool Telemetry Console',
    titleRu: 'Консоль телеметрии мемпула',
    descEn: 'Monitor real-time SECP256K1 & BIP-44 key permutations, mempool node status, and live cryptographic keys/sec throughput.',
    descRu: 'Наблюдайте в реальном времени за перебором энтропии ключей SECP256K1 и BIP-44, состоянием узлов кластера и скоростью сканирования.',
    preferredPosition: 'bottom',
    icon: Terminal,
  },
  {
    targetId: 'tour-wallet-cards',
    badgeEn: 'DISCOVERY VAULT',
    badgeRu: 'ХРАНИЛИЩЕ ЦЕЛЕЙ',
    titleEn: 'Target Discovery & Key Vault',
    titleRu: 'Обнаружение целей и хранилище',
    descEn: 'Track discovered addresses and private keys. When non-zero balance collisions are found, target wallets unlock immediately in your vault.',
    descRu: 'Отслеживайте найденные адреса и приватные ключи. При обнаружении коллизий с ненулевым балансом кошелек мгновенно открывается в хранилище.',
    preferredPosition: 'bottom',
    icon: KeyRound,
  },
  {
    targetId: 'tour-scan-cta',
    badgeEn: 'EXECUTE SCAN',
    badgeRu: 'ЗАПУСК СКАНИРОВАНИЯ',
    titleEn: 'Commence Security Extraction',
    titleRu: 'Запуск сканирования',
    descEn: 'Tap here to initialize the encrypted tunnel and commence real-time mempool scanning across your selected networks.',
    descRu: 'Нажмите здесь, чтобы инициализировать защищенный туннель и начать поиск коллизий по выбранным сетям.',
    preferredPosition: 'top',
    icon: Zap,
  },
];

export const AppTourGuide: React.FC<AppTourGuideProps> = ({
  isOpen,
  onClose,
  soundEnabled = true,
}) => {
  const { language, t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const totalSteps = TOUR_STEPS.length;
  const activeStepConfig = TOUR_STEPS[currentStep - 1];
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Update target rect on step change or window resize/scroll
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !activeStepConfig) return;
    const el = document.getElementById(activeStepConfig.targetId);
    if (el) {
      const r = el.getBoundingClientRect();
      const padding = 6;
      setTargetRect({
        top: Math.max(0, r.top - padding),
        left: Math.max(0, r.left - padding),
        width: Math.min(window.innerWidth, r.width + padding * 2),
        height: r.height + padding * 2,
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, activeStepConfig]);

  useEffect(() => {
    if (!isOpen) return;

    // Scroll active element into center view smoothly
    const el = document.getElementById(activeStepConfig.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Short delay to let smooth scroll settle before anchoring rect
      scrollTimeoutRef.current = setTimeout(() => {
        updateTargetRect();
      }, 160);
    } else {
      updateTargetRect();
    }

    const handleScrollOrResize = () => {
      updateTargetRect();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, currentStep, activeStepConfig, updateTargetRect]);

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

  // Compute tooltip card placement
  const isRussian = language === 'ru';
  const badgeText = isRussian ? activeStepConfig.badgeRu : activeStepConfig.badgeEn;
  const titleText = isRussian ? activeStepConfig.titleRu : activeStepConfig.titleEn;
  const descText = isRussian ? activeStepConfig.descRu : activeStepConfig.descEn;
  const IconComponent = activeStepConfig.icon;

  // Decide if card should sit above or below the spotlight
  const fitsBelow = targetRect ? targetRect.top + targetRect.height + 240 < window.innerHeight : true;
  const placeBelow = activeStepConfig.preferredPosition === 'bottom' ? fitsBelow : !fitsBelow;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none">
      {/* SVG Spotlight Mask */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-40">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Dark Dimmed Backdrop */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(5, 7, 12, 0.84)"
          mask="url(#tour-spotlight-mask)"
        />

        {/* Illuminated High-Tech Cutout Border */}
        {targetRect && (
          <rect
            x={targetRect.left}
            y={targetRect.top}
            width={targetRect.width}
            height={targetRect.height}
            rx="16"
            fill="none"
            stroke="#22D3EE"
            strokeWidth="2"
            strokeDasharray="6 3"
            className="animate-pulse shadow-[0_0_20px_#22D3EE]"
          />
        )}
      </svg>

      {/* Click-through backdrop dismiss layer */}
      <div
        onClick={handleNext}
        className="fixed inset-0 z-40 pointer-events-auto bg-transparent"
        aria-hidden="true"
      />

      {/* Floating Anchored Interactive Tooltip Card */}
      <div
        style={{
          position: 'fixed',
          left: '16px',
          right: '16px',
          ...(targetRect
            ? placeBelow
              ? { top: `${Math.min(window.innerHeight - 250, targetRect.top + targetRect.height + 12)}px` }
              : { bottom: `${Math.min(window.innerHeight - 80, window.innerHeight - targetRect.top + 12)}px` }
            : { top: '50%', transform: 'translateY(-50%)' }),
        }}
        className="max-w-sm mx-auto z-50 pointer-events-auto transition-all duration-300 ease-out animate-fadeIn"
      >
        <div className="rounded-3xl bg-[#0D111A]/95 border border-[#22D3EE]/40 p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl relative overflow-hidden">
          {/* Top Hairline Glowing Gradient */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#22D3EE] to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
              <span className="text-[10px] font-mono-terminal font-bold uppercase tracking-wider text-[#38E8FF]">
                {badgeText}
              </span>
              <span className="text-white/20 font-mono text-[10px]">/</span>
              <span className="text-[10px] font-mono-terminal font-semibold text-[#94A3B8]">
                {String(currentStep).padStart(2, '0')}/{String(totalSteps).padStart(2, '0')}
              </span>
            </div>

            <button
              onClick={handleComplete}
              type="button"
              className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/10 text-[#94A3B8] hover:text-white transition-all cursor-pointer active:scale-95"
              aria-label="Close Tour"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex items-start gap-3 my-2">
            <div className="w-10 h-10 rounded-2xl bg-[#22D3EE]/10 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                {titleText}
              </h4>
              <p className="text-[11.5px] text-[#94A3B8] leading-relaxed pt-1">
                {descText}
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="pt-3 mt-1 border-t border-white/10 flex items-center justify-between gap-2">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5 shrink-0">
              {TOUR_STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentStep === idx + 1
                      ? 'w-5 bg-[#22D3EE] shadow-[0_0_6px_#22D3EE]'
                      : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {currentStep > 1 && (
                <button
                  onClick={handlePrev}
                  type="button"
                  className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-[#CBD5E1] hover:text-white transition-all cursor-pointer active:scale-95 flex items-center gap-0.5"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>{t('tourPrev')}</span>
                </button>
              )}

              <button
                onClick={handleNext}
                type="button"
                className={`py-1.5 px-3.5 rounded-xl font-bold text-[11px] font-mono-terminal uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1 shadow-md ${
                  currentStep === totalSteps
                    ? 'bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00C853] hover:to-[#00B048] text-black shadow-[0_2px_10px_rgba(0,230,118,0.3)]'
                    : 'bg-gradient-to-r from-[#22D3EE] to-[#0EA5E9] hover:from-[#38E8FF] hover:to-[#0284C7] text-black shadow-[0_2px_10px_rgba(34,211,238,0.25)]'
                }`}
              >
                <span>{currentStep === totalSteps ? t('tourFinish') : t('tourNext')}</span>
                <ChevronRight className="w-3 h-3 text-black" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
