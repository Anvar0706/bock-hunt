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
      descDisconnected: "Markazlashmagan protokol klasteri bilan aloqa uzildi. Tizim yaxlitligini ta'minlash uchun, aloqa to'liq tiklanmaguncha tizim kutish rejimida qoladi.",
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
      subConnecting: "Establishing secure cryptographic mempool handshake...",
      titleDisconnected: "PROTOCOL CLUSTER UNREACHABLE",
      descDisconnected: "Failed to establish a secure link with the protocol cluster. For telemetry integrity, the terminal remains locked until uplink succeeds.",
      btnRetry: "Reconnect to Cluster",
      autoRetry: "Auto-reconnect in:",
      step1: "Resolving Telegram protocol credentials",
      step2: "Synchronizing with BlockHunt protocol cluster",
      step3: "Retrieving extraction vault & audit telemetry",
      secNotice: "Protocol Security: Waiting for active protocol link",
    },
  }[language === 'uz' ? 'uz' : language === 'ru' ? 'ru' : 'en'];

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0C10] text-[#F8FAFC] flex flex-col items-center justify-center p-5 select-none overflow-hidden">
      {/* Precision Node Uplink Panel */}
      <div className="w-full max-w-sm flex flex-col items-center relative z-10 animate-modal-3d">
        {/* Emblem */}
        <div className="relative mb-5 flex items-center justify-center">
          {isConnecting ? (
            <div className="w-16 h-16 rounded-2xl border border-[#22D3EE]/30 flex items-center justify-center bg-[#12151F] shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
              <Database className="w-7 h-7 text-[#38E8FF] animate-pulse" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl border border-red-500/40 flex items-center justify-center bg-[#12151F] shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
              <WifiOff className="w-7 h-7 text-red-400" />
            </div>
          )}
        </div>

        {/* Title & Badge */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[9.5px] font-mono font-semibold tracking-wider text-[#94A3B8] uppercase mb-2">
            <Cpu className="w-3 h-3 text-[#22D3EE]" />
            <span>BLOCKHUNT PROTOCOL v3.8</span>
          </div>

          <h1 className="text-sm sm:text-base font-bold tracking-tight text-white uppercase">
            {isConnecting ? t.titleConnecting : t.titleDisconnected}
          </h1>

          <p className="text-xs text-[#94A3B8] mt-1 max-w-xs mx-auto leading-relaxed">
            {isConnecting ? t.subConnecting : t.descDisconnected}
          </p>
        </div>

        {/* Status / Telemetry Box */}
        <div className="w-full rounded-2xl p-4 mb-4 border border-white/[0.08] bg-[#12151F] relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 mb-3">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#38E8FF]">
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>CLUSTER GATEKEEPER</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9.5px] font-mono font-semibold">
              <span className={`w-2 h-2 rounded-full ${isConnecting ? 'bg-[#00E676] animate-pulse' : 'bg-red-500'}`} />
              <span className={isConnecting ? 'text-[#00E676]' : 'text-red-400'}>
                {isConnecting ? 'CONNECTING' : 'OFFLINE'}
              </span>
            </div>
          </div>

          <div className="space-y-2 font-mono text-[10.5px]">
            {/* Step 1 */}
            <div className="flex items-center gap-2 text-[#CBD5E1]">
              <span className={currentStep > 1 ? 'text-[#00E676] font-bold' : currentStep === 1 && isConnecting ? 'text-[#38E8FF] font-bold' : 'text-red-400'}>
                {currentStep > 1 ? '✓' : currentStep === 1 && isConnecting ? '▶' : '✗'}
              </span>
              <span className={currentStep === 1 && isConnecting ? 'text-white font-semibold' : ''}>
                {t.step1} {currentStep > 1 ? '[OK]' : currentStep === 1 && isConnecting ? '[ACTIVE]' : '[FAIL]'}
              </span>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-2 text-[#CBD5E1]">
              <span className={currentStep > 2 ? 'text-[#00E676] font-bold' : currentStep === 2 && isConnecting ? 'text-[#38E8FF] font-bold' : currentStep === 2 && !isConnecting ? 'text-red-400' : 'text-[#64748B]'}>
                {currentStep > 2 ? '✓' : currentStep === 2 && isConnecting ? '▶' : currentStep === 2 && !isConnecting ? '✗' : '⋯'}
              </span>
              <span className={currentStep === 2 && isConnecting ? 'text-white font-semibold' : ''}>
                {t.step2} {currentStep > 2 ? '[OK]' : currentStep === 2 && isConnecting ? '[SYNCING]' : currentStep < 2 ? '[PENDING]' : '[FAIL]'}
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-2 text-[#CBD5E1]">
              <span className={currentStep === 3 && isConnecting ? 'text-[#38E8FF] font-bold' : currentStep === 3 && !isConnecting ? 'text-red-400' : 'text-[#64748B]'}>
                {currentStep === 3 && isConnecting ? '▶' : currentStep === 3 && !isConnecting ? '✗' : '⋯'}
              </span>
              <span className={currentStep === 3 && isConnecting ? 'text-white font-semibold' : ''}>
                {t.step3} {currentStep === 3 && isConnecting ? '[LOADING]' : currentStep < 3 ? '[PENDING]' : '[FAIL]'}
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px] font-mono text-red-400 break-words">
              <strong>LOG:</strong> {error}
            </div>
          )}
        </div>

        {/* Action Controls */}
        {isConnecting ? (
          <div className="w-full flex flex-col items-center gap-2">
            <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 bg-[#38E8FF] rounded-full w-1/2 animate-scan-beam" />
            </div>
            <span className="text-[10px] font-mono text-[#64748B] tracking-wider">
              {t.secNotice}
            </span>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-2.5">
            <button
              onClick={onRetry}
              type="button"
              className="w-full py-3 px-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#38E8FF]" />
              <span>{t.btnRetry}</span>
            </button>

            <span className="text-[10px] font-mono text-[#64748B]">
              {t.autoRetry} <span className="text-[#38E8FF] font-bold">{retryCountdown}s</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
