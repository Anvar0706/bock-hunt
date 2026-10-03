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

  return (
    <div className="w-full px-4 pb-24 animate-fadeIn">
      {/* Page Title & Controls */}
      <div className="flex items-center justify-between mb-4 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.25)]">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-wider text-white">
              {t('activityAudit')}
            </h2>
            <span className="text-[10px] font-mono text-[#9CA3AF] tracking-wider uppercase font-semibold">
              {t('telemetryHistory')}
            </span>
          </div>
        </div>

        {scans.length > 0 && (
          <button
            onClick={onClearHistory}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-xs font-semibold text-[#9CA3AF] hover:text-[#FF2D2D] transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('clearLogs')}</span>
          </button>
        )}
      </div>

      {/* Scans List */}
      {scans.length === 0 ? (
        /* Empty State */
        <div className="glass-panel-3d rounded-3xl p-8 text-center my-6 border border-white/10">
          <div className="w-12 h-12 rounded-2xl mx-auto bg-white/5 border border-white/10 flex items-center justify-center text-[#9CA3AF] mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
            {t('noScansYet')}
          </h3>
          <p className="text-xs text-[#9CA3AF] max-w-xs mx-auto">
            Commence an extraction session from the Scan console to populate the audit trail.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => (
            <div
              key={scan.id}
              className="glass-card-elevated rounded-2xl p-4 relative overflow-hidden group transition-all duration-300 border-white/10 hover:border-[#22D3EE]/30"
            >
              {/* Top ambient highlight */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold text-white tracking-wider">
                    {scan.scanNumber}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />
                  <span className="text-[11px] text-[#9CA3AF] font-medium">
                    {scan.startedAt}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00E676]/10 border border-[#00E676]/30 text-[10px] font-mono font-bold text-[#00E676]">
                  <CheckCircle className="w-3 h-3" />
                  <span>{scan.status === 'COMPLETED' ? t('statusCompleted') : t('statusAborted')}</span>
                </div>
              </div>

              {/* Network badges */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {scan.networks.map((net: Network) => (
                  <span
                    key={net}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold bg-white/5 border border-white/10 text-[#CBD5E1]"
                  >
                    {net === 'ETHEREUM' ? 'Ethereum (ERC-20)' : net === 'TRON' ? 'TRON (TRC-20)' : 'Solana (SOL)'}
                  </span>
                ))}
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 bg-black/30 rounded-xl p-2.5 border border-white/5 text-center font-mono">
                <div>
                  <span className="text-[9px] text-[#9CA3AF] uppercase block">
                    {t('recordsScanned')}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {scan.recordsScanned.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-[#9CA3AF] uppercase block">
                    {t('targetsLocated')}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      scan.matches > 0 ? 'text-[#00E676]' : 'text-[#9CA3AF]'
                    }`}
                  >
                    {scan.matches}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-[#9CA3AF] uppercase block">
                    STATE
                  </span>
                  <span className="text-xs font-bold text-[#38E8FF]">
                    SYNC
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
