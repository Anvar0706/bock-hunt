'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('@/App'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-[#0A0C10] text-[#38E8FF]">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#38E8FF] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-mono text-xs tracking-wider text-slate-400">BLOCKHUNT COMMAND CONSOLE LOADING...</p>
      </div>
    </div>
  ),
});

export default function AdminPage() {
  return <App />;
}
