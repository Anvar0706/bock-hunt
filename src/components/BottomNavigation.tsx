import React from 'react';
import type { TabType } from '../types';
import { Terminal, Zap, Wallet, Users } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface BottomNavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  disabledTabs?: TabType[];
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onSelectTab,
  disabledTabs = [],
}) => {
  const { t } = useLanguage();

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    {
      id: 'scan',
      label: t('tabScan'),
      icon: <Terminal className="w-5 h-5" />,
    },
    {
      id: 'activity',
      label: t('tabActivity'),
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: 'wallet',
      label: t('tabWallet'),
      icon: <Wallet className="w-5 h-5" />,
    },
    {
      id: 'referral',
      label: t('tabReferral'),
      icon: <Users className="w-5 h-5" />,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center px-4 safe-bottom pb-4">
      {/* Floating 3D Rounded Pill Container */}
      <nav className="pointer-events-auto w-full max-w-md bottom-nav-glass rounded-full p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.85)] border border-white/12 relative">
        {/* Top ambient highlight on pill */}
        <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        <div className="grid grid-cols-4 gap-1">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            const isDisabled = disabledTabs.includes(tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!isDisabled) {
                    onSelectTab(tab.id);
                  }
                }}
                disabled={isDisabled}
                type="button"
                className={`relative py-2.5 px-3 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-200 select-none ${
                  isDisabled
                    ? 'opacity-30 cursor-not-allowed text-[#64748B]'
                    : isActive
                    ? 'text-[#38E8FF] cursor-pointer active:scale-95'
                    : 'text-[#9CA3AF] hover:text-white cursor-pointer group active:scale-95'
                }`}
              >
                {/* Active 3D Liquid Glass Backplate */}
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/12 to-white/3 border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_12px_rgba(0,0,0,0.4)] pointer-events-none" />
                )}

                {/* Active Cyan Glow Burst */}
                {isActive && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#22D3EE] rounded-full shadow-[0_0_10px_#22D3EE] pointer-events-none" />
                )}

                {/* Icon with slight elevation when active */}
                <div
                  className={`relative z-10 transition-transform duration-200 ${
                    isDisabled
                      ? 'scale-90 opacity-60'
                      : isActive
                      ? '-translate-y-0.5 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]'
                      : 'group-hover:scale-105'
                  }`}
                >
                  {tab.icon}
                </div>

                {/* Label */}
                <span
                  className={`relative z-10 text-[10px] font-bold tracking-widest transition-all ${
                    isDisabled
                      ? 'text-[#64748B]'
                      : isActive
                      ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                      : 'text-[#9CA3AF]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
