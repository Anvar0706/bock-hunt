import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe,
  Terminal,
  KeyRound,
  Zap,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
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
  badgeUz: string;
  titleEn: string;
  titleRu: string;
  titleUz: string;
  descEn: string;
  descRu: string;
  descUz: string;
  preferredDock: 'bottom' | 'top';
  icon: React.ElementType;
}

// 4-step natural visual progression from top to bottom
const TOUR_STEPS: StepConfig[] = [
  {
    targetId: 'tour-wallet-cards',
    badgeEn: 'DISCOVERY VAULT',
    badgeRu: 'ХРАНИЛИЩЕ ЦЕЛЕЙ',
    badgeUz: 'TOPILMALAR OMBORI',
    titleEn: 'Discovered Wallets & Key Vault',
    titleRu: 'Обнаруженные кошельки и хранилище',
    titleUz: 'Topilgan Hamyonlar va Kalitlar',
    descEn: 'Discovered non-zero balance collisions and extracted private keys unlock automatically in this secure vault.',
    descRu: 'Здесь автоматически отображаются найденные приватные ключи и кошельки с положительным балансом криптовалюты.',
    descUz: 'Skanning davomida topilgan xususiy kalitlar va balansga ega bo\'lgan hamyonlar avtomatik tarzda shu yerda ochiladi.',
    preferredDock: 'bottom',
    icon: KeyRound,
  },
  {
    targetId: 'tour-terminal-console',
    badgeEn: 'LIVE TELEMETRY MATRIX',
    badgeRu: 'ТЕЛЕМЕТРИЯ СКАНИРОВАНИЯ',
    badgeUz: 'JONLI TELEMETRIYA KONSOLI',
    titleEn: 'Cryptographic Permutation Console',
    titleRu: 'Консоль криптографического кластера',
    titleUz: 'Kriptografik Skaner Konsoli',
    descEn: 'Monitor real-time SECP256K1 & BIP-44 key permutations, mempool cluster state, and live keys/sec scanning throughput.',
    descRu: 'Отслеживайте в реальном времени перебор ключей SECP256K1 и BIP-44, состояние узлов кластера и скорость сканирования (keys/sec).',
    descUz: 'SECP256K1 va BIP-44 entropiya oqimi, klaster holati va har soniyadagi skan tezligini (keys/sec) real vaqtda kuzating.',
    preferredDock: 'bottom',
    icon: Terminal,
  },
  {
    targetId: 'tour-network-selector',
    badgeEn: 'TARGET BLOCKCHAINS',
    badgeRu: 'ВЫБОР СЕТЕЙ',
    badgeUz: 'BLOKCHEYN TARMOQLARI',
    titleEn: 'Multi-Chain Mempool Selection',
    titleRu: 'Выбор сетей для поиска',
    titleUz: 'Target Tarmoqlarini Tanlash',
    descEn: 'Select TRON, Ethereum, or Solana networks. Community tier scans 1 chain; upgrade to PRO to hunt across all 3 in parallel.',
    descRu: 'Выбирайте сети TRON, Ethereum или Solana. В тарифе Community доступен поиск по 1 сети; на PRO открывается параллельный 3x поиск.',
    descUz: 'TRON, Ethereum yoki Solana tarmoqlarini tanlang. Community tarifida 1 ta, PRO tarifida esa barcha 3 ta tarmoqda parallel skan qilinadi.',
    preferredDock: 'top',
    icon: Globe,
  },
  {
    targetId: 'tour-scan-cta',
    badgeEn: 'EXECUTE SECURITY SCAN',
    badgeRu: 'ЗАПУСК СКАНИРОВАНИЯ',
    badgeUz: 'SKANNI ISHGA TUSHIRISH',
    titleEn: 'Commence Mempool Extraction',
    titleRu: 'Запуск сканирования мемпула',
    titleUz: 'Mempool Skanerini Boshlash',
    descEn: 'Tap here to establish an encrypted tunnel and commence real-time key collision scanning across your selected networks.',
    descRu: 'Нажмите эту кнопку, чтобы инициализировать защищенный туннель и начать поиск ключей по выбранным сетям.',
    descUz: 'Shifrlangan tunnel orqali real vaqtdagi entropiya qidiruvini ishga tushirish uchun ushbu tugmani bosing.',
    preferredDock: 'top',
    icon: Zap,
  },
];

