import React from 'react';
import { X, Cpu, Layers, KeyRound, Zap } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export interface ProtocolArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type SimulationInfoModalProps = ProtocolArchitectureModalProps;

export const ProtocolArchitectureModal: React.FC<ProtocolArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const steps = [
    {
      icon: Layers,
      title: t('step1Title'),
      desc: t('step1Desc'),
      color: 'text-[#38E8FF]',
      bg: 'bg-[#38E8FF]/10',
      border: 'border-[#38E8FF]/25',
    },
    {
      icon: Cpu,
      title: t('step2Title'),
      desc: t('step2Desc'),
      color: 'text-[#22D3EE]',
      bg: 'bg-[#22D3EE]/10',
      border: 'border-[#22D3EE]/25',
    },
    {
      icon: KeyRound,
      title: t('step3Title'),
      desc: t('step3Desc'),
      color: 'text-[#00E676]',
      bg: 'bg-[#00E676]/10',
      border: 'border-[#00E676]/25',
    },
    {
      icon: Zap,
      title: t('step4Title'),
      desc: t('step4Desc'),
      color: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
      border: 'border-[#F59E0B]/25',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg animate-modal-3d">
        <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-b from-[#22D3EE]/50 via-white/10 to-black/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)]">
          <div className="glass-panel-3d rounded-3xl p-4 sm:p-5 relative overflow-hidden bg-[#12141F]">
            {/* Top neon glow line */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#38E8FF]/80 to-transparent pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.25)]">
                  <Cpu className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold tracking-wider text-white">
                    {t('infoTitle')}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-ping" />
                    <span className="text-[10px] font-mono text-[#00E676] tracking-wider uppercase font-semibold">
                      {t('infoSubtitle')}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Steps List */}
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 mb-4 custom-scrollbar">
              {steps.map((step, idx) => {
                const IconComponent = step.icon;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl bg-black/40 border ${step.border} space-y-1.5 transition-all hover:bg-black/60`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg ${step.bg} border ${step.border} flex items-center justify-center ${step.color} shrink-0`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <h4 className={`text-xs font-bold tracking-wide ${step.color}`}>
                        {step.title}
                      </h4>
                    </div>
                    <p className="text-[11px] sm:text-xs text-[#9CA3AF] leading-relaxed pl-9">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Action button */}
            <button
              onClick={onClose}
              type="button"
              className="w-full py-3 rounded-2xl button-dark-metal text-xs font-bold uppercase tracking-wider text-white cursor-pointer hover:border-[#22D3EE]/50 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
            >
              {t('infoUnderstood')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SimulationInfoModal = ProtocolArchitectureModal;
export const SystemArchitectureModal = ProtocolArchitectureModal;
