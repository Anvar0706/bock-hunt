import React, { useEffect, useRef } from 'react';
import type { TerminalLog, ScanState, ExtractedWallet } from '../types';
import { Terminal as TerminalIcon, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface TerminalConsoleProps {
  logs: TerminalLog[];
  scanState: ScanState;
  recordsScanned: number;
  matchedWallet?: ExtractedWallet | null;
  onTransfer?: (wallet: ExtractedWallet) => void;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = React.memo(({
  logs,
  scanState,
  recordsScanned,
  matchedWallet,
  onTransfer,
}) => {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const isScanning = scanState === 'SCANNING' || scanState === 'INITIALIZING' || scanState === 'GENERATING' || scanState === 'CONNECTING';
  const isMatchFound = scanState === 'MATCH_FOUND';

  // Smooth rAF auto-scroll on frame commit
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const rafId = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(rafId);
  }, [logs]);

  return (
    <div className="w-full px-4 mb-4 select-none">
      {/* Outer Shell - Obsidian Terminal */}
      <div
        className={`w-full rounded-2xl border transition-all duration-300 overflow-hidden ${
          isMatchFound
            ? 'border-[#00E676]/60 shadow-[0_8px_24px_-4px_rgba(0,230,118,0.2)]'
            : 'border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.85)]'
        }`}
      >
        {/* Terminal Shell */}
        <div className="terminal-shell-3d rounded-2xl relative">
          {/* Top Hairline Highlight */}
          <div
            className={`absolute top-0 left-0 right-0 h-[1px] z-20 transition-colors duration-300 ${
              isMatchFound
                ? 'bg-gradient-to-r from-transparent via-[#00E676] to-transparent'
                : 'bg-gradient-to-r from-transparent via-white/15 to-transparent'
            }`}
          />

          {/* Terminal Console Header Bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0F131C] border-b border-white/[0.08] relative z-20">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/70 border border-white/10" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/70 border border-white/10" />
                <span className={`w-2.5 h-2.5 rounded-full border border-white/10 transition-colors ${
                  isMatchFound
                    ? 'bg-[#00E676] shadow-[0_0_6px_#00E676]'
                    : 'bg-[#00E676]/70'
                }`} />
              </div>
              <span className="h-3 w-[1px] bg-white/10 mx-1" />
              <div className="flex items-center gap-1.5 text-[11px] font-mono-terminal font-semibold tracking-wider text-[#94A3B8]">
                <TerminalIcon className={`w-3.5 h-3.5 transition-colors ${isMatchFound ? 'text-[#00E676]' : 'text-[#22D3EE]'}`} />
                <span className="text-white">SECP256K1_INGESTION // v3.8</span>
              </div>
            </div>

            {/* Live Status Badge */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 font-mono-terminal text-[10px]">
                {isScanning ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse" />
                    <span className="text-[#38E8FF] font-semibold">{t('statusExtracting')}</span>
                  </>
                ) : isMatchFound ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />
                    <span className="text-[#00E676] font-bold">{t('statusLocated')}</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
                    <span className="text-[#94A3B8]">{t('statusReady')}</span>
                  </>
                )}
              </div>
              <span className="text-[10px] font-mono-terminal text-[#64748B]">
                {recordsScanned.toLocaleString()} {t('keys')}
              </span>
            </div>
          </div>

          {/* Inner Terminal Screen */}
          <div className="terminal-screen-inner relative p-3.5 h-64 sm:h-72 flex flex-col justify-between overflow-hidden">
            {/* Scanlines Effect Overlay */}
            <div className="scanlines-overlay absolute inset-0 pointer-events-none opacity-25 z-10" />

            {/* Vertical Scanning Beam */}
            {isScanning && (
              <div className="pointer-events-none absolute left-0 right-0 h-10 -top-10 z-15 animate-scan-beam">
                <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-[#22D3EE] to-transparent shadow-[0_0_8px_#22D3EE]" />
              </div>
            )}

            {/* Terminal Output Logs Container */}
            <div
              ref={scrollRef}
              className="terminal-scroll flex-1 min-h-0 overflow-y-auto space-y-1.5 text-[11px] sm:text-xs font-mono-terminal relative z-10 pr-1 select-text"
            >
              {logs.map((log) => {
                const isMatch = log.statusType === 'match';
                const isSystem = log.statusType === 'system';
                const isSuccess = log.statusType === 'success';
                const isRedStatus = log.statusType === 'nokey' || log.statusType === 'empty' || log.statusType === 'failed';

                return (
                  <div
                    key={log.id}
                    className={`flex items-start justify-between gap-1.5 leading-relaxed transition-opacity duration-150 ${
                      isMatch
                        ? 'p-2 rounded-xl bg-[#00E676]/10 border border-[#00E676]/40 text-[#00E676] font-bold shadow-[0_2px_12px_rgba(0,230,118,0.15)] my-1'
                        : isSystem
                        ? 'text-[#64748B]'
                        : isSuccess
                        ? 'text-[#00E676]'
                        : isRedStatus
                        ? 'text-[#EF4444]'
                        : 'text-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-start gap-1.5 min-w-0 flex-1">
                      <span className="text-[#475569] select-none shrink-0">[{log.timestamp}]</span>
                      <span className="break-all">{log.text}</span>
                    </div>

                    {isMatch && matchedWallet && onTransfer && (
                      <button
                        onClick={() => onTransfer(matchedWallet)}
                        type="button"
                        className="ml-2 px-2.5 py-1 rounded-lg bg-[#00E676] text-black font-extrabold text-[10px] uppercase tracking-wider shrink-0 cursor-pointer active:scale-95 transition-all flex items-center gap-1 shadow-[0_2px_8px_rgba(0,230,118,0.3)]"
                      >
                        <Sparkles className="w-3 h-3 text-black" />
                        <span>{t('withdraw')}</span>
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Blinking Prompt Line */}
              <div className={`flex items-center gap-1 pt-1 font-mono-terminal ${isMatchFound ? 'text-[#00E676]' : 'text-[#22D3EE]'}`}>
                <span className="text-[11px]">&gt;</span>
                {isMatchFound ? (
                  <span className="text-[10px] font-bold tracking-wide">COLLISION_RESOLVED // AWAITING DISPATCH</span>
                ) : null}
                <span className={`w-2 h-3.5 inline-block animate-terminal-blink ${isMatchFound ? 'bg-[#00E676]' : 'bg-[#22D3EE]'}`} />
              </div>
            </div>

            {/* Bottom Terminal Status Bar */}
            <div className="relative z-10 pt-2 mt-1 border-t border-white/[0.06] flex items-center justify-between text-[9.5px] font-mono-terminal">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isMatchFound
                      ? 'bg-[#00E676]'
                      : isScanning
                      ? 'bg-[#22D3EE] animate-pulse'
                      : 'bg-[#475569]'
                  }`}
                />
                <span className={isMatchFound ? 'text-[#00E676] font-bold' : isScanning ? 'text-[#38E8FF]' : 'text-[#64748B]'}>
                  {isMatchFound
                    ? 'EXTRACTOR_STREAM: TARGET SECURED'
                    : isScanning
                    ? 'EXTRACTOR_STREAM: INGESTION ACTIVE'
                    : 'EXTRACTOR_STREAM: STANDBY'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[#475569]">
                <span>SECP256K1 // ED25519</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TerminalConsole.displayName = 'TerminalConsole';
