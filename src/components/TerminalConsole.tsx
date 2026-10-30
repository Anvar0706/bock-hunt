import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { TerminalLog, ScanState, ExtractedWallet } from '../types';
import { Terminal as TerminalIcon, Sparkles, ArrowDown } from 'lucide-react';
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
  const isUserScrolledUpRef = useRef(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const isScanning = scanState === 'SCANNING' || scanState === 'INITIALIZING' || scanState === 'GENERATING' || scanState === 'CONNECTING';
  const isMatchFound = scanState === 'MATCH_FOUND';

  // Smart User Scroll Detection: do not hijack scroll position if user scrolled up
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isUp = distanceToBottom > 45;
    isUserScrolledUpRef.current = isUp;
    setShowScrollBottomBtn(isUp);
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    isUserScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // Smooth rAF auto-scroll when user is following latest stream
  useEffect(() => {
    if (!isUserScrolledUpRef.current) {
      const el = scrollRef.current;
      if (!el) return;
      const rafId = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
      return () => cancelAnimationFrame(rafId);
    }
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

          {/* Terminal Console Header Bar - Zero Truncation Architecture */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0F131C] border-b border-white/[0.08] relative z-20 gap-2">
            {/* Left: Terminal Identity */}
            <div className="flex items-center gap-1.5 min-w-0 shrink">
              {/* Hardware Status Dots */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/70 border border-white/10" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/70 border border-white/10" />
                <span className={`w-2.5 h-2.5 rounded-full border border-white/10 transition-colors ${
                  isMatchFound
                    ? 'bg-[#00E676] shadow-[0_0_6px_#00E676]'
                    : 'bg-[#00E676]/70'
                }`} />
              </div>
              <span className="h-3 w-[1px] bg-white/10 mx-1 shrink-0" />
              <div className="flex items-center gap-1.5 font-mono-terminal text-[11px] font-semibold text-white truncate">
                <TerminalIcon className={`w-3.5 h-3.5 shrink-0 transition-colors ${isMatchFound ? 'text-[#00E676]' : 'text-[#38E8FF]'}`} />
                <span className="truncate">CONSOLE <span className="text-[#64748B] text-[9.5px]">v3.8</span></span>
              </div>
            </div>

            {/* Right: Live Telemetry Status & Guaranteed Visible Key Counter */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Status Indicator Pill */}
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 font-mono-terminal text-[9.5px] shrink-0">
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

              {/* Dedicated Key Counter Badge - Guaranteed Non-Clipping */}
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#0B0D14] border border-[#22D3EE]/25 font-mono-terminal text-[10px] shrink-0 whitespace-nowrap shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                <span className="text-[#38E8FF] font-bold tracking-wide">
                  {recordsScanned.toLocaleString()}
                </span>
                <span className="text-[#64748B] text-[8.5px] uppercase font-semibold">
                  {t('keys')}
                </span>
              </div>
            </div>
          </div>

          {/* Inner Terminal Screen */}
          <div className="terminal-screen-inner relative p-3.5 h-64 sm:h-72 flex flex-col justify-between overflow-hidden">
            {/* Scanlines Effect Overlay */}
            <div className="scanlines-overlay absolute inset-0 pointer-events-none opacity-20 z-10" />

            {/* Vertical Scanning Beam */}
            {isScanning && (
              <div className="pointer-events-none absolute left-0 right-0 h-10 -top-10 z-15 animate-scan-beam">
                <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-[#22D3EE] to-transparent shadow-[0_0_8px_#22D3EE]" />
              </div>
            )}

            {/* Terminal Output Logs Container */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="terminal-scroll flex-1 min-h-0 overflow-y-auto space-y-1.5 text-[11px] sm:text-xs font-mono-terminal relative z-10 pr-1 select-text"
            >
              {logs.map((log) => {
                const isMatch = log.statusType === 'match';
                const isSystem = log.statusType === 'system';
                const isSuccess = log.statusType === 'success';
                const isWarning = log.statusType === 'warning';
                const isRedStatus = log.statusType === 'nokey' || log.statusType === 'empty' || log.statusType === 'failed';

                return (
                  <div
                    key={log.id}
                    className={`flex items-start justify-between gap-1.5 leading-relaxed text-[10.5px] sm:text-[11px] transition-opacity duration-150 font-mono-terminal ${
                      isMatch
                        ? 'p-2 rounded-xl bg-[#00E676]/10 border border-[#00E676]/40 text-[#00E676] font-bold shadow-[0_2px_12px_rgba(0,230,118,0.15)] my-1'
                        : isWarning
                        ? 'text-amber-400'
                        : isSystem
                        ? 'text-[#64748B]'
                        : isSuccess
                        ? 'text-[#00E676]'
                        : isRedStatus
                        ? 'text-slate-400'
                        : 'text-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-start gap-1.5 min-w-0 flex-1">
                      <span className="text-[#475569] select-none shrink-0 font-mono-terminal">
                        [{log.timestamp}]
                      </span>
                      {log.prefix && (
                        <span className="text-[#38E8FF] font-semibold shrink-0 select-none font-mono-terminal">
                          {log.prefix}
                        </span>
                      )}
                      <span className="break-all text-slate-200 flex-1 font-mono-terminal">
                        {log.text}
                      </span>
                    </div>

                    {log.statusText && (
                      <span
                        className={`shrink-0 text-[9.5px] sm:text-[10px] font-mono-terminal font-semibold px-1.5 py-0.2 rounded select-none ${
                          isMatch
                            ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
                            : isSuccess
                            ? 'text-[#00E676]'
                            : isRedStatus
                            ? 'text-red-400/90'
                            : isWarning
                            ? 'text-amber-400'
                            : 'text-[#64748B]'
                        }`}
                      >
                        {log.statusText}
                      </span>
                    )}

                    {isMatch && matchedWallet && onTransfer && (
                      <button
                        onClick={() => onTransfer(matchedWallet)}
                        type="button"
                        className="ml-1.5 px-2 py-0.5 rounded-md bg-[#00E676] hover:bg-[#00C853] text-black font-extrabold text-[9.5px] uppercase tracking-wider shrink-0 cursor-pointer active:scale-95 transition-all flex items-center gap-1 shadow-[0_2px_8px_rgba(0,230,118,0.3)]"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-black" />
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

            {/* Floating "Scroll to Latest" pill button */}
            {showScrollBottomBtn && (
              <button
                onClick={() => scrollToBottom(true)}
                type="button"
                className="absolute bottom-10 right-4 z-20 px-2.5 py-1 rounded-full bg-[#12151F]/95 border border-[#22D3EE]/40 text-[#38E8FF] text-[10px] font-mono-terminal flex items-center gap-1 shadow-lg backdrop-blur-md cursor-pointer hover:bg-[#1a202e] transition-all"
              >
                <ArrowDown className="w-3 h-3 text-[#38E8FF]" />
                <span>Latest</span>
              </button>
            )}

            {/* Bottom Terminal Status Bar */}
            <div className="relative z-10 pt-2 mt-1 border-t border-white/[0.06] flex items-center justify-between text-[9.5px] font-mono-terminal">
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isMatchFound
                      ? 'bg-[#00E676]'
                      : isScanning
                      ? 'bg-[#22D3EE] animate-pulse'
                      : 'bg-[#475569]'
                  }`}
                />
                <span className={`truncate ${isMatchFound ? 'text-[#00E676] font-bold' : isScanning ? 'text-[#38E8FF]' : 'text-[#64748B]'}`}>
                  {isMatchFound
                    ? 'STREAM: TARGET COLLISION SECURED'
                    : isScanning
                    ? 'STREAM: INGESTION ACTIVE'
                    : 'STREAM: STANDBY'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[#64748B] font-mono-terminal shrink-0">
                {isScanning ? (
                  <span className="text-[#38E8FF] font-semibold tracking-wider">
                    ~{(12.8 + (recordsScanned % 19) * 0.2).toFixed(1)}k keys/s
                  </span>
                ) : (
                  <span>SECP256K1 // BIP-44</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TerminalConsole.displayName = 'TerminalConsole';
