import React, { useEffect, useLayoutEffect, useRef } from 'react';
import type { TerminalLog, ScanState, ExtractedWallet } from '../types';
import { useParallax } from '../hooks/useParallax';
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
  const { style: parallaxStyle, bind: parallaxBind } = useParallax(2.0);

  const isScanning = scanState === 'SCANNING' || scanState === 'INITIALIZING' || scanState === 'GENERATING' || scanState === 'CONNECTING';
  const isMatchFound = scanState === 'MATCH_FOUND';

  // Synchronous auto-scroll right on DOM commit — zero rAF delay, zero gesture dependency
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  // Secondary guarantee post-paint to keep pinned even if fonts or line breaks settle
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  // Completely eliminate 3D compositor detachment during active scanning stream
  const activeParallaxStyle = isScanning ? undefined : parallaxStyle;
  const activeParallaxBind = isScanning ? {} : parallaxBind;

  return (
    <div className="w-full px-4 mb-4">
      {/* Outer Container with Dynamic State Glow & Safe Non-blocking Parallax */}
      <div
        {...activeParallaxBind}
        style={activeParallaxStyle}
        className={`w-full rounded-2xl p-[1.5px] transition-all duration-300 ${
          isMatchFound
            ? 'bg-gradient-to-b from-[#00E676]/70 via-[#22D3EE]/30 to-black/80 shadow-[0_20px_50px_-10px_rgba(0,230,118,0.35),0_0_30px_rgba(0,230,118,0.2)]'
            : 'bg-gradient-to-b from-[#22D3EE]/40 via-white/10 to-black/60 shadow-[0_18px_45px_-10px_rgba(0,0,0,0.85),0_0_25px_-5px_rgba(34,211,238,0.18)]'
        }`}
      >
        {/* Terminal Shell */}
        <div className={`terminal-shell-3d rounded-2xl relative transition-colors duration-300 ${
          isMatchFound ? 'border border-[#00E676]/50' : ''
        }`}>
          {/* Top Glass Highlight */}
          <div
            className={`absolute top-0 left-0 right-0 h-[1.5px] z-20 transition-colors duration-300 ${
              isMatchFound
                ? 'bg-gradient-to-r from-transparent via-[#00E676] to-transparent shadow-[0_0_15px_#00E676]'
                : 'bg-gradient-to-r from-transparent via-[#38E8FF]/60 to-transparent'
            }`}
          />

          {/* Terminal Console Header Bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#121B29]/90 border-b border-white/10 relative z-20 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF2D2D]/80 border border-white/10 shadow-[0_0_5px_rgba(255,45,45,0.5)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFB800]/80 border border-white/10" />
                <span className={`w-2.5 h-2.5 rounded-full border border-white/10 transition-colors ${
                  isMatchFound
                    ? 'bg-[#00E676] shadow-[0_0_10px_#00E676] animate-pulse'
                    : 'bg-[#00E676]/80 shadow-[0_0_5px_rgba(0,230,118,0.5)]'
                }`} />
              </div>
              <span className="h-3.5 w-[1px] bg-white/10 mx-1" />
              <div className="flex items-center gap-1 text-[11px] font-mono-terminal font-semibold tracking-wider text-[#38E8FF]">
                <TerminalIcon className={`w-3.5 h-3.5 transition-colors ${isMatchFound ? 'text-[#00E676]' : 'text-[#22D3EE]'}`} />
                <span>TERMINAL_CON // v3.8</span>
              </div>
            </div>

            {/* Live Status Badge */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/40 border border-white/10 font-mono-terminal text-[10px]">
                {isScanning ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-ping" />
                    <span className="text-[#38E8FF] font-bold tracking-wider">{t('statusExtracting')}</span>
                  </>
                ) : isMatchFound ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] shadow-[0_0_8px_#00E676] animate-ping" />
                    <span className="text-[#00E676] font-bold tracking-wider">{t('statusLocated')}</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]/60" />
                    <span className="text-[#9CA3AF]">{t('statusReady')}</span>
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
            <div className="scanlines-overlay absolute inset-0 pointer-events-none opacity-40 z-10" />

            {/* Futuristic Scanning Beam */}
            {isScanning && (
              <div className="pointer-events-none absolute left-0 right-0 h-10 -top-10 z-15 animate-scan-beam">
                <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#38E8FF] to-transparent shadow-[0_0_15px_#22D3EE,0_0_30px_#22D3EE]" />
                <div className="h-10 w-full bg-gradient-to-b from-[#22D3EE]/25 to-transparent blur-sm" />
              </div>
            )}

            {/* Terminal Output Logs Container - flex-1 min-h-0 guarantees 100% accurate scroll calculation */}
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
                        ? 'bg-[#00E676]/20 px-2 py-1.5 rounded-lg border border-[#00E676]/60 shadow-[0_0_20px_rgba(0,230,118,0.35)] text-white font-bold'
                        : isSystem
                        ? 'text-[#22D3EE]'
                        : isSuccess
                        ? 'text-[#00E676]'
                        : 'text-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {log.prefix && (
                        <span
                          className={`font-semibold shrink-0 ${
                            isMatch
                              ? 'text-[#00E676] font-bold'
                              : log.prefix.includes('ERC')
                              ? 'text-[#38E8FF]'
                              : log.prefix.includes('TRC')
                              ? 'text-[#FF4A61]'
                              : log.prefix.includes('SOL')
                              ? 'text-[#00E676]'
                              : 'text-[#9CA3AF]'
                          }`}
                        >
                          {log.prefix}
                        </span>
                      )}
                      <span className="truncate">{log.text}</span>
                    </div>

                    {log.statusText && (
                      <span
                        className={`shrink-0 font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wider ${
                          isMatch
                            ? 'text-[#00E676] bg-[#00E676]/30 border border-[#00E676]/70 shadow-[0_0_12px_rgba(0,230,118,0.5)]'
                            : isRedStatus
                            ? 'text-[#FF4A61]'
                            : isSuccess
                            ? 'text-[#00E676]'
                            : 'text-[#22D3EE]'
                        }`}
                      >
                        {log.statusText}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* In-Console Decrypted Wallet Verification Badge on Match */}
              {isMatchFound && matchedWallet && (
                <div className="my-2 p-2.5 rounded-xl bg-gradient-to-r from-[#00E676]/15 via-[#00E676]/10 to-[#22D3EE]/15 border border-[#00E676]/50 shadow-[0_0_25px_rgba(0,230,118,0.25)] animate-fadeIn">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00E676] animate-ping" />
                      <span className="text-[10.5px] font-bold text-[#00E676] tracking-wider uppercase">
                        VULNERABLE TARGET SECURED
                      </span>
                    </div>
                    <span className="text-xs font-mono font-black text-[#00E676] drop-shadow-[0_0_6px_#00E676]">
                      {matchedWallet.balance} {matchedWallet.symbol}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-[9.5px] font-mono text-[#CBD5E1]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#9CA3AF]">CHAIN:</span>
                      <span className="text-white font-bold">{matchedWallet.networkName || matchedWallet.network}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#9CA3AF]">TARGET:</span>
                      <span className="text-[#38E8FF]">{matchedWallet.address.slice(0, 8)}...{matchedWallet.address.slice(-6)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#9CA3AF]">PRIVATE KEY:</span>
                      <span className="text-[#00E676] font-bold">
                        {((matchedWallet.privateKey || matchedWallet.demoPrivateKey || '')).slice(0, 8)}••••••••{((matchedWallet.privateKey || matchedWallet.demoPrivateKey || '')).slice(-6)}
                      </span>
                    </div>
                  </div>
                  {onTransfer && (
                    <button
                      onClick={() => onTransfer(matchedWallet)}
                      type="button"
                      className="mt-2.5 w-full py-2 rounded-lg bg-[#00E676] hover:bg-[#00C853] text-black font-extrabold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,230,118,0.4)] active:scale-98"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>DISPATCH / SWEEP TO VAULT</span>
                      <span>&rarr;</span>
                    </button>
                  )}
                </div>
              )}

              {/* Terminal Command Cursor at the bottom */}
              <div className={`flex items-center gap-1.5 pt-1 font-mono-terminal ${isMatchFound ? 'text-[#00E676]' : 'text-[#22D3EE]'}`}>
                <span className="text-[11px]">&gt;</span>
                {isMatchFound ? (
                  <span className="text-[10px] font-bold tracking-wide">COLLISION_RESOLVED // AWAITING OPERATOR DISPATCH</span>
                ) : null}
                <span className={`w-2 h-3.5 inline-block animate-terminal-blink ${isMatchFound ? 'bg-[#00E676]' : 'bg-[#22D3EE]'}`} />
              </div>
            </div>

            {/* Bottom Terminal Status Bar */}
            <div className="relative z-10 pt-2 mt-1 border-t border-white/5 flex items-center justify-between text-[9.5px] font-mono-terminal">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isMatchFound
                      ? 'bg-[#00E676] shadow-[0_0_8px_#00E676]'
                      : isScanning
                      ? 'bg-[#22D3EE] animate-pulse'
                      : 'bg-[#64748B]'
                  }`}
                />
                <span className={isMatchFound ? 'text-[#00E676] font-bold' : isScanning ? 'text-[#38E8FF]' : 'text-[#64748B]'}>
                  {isMatchFound
                    ? 'EXTRACTOR_STREAM: TARGET SECURED (READY)'
                    : isScanning
                    ? 'EXTRACTOR_STREAM: ACTIVE'
                    : 'EXTRACTOR_STREAM: STANDBY'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[#64748B]">
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
