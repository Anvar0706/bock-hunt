'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('@/App'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-[#181820] text-cyan-400">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-mono text-sm tracking-wider text-cyan-300">BLOCKHUNT PROTOCOL INITIALIZING...</p>
      </div>
    </div>
  ),
});

export default function Page() {
  return <App />;
}
