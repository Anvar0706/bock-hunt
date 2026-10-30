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
      border: 'border-[#38E8FF]/20',
    },
    {
      icon: Cpu,
      title: t('step2Title'),
      desc: t('step2Desc'),
      color: 'text-[#22D3EE]',
      bg: 'bg-[#22D3EE]/10',
      border: 'border-[#22D3EE]/20',
    },
    {
      icon: KeyRound,
      title: t('step3Title'),
      desc: t('step3Desc'),
      color: 'text-[#00E676]',
      bg: 'bg-[#00E676]/10',
      border: 'border-[#00E676]/20',
    },
    {
      icon: Zap,
      title: t('step4Title'),
      desc: t('step4Desc'),
      color: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
      border: 'border-[#F59E0B]/20',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-lg animate-drawer-enter sm:animate-modal-3d">
        <div className="rounded-t-3xl sm:rounded-3xl border border-white/12 bg-[#12151F] shadow-[0_-12px_40px_rgba(0,0,0,0.9)] p-4 sm:p-5 relative overflow-hidden">
          {/* Top Drag Handle (Mobile Ergonomics) */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3 sm:hidden" />

          {/* Top hairline highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] shadow-[0_2px_8px_rgba(34,211,238,0.2)]">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold tracking-wider text-white uppercase font-mono-terminal">
                  {t('infoTitle')}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />
                  <span className="text-[10px] font-mono-terminal text-[#00E676] tracking-wider uppercase font-semibold">
                    {t('infoSubtitle')}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Steps List */}
          <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1 mb-4 terminal-scroll">
            {steps.map((step, idx) => {
              const IconComponent = step.icon;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl bg-[#0B0D14] border ${step.border} space-y-1`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-lg ${step.bg} border ${step.border} flex items-center justify-center ${step.color} shrink-0`}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <h4 className={`text-xs font-bold tracking-wide ${step.color}`}>
                      {step.title}
                    </h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#94A3B8] leading-relaxed pl-8">
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
            className="w-full py-3 rounded-xl button-dark-metal text-xs font-bold uppercase tracking-wider text-white cursor-pointer hover:border-[#22D3EE]/50 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
          >
            {t('infoUnderstood')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SimulationInfoModal = ProtocolArchitectureModal;
export const SystemArchitectureModal = ProtocolArchitectureModal;