export const AppTourGuide: React.FC<AppTourGuideProps> = ({
  isOpen,
  onClose,
  soundEnabled = true,
}) => {
  const { language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const totalSteps = TOUR_STEPS.length;
  const activeStepConfig = TOUR_STEPS[currentStep - 1];
  const rafIdRef = useRef<number | null>(null);

  // Futuristic audio chimes (Web Audio API)
  const playTourBeep = useCallback(
    (startFreq = 580, endFreq = 780) => {
      if (!soundEnabled) return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } catch {}
    },
    [soundEnabled]
  );

  // Telegram Haptic feedback
  const triggerHaptic = useCallback((type: 'step' | 'finish' = 'step') => {
    try {
      const tgHaptic = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { selectionChanged: () => void; notificationOccurred: (type: string) => void } } } })
        ?.Telegram?.WebApp?.HapticFeedback;
      if (tgHaptic) {
        if (type === 'finish') {
          tgHaptic.notificationOccurred('success');
        } else {
          tgHaptic.selectionChanged();
        }
      }
    } catch {}
  }, []);

  // Compute bounding box with safe padding and boundary limits
  const computeTargetRect = useCallback(() => {
    if (!isOpen || !activeStepConfig) return null;
    const el = document.getElementById(activeStepConfig.targetId);
    if (!el) return null;

    const r = el.getBoundingClientRect();
    const padding = 6;
    const padTop = Math.max(0, r.top - padding);
    const padLeft = Math.max(0, r.left - padding);
    const padWidth = Math.min(window.innerWidth - padLeft, r.width + padding * 2);

    // Height clamping ensures spotlight never overlaps the docked card
    const maxVisibleHeight = activeStepConfig.preferredDock === 'bottom'
      ? Math.max(120, window.innerHeight - 270 - padTop)
      : Math.min(r.height + padding * 2, window.innerHeight - 280);

    const padHeight = Math.min(r.height + padding * 2, maxVisibleHeight);

    return {
      top: padTop,
      left: padLeft,
      width: padWidth,
      height: padHeight,
    };
  }, [isOpen, activeStepConfig]);

  const updateTargetRect = useCallback(() => {
    const rect = computeTargetRect();
    setTargetRect(rect);
  }, [computeTargetRect]);

  // Synchronized scrolling: positions the target element cleanly so the docked card NEVER collides
  useEffect(() => {
    if (!isOpen || !activeStepConfig) return;

    const el = document.getElementById(activeStepConfig.targetId);
    if (el) {
      const currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      const elPageTop = currentScrollY + el.getBoundingClientRect().top;

      if (activeStepConfig.preferredDock === 'bottom') {
        // Target in upper screen area (room below for card)
        const targetScroll = Math.max(0, elPageTop - 65);
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      } else {
        // Target in lower screen area (room above for card)
        const targetScroll = Math.max(0, elPageTop - 250);
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }

    // Continuously follow target rect through the entire 500ms smooth scroll animation
    const startTime = performance.now();
    const trackLoop = () => {
      updateTargetRect();
      if (performance.now() - startTime < 550) {
        rafIdRef.current = requestAnimationFrame(trackLoop);
      }
    };
    rafIdRef.current = requestAnimationFrame(trackLoop);

    const handleScrollOrResize = () => updateTargetRect();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, currentStep, activeStepConfig, updateTargetRect]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      playTourBeep(580, 780);
      triggerHaptic('step');
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      playTourBeep(680, 480);
      triggerHaptic('step');
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    playTourBeep(880, 1046);
    triggerHaptic('finish');
    try {
      localStorage.setItem('blockhunt_tour_completed', 'true');
    } catch {}
    onClose();
  };

  if (!isOpen) return null;

  // Localized strings
  const isRussian = language === 'ru';

  const badgeText = isRussian
    ? activeStepConfig.badgeRu
    : activeStepConfig.badgeEn;

  const titleText = isRussian
    ? activeStepConfig.titleRu
    : activeStepConfig.titleEn;

  const descText = isRussian
    ? activeStepConfig.descRu
    : activeStepConfig.descEn;

  const IconComponent = activeStepConfig.icon;
  const isDockBottom = activeStepConfig.preferredDock === 'bottom';

  // Localized button and indicator labels
  const labelNext = isRussian ? 'Далее' : 'Next';
  const labelPrev = isRussian ? 'Назад' : 'Back';
  const labelFinish = isRussian ? 'Начать поиск' : 'Launch Hunter';
  const labelSkip = isRussian ? 'Пропустить' : 'Skip';
  const labelActiveBeacon = isRussian ? 'АКТИВНАЯ ЗОНА' : 'ACTIVE TARGET';

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none">
      {/* Dimmed Interactive Backdrop Cutout (SVG) */}
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

        {/* Dark Dimmed Backdrop with smooth mask */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(5, 7, 12, 0.82)"
          mask="url(#tour-spotlight-mask)"
        />

        {/* Illuminated High-Tech Cutout Framing */}
        {targetRect && (
          <>
            {/* Glowing neon dashed frame */}
            <rect
              x={targetRect.left}
              y={targetRect.top}
              width={targetRect.width}
              height={targetRect.height}
              rx="16"
              fill="none"
              stroke="#22D3EE"
              strokeWidth="2"
              strokeDasharray="8 4"
              className="animate-pulse shadow-[0_0_24px_rgba(34,211,238,0.7)]"
            />

            {/* Sci-Fi Target Bracket Accents on 4 Corners */}
            <g stroke="#38E8FF" strokeWidth="2.5" fill="none" strokeLinecap="round">
              {/* Top-Left */}
              <path d={`M ${targetRect.left + 4} ${targetRect.top + 16} L ${targetRect.left + 4} ${targetRect.top + 4} L ${targetRect.left + 16} ${targetRect.top + 4}`} />
              {/* Top-Right */}
              <path d={`M ${targetRect.left + targetRect.width - 16} ${targetRect.top + 4} L ${targetRect.left + targetRect.width - 4} ${targetRect.top + 4} L ${targetRect.left + targetRect.width - 4} ${targetRect.top + 16}`} />
              {/* Bottom-Left */}
              <path d={`M ${targetRect.left + 4} ${targetRect.top + targetRect.height - 16} L ${targetRect.left + 4} ${targetRect.top + targetRect.height - 4} L ${targetRect.left + 16} ${targetRect.top + targetRect.height - 4}`} />
              {/* Bottom-Right */}
              <path d={`M ${targetRect.left + targetRect.width - 16} ${targetRect.top + targetRect.height - 4} L ${targetRect.left + targetRect.width - 4} ${targetRect.top + targetRect.height - 4} L ${targetRect.left + targetRect.width - 4} ${targetRect.top + targetRect.height - 16}`} />
            </g>
          </>
        )}
      </svg>

      {/* 4 Interactive Backdrop Click Catchers (allowing clicks inside the cutout to pass to real UI) */}
      {targetRect ? (
        <>
          {/* Top backdrop area */}
          <div
            onClick={handleNext}
            style={{ top: 0, left: 0, right: 0, height: `${targetRect.top}px` }}
            className="fixed z-40 pointer-events-auto bg-transparent cursor-pointer"
            aria-hidden="true"
          />
          {/* Bottom backdrop area */}
          <div
            onClick={handleNext}
            style={{ top: `${targetRect.top + targetRect.height}px`, left: 0, right: 0, bottom: 0 }}
            className="fixed z-40 pointer-events-auto bg-transparent cursor-pointer"
            aria-hidden="true"
          />
          {/* Left backdrop area */}
          <div
            onClick={handleNext}
            style={{ top: `${targetRect.top}px`, left: 0, width: `${targetRect.left}px`, height: `${targetRect.height}px` }}
            className="fixed z-40 pointer-events-auto bg-transparent cursor-pointer"
            aria-hidden="true"
          />
          {/* Right backdrop area */}
          <div
            onClick={handleNext}
            style={{
              top: `${targetRect.top}px`,
              left: `${targetRect.left + targetRect.width}px`,
              right: 0,
              height: `${targetRect.height}px`,
            }}
            className="fixed z-40 pointer-events-auto bg-transparent cursor-pointer"
            aria-hidden="true"
          />
        </>
      ) : (
        <div
          onClick={handleNext}
          className="fixed inset-0 z-40 pointer-events-auto bg-transparent cursor-pointer"
          aria-hidden="true"
        />
      )}

      {/* Guaranteed Non-Overlapping Docked Interactive Card */}
      <div
        style={{
          position: 'fixed',
          left: '16px',
          right: '16px',
          maxWidth: '420px',
          marginLeft: 'auto',
          marginRight: 'auto',
          ...(isDockBottom ? { bottom: '82px' } : { top: '66px' }),
        }}
        className="z-50 pointer-events-auto transition-all duration-300 ease-out animate-fadeIn"
      >
        <div className="rounded-3xl bg-[#0B0F17]/95 border border-[#22D3EE]/40 p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl relative overflow-hidden">
          {/* Top glowing hairline border */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#22D3EE] to-transparent pointer-events-none" />

          {/* Header row */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse shrink-0" />
              <span className="text-[10px] font-mono-terminal font-bold uppercase tracking-wider text-[#38E8FF] truncate">
                {badgeText}
              </span>
              <span className="text-white/20 font-mono text-[10px] shrink-0">/</span>
              <span className="text-[10px] font-mono-terminal font-semibold text-[#94A3B8] shrink-0">
                {String(currentStep).padStart(2, '0')}/{String(totalSteps).padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleComplete}
                type="button"
                className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/10 text-[10px] font-mono-terminal text-[#94A3B8] hover:text-white transition-all cursor-pointer"
              >
                {labelSkip}
              </button>
              <button
                onClick={handleComplete}
                type="button"
                className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/10 text-[#94A3B8] hover:text-white transition-all cursor-pointer active:scale-95"
                aria-label="Close Tour"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex items-start gap-3 my-2">
            <div className="w-10 h-10 rounded-2xl bg-[#22D3EE]/10 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] shrink-0 shadow-[0_0_14px_rgba(34,211,238,0.25)]">
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                {titleText}
              </h4>
              <p className="text-[11.5px] text-[#94A3B8] leading-relaxed pt-1 font-sans">
                {descText}
              </p>
            </div>
          </div>

          {/* Directional Beacon Tag (pointing towards highlighted target without overlapping) */}
          <div className="flex items-center gap-1.5 py-1 px-2 mb-2 rounded-lg bg-[#22D3EE]/[0.06] border border-[#22D3EE]/15 w-fit">
            <span className="text-[9px] font-mono-terminal text-[#38E8FF] font-semibold">
              {isDockBottom ? '▲' : '▼'} {labelActiveBeacon}
            </span>
          </div>

          {/* Controls Footer */}
          <div className="pt-2.5 mt-1 border-t border-white/10 flex items-center justify-between gap-2">
            {/* Interactive Step Dots */}
            <div className="flex items-center gap-1.5 shrink-0">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    playTourBeep(580, 780);
                    triggerHaptic('step');
                    setCurrentStep(idx + 1);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    currentStep === idx + 1
                      ? 'w-6 bg-[#22D3EE] shadow-[0_0_8px_#22D3EE]'
                      : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                  aria-label={`Step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {currentStep > 1 && (
                <button
                  onClick={handlePrev}
                  type="button"
                  className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-[#CBD5E1] hover:text-white transition-all cursor-pointer active:scale-95 flex items-center gap-0.5 font-mono-terminal"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>{labelPrev}</span>
                </button>
              )}

              <button
                onClick={handleNext}
                type="button"
                className={`py-1.5 px-3.5 rounded-xl font-bold text-[11px] font-mono-terminal uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1 shadow-md ${
                  currentStep === totalSteps
                    ? 'bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00C853] hover:to-[#00B048] text-black shadow-[0_2px_12px_rgba(0,230,118,0.35)]'
                    : 'bg-gradient-to-r from-[#22D3EE] to-[#0EA5E9] hover:from-[#38E8FF] hover:to-[#0284C7] text-black shadow-[0_2px_12px_rgba(34,211,238,0.3)]'
                }`}
              >
                {currentStep === totalSteps ? (
                  <>
                    <Sparkles className="w-3 h-3 text-black" />
                    <span>{labelFinish}</span>
                  </>
                ) : (
                  <>
                    <span>{labelNext}</span>
                    <ChevronRight className="w-3 h-3 text-black" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
