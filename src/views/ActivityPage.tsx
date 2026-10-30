import React from 'react';
import type { ExtractionScan, DemoScan, Network } from '../types';
import { Zap, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface ActivityPageProps {
  scans: ExtractionScan[] | DemoScan[];
  onClearHistory: () => void;
}

export const ActivityPage: React.FC<ActivityPageProps> = ({
  scans,
  onClearHistory,
}) => {
  const { t } = useLanguage();
  const [visibleCount, setVisibleCount] = React.useState(10);
  const displayedScans = React.useMemo(() => scans.slice(0, visibleCount), [scans, visibleCount]);

  return (
    <div className="w-full px-4 pb-32 animate-fadeIn select-none">
      {/* Page Title & Controls */}
      <div className="flex items-center justify-between mb-4 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] shadow-[0_2px_8px_rgba(34,211,238,0.2)]">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-wider text-white uppercase font-mono-terminal">
              {t('activityAudit')}
            </h2>
            <span className="text-[10px] font-mono-terminal text-[#64748B] tracking-wider uppercase font-semibold">
              {t('telemetryHistory')}
            </span>
          </div>
        </div>

        {scans.length > 0 && (
          <button
            onClick={onClearHistory}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-xs font-semibold text-[#94A3B8] hover:text-[#EF4444] transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('clearLogs')}</span>
          </button>
        )}
      </div>

      {/* Scans List */}
      {scans.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl p-8 text-center my-6 border border-white/10 bg-[#0E121B]">
          <div className="w-10 h-10 rounded-xl mx-auto bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#64748B] mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1 font-mono-terminal">
            {t('noScansYet')}
          </h3>
          <p className="text-xs text-[#64748B] max-w-xs mx-auto">
            {t('activityEmptyDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedScans.map((scan) => (
            <div
              key={scan.id}
              className="rounded-2xl p-4 relative overflow-hidden transition-all duration-150 border border-white/10 bg-[#12151F] hover:border-white/20"
            >
              {/* Top hairline accent */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

              {/* Header row */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-terminal font-bold text-white tracking-wider">
                    {scan.scanNumber}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />
                  <span className="text-[11px] text-[#64748B] font-medium font-mono-terminal">
                    {scan.startedAt}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00E676]/10 border border-[#00E676]/30 text-[9.5px] font-mono-terminal font-bold text-[#00E676]">
                  <CheckCircle className="w-3 h-3" />
                  <span>{scan.status === 'COMPLETED' ? t('statusCompleted') : t('statusAborted')}</span>
                </div>
              </div>

              {/* Network badges */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {scan.networks.map((net: Network) => (
                  <span
                    key={net}
                    className="px-2 py-0.5 rounded-lg text-[9.5px] font-mono-terminal font-semibold bg-white/[0.04] border border-white/[0.08] text-[#94A3B8]"
                  >
                    {net === 'ETHEREUM' ? 'Ethereum (ERC-20)' : net === 'TRON' ? 'TRON (TRC-20)' : 'Solana (SOL)'}
                  </span>
                ))}
              </div>

              {/* Stats Inset Well */}
              <div className="grid grid-cols-3 gap-2 bg-[#0B0D14] rounded-xl p-2.5 border border-white/[0.04] text-center font-mono-terminal">
                <div>
                  <span className="text-[9px] text-[#64748B] uppercase block">
                    {t('recordsScanned')}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {scan.recordsScanned.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-[#64748B] uppercase block">
                    {t('targetsLocated')}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      scan.matches > 0 ? 'text-[#00E676]' : 'text-[#64748B]'
                    }`}
                  >
                    {scan.matches}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-[#64748B] uppercase block">
                    {t('stateLabel')}
                  </span>
                  <span className="text-xs font-bold text-[#38E8FF]">
                    {t('stateSync')}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {scans.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((prev) => prev + 10)}
              type="button"
              className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[#94A3B8] hover:text-white font-mono-terminal text-xs uppercase tracking-wider transition-colors mt-2 cursor-pointer"
            >
              {t('loadMore')} (+{Math.min(10, scans.length - visibleCount)})
            </button>
          )}
        </div>
      )}
    </div>
  );
};
