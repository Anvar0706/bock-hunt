'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('@/App'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-[#0A0C10] text-cyan-400">
      <div className="text-center space-y-3">
        <div className="w-9 h-9 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-mono text-xs tracking-widest text-[#94A3B8]">BLOCKHUNT PROTOCOL INITIALIZING...</p>
      </div>
    </div>
  ),
});

export default function Page() {
  return <App />;
}
