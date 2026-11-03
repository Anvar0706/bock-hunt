import React from 'react';
import { ShieldAlert, Send } from 'lucide-react';

export const RestrictedWebGate: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#07080C] text-[#E2E8F0] flex flex-col items-center justify-center p-6 text-center select-none font-sans relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-950/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="w-full max-w-sm flex flex-col items-center relative z-10">
        {/* Security Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-6 shadow-2xl">
          <ShieldAlert className="w-8 h-8 text-amber-500/90" />
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[11px] font-mono font-medium text-red-400 tracking-wider uppercase mb-3">
          <span>403 FORBIDDEN</span>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white mb-2">
          Access Restricted
        </h1>

        <p className="text-xs text-zinc-400 leading-relaxed mb-3 max-w-xs">
          Direct web browser access is disabled. This service is exclusively accessible through the official Telegram client application.
        </p>

        <p className="text-[11px] text-zinc-500 leading-relaxed mb-6 max-w-xs font-mono">
          Ushbu xizmatga veb-brauzer orqali kirish taqiqlangan. Ilovadan faqat rasmiy Telegram ilovasi orqali foydalanish mumkin.
        </p>

        {/* Action Button */}
        <a
          href="https://t.me/Block_huntbot"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-medium text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Send className="w-4 h-4" />
          <span>Open in Telegram</span>
        </a>

        {/* Security footer */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] w-full text-center">
          <p className="text-[10px] text-zinc-600 font-mono tracking-wider uppercase">
            Client Verification Gate • Secure Endpoint
          </p>
        </div>
      </div>
    </div>
  );
};
