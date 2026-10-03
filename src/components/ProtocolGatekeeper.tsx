import React from 'react';
import { Database, WifiOff, RefreshCw, Cpu, Terminal as TerminalIcon } from 'lucide-react';

interface ProtocolGatekeeperProps {
  status: 'CONNECTING' | 'DISCONNECTED';
  currentStep?: 1 | 2 | 3;
  error?: string | null;
  retryCountdown: number;
  onRetry: () => void;
  language?: string;
}

export const ProtocolGatekeeper: React.FC<ProtocolGatekeeperProps> = ({
  status,
  currentStep = 1,
  error,
  retryCountdown,
  onRetry,
  language = 'en',
}) => {
  const isConnecting = status === 'CONNECTING';

  const t = {
    uz: {
      titleConnecting: "PROTOKOL KLASTERIGA ULANILMOQDA",
      subConnecting: "Xavfsiz kiber kanal va klaster tekshirilmoqda...",
      titleDisconnected: "PROTOKOL BILAN ALOQA O'RNATILMADI",
      descDisconnected: "Markazlashmagan protokol klasteri yoki tarmoq bilan aloqa uzildi. Tizim yaxlitligini ta'minlash uchun, aloqa to'liq tiklanmaguncha tizim kutish rejimida qoladi.",
      btnRetry: "Qayta ulanish",
      autoRetry: "Avtomatik qayta urinish:",
      step1: "Telegram identifikatsiya sessiyasi",
      step2: "Xavfsiz protokol klasteri bilan sinxronizatsiya",
      step3: "Audit loglari va hamyonlar xazinasi yuklanishi",
      secNotice: "Xavfsizlik bayonnomasi: Protokol aloqasi kutilmoqda",
    },
    ru: {
      titleConnecting: "ПОДКЛЮЧЕНИЕ К КЛАСТЕРУ ПРОТОКОЛА",
      subConnecting: "Установка зашифрованного канала с узлом протокола...",
      titleDisconnected: "НЕТ СВЯЗИ С КЛАСТЕРОМ",
      descDisconnected: "Потеряна связь с защищенным узлом протокола. В целях целостности данных главное меню заблокировано до восстановления соединения.",
      btnRetry: "Повторить подключение",
      autoRetry: "Авто-подключение через:",
      step1: "Идентификация сессии Telegram",
      step2: "Синхронизация с защищенным узлом протокола",
      step3: "Синхронизация журнала аудита и кошельков",
      secNotice: "Протокол безопасности: Ожидание подключения к кластеру",
    },
    en: {
      titleConnecting: "SYNCHRONIZING PROTOCOL CLUSTER",
      subConnecting: "Establishing quantum encrypted mempool handshake...",
      titleDisconnected: "PROTOCOL CLUSTER UNREACHABLE",
      descDisconnected: "Failed to establish a secure link with the protocol cluster. For telemetry integrity, the main menu remains locked until uplink succeeds.",
      btnRetry: "Reconnect to Cluster",
      autoRetry: "Auto-reconnect in:",
      step1: "Resolving Telegram protocol credentials",
      step2: "Synchronizing with BlockHunt protocol cluster",
      step3: "Retrieving extraction vault & audit telemetry",
      secNotice: "Protocol Security: Waiting for active protocol link",
    },
  }[language === 'uz' ? 'uz' : language === 'ru' ? 'ru' : 'en'];

  return (
    <div className="fixed inset-0 z-50 bg-[#181820] text-[#F5F7FA] flex flex-col items-center justify-center p-5 select-none overflow-hidden">
      {/* Background Cyber Ambient Lights */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#22D3EE]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className={`absolute -bottom-32 -left-32 w-80 h-80 ${isConnecting ? 'bg-[#00E676]/10' : 'bg-[#FF2D2D]/15'} rounded-full blur-[100px] pointer-events-none`} />

      {/* Main Container */}
      <div className="w-full max-w-sm flex flex-col items-center relative z-10 animate-modal-3d">
        {/* Top Radar / Hardware Emblem */}
        <div className="relative mb-6 flex items-center justify-center">
          {isConnecting ? (
            <>
              <div className="w-20 h-20 rounded-full border border-[#22D3EE]/30 flex items-center justify-center relative bg-black/40 shadow-[0_0_30px_rgba(34,211,238,0.25)]">
                <div className="absolute inset-0 rounded-full border border-dashed border-[#22D3EE]/40 animate-spin" style={{ animationDuration: '6s' }} />
                <Database className="w-8 h-8 text-[#38E8FF] animate-pulse" />
              </div>
              <div className="absolute -inset-2 rounded-full border border-[#22D3EE]/20 pulse-ring-cyan pointer-events-none" />
            </>
          ) : (
            <div className="w-20 h-20 rounded-full border border-[#FF2D2D]/50 flex items-center justify-center relative bg-black/40 shadow-[0_0_30px_rgba(255,45,45,0.3)]">
              <WifiOff className="w-8 h-8 text-[#FF4444] animate-pulse" />
            </div>
          )}
        </div>

        {/* Title & Badge */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-bold tracking-widest text-[#9CA3AF] uppercase mb-2.5">
            <Cpu className="w-3 h-3 text-[#22D3EE]" />
            <span>BLOCKHUNT PROTOCOL v3.8</span>
          </div>

          <h1 className="text-base sm:text-lg font-black tracking-wider text-white uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            {isConnecting ? t.titleConnecting : t.titleDisconnected}
          </h1>

          <p className="text-xs text-[#9CA3AF] mt-1.5 max-w-xs mx-auto leading-relaxed">
            {isConnecting ? t.subConnecting : t.descDisconnected}
          </p>
        </div>

        {/* Status / Telemetry Box */}
        <div className="w-full glass-panel-3d rounded-2xl p-4 mb-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#38E8FF]">
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>CLUSTER GATEKEEPER</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono font-semibold">
              <span className={`w-2 h-2 rounded-full ${isConnecting ? 'bg-[#22D3EE] animate-ping' : 'bg-[#FF2D2D]'}`} />
              <span className={isConnecting ? 'text-[#22D3EE]' : 'text-[#FF4444]'}>
                {isConnecting ? 'CONNECTING' : 'OFFLINE'}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 font-mono text-[10.5px]">
            {/* Step 1 */}
            <div className="flex items-center gap-2 text-[#CBD5E1]">
              <span className={currentStep > 1 ? 'text-[#00E676] font-bold' : currentStep === 1 && isConnecting ? 'text-[#22D3EE] animate-pulse font-bold' : 'text-[#FF4444]'}>
                {currentStep > 1 ? '✓' : currentStep === 1 && isConnecting ? '▶' : '✗'}
              </span>
              <span className={currentStep === 1 && isConnecting ? 'text-white font-semibold' : ''}>
                {t.step1} {currentStep > 1 ? '[OK]' : currentStep === 1 && isConnecting ? '[ACTIVE]' : '[FAIL]'}
              </span>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-2 text-[#CBD5E1]">
              <span className={currentStep > 2 ? 'text-[#00E676] font-bold' : currentStep === 2 && isConnecting ? 'text-[#22D3EE] animate-pulse font-bold' : currentStep === 2 && !isConnecting ? 'text-[#FF4444]' : 'text-[#9CA3AF]'}>
                {currentStep > 2 ? '✓' : currentStep === 2 && isConnecting ? '▶' : currentStep === 2 && !isConnecting ? '✗' : '⋯'}
              </span>
              <span className={currentStep === 2 && isConnecting ? 'text-white font-semibold' : ''}>
                {t.step2} {currentStep > 2 ? '[OK]' : currentStep === 2 && isConnecting ? '[SYNCING]' : currentStep < 2 ? '[PENDING]' : '[FAIL]'}
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-2 text-[#CBD5E1]">
              <span className={currentStep === 3 && isConnecting ? 'text-[#22D3EE] animate-pulse font-bold' : currentStep === 3 && !isConnecting ? 'text-[#FF4444]' : 'text-[#9CA3AF]'}>
                {currentStep === 3 && isConnecting ? '▶' : currentStep === 3 && !isConnecting ? '✗' : '⋯'}
              </span>
              <span className={currentStep === 3 && isConnecting ? 'text-white font-semibold' : ''}>
                {t.step3} {currentStep === 3 && isConnecting ? '[LOADING]' : currentStep < 3 ? '[PENDING]' : '[FAIL]'}
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-3 pt-2.5 border-t border-white/10 text-[10px] font-mono text-[#FF8080] break-words">
              <strong>LOG:</strong> {error}
            </div>
          )}
        </div>

        {/* Action Controls */}
        {isConnecting ? (
          <div className="w-full flex flex-col items-center gap-2">
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#22D3EE] to-[#00E676] rounded-full w-1/2 animate-scan-beam" />
            </div>
            <span className="text-[10px] font-mono text-[#9CA3AF] tracking-wider">
              {t.secNotice}
            </span>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-3">
            <button
              onClick={onRetry}
              type="button"
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#22D3EE]/20 via-[#22D3EE]/30 to-[#22D3EE]/20 border border-[#22D3EE]/50 hover:border-[#38E8FF] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.25)] transition-all cursor-pointer active:scale-98"
            >
              <RefreshCw className="w-4 h-4 text-[#38E8FF] animate-spin" style={{ animationDuration: '4s' }} />
              <span>{t.btnRetry}</span>
            </button>

            <span className="text-[10.5px] font-mono text-[#9CA3AF]">
              {t.autoRetry} <span className="text-[#38E8FF] font-bold">{retryCountdown}s</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
