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
      label: t('tabScan') || 'SCAN',
      icon: <Terminal className="w-4 h-4" />,
    },
    {
      id: 'activity',
      label: t('tabActivity') || 'ACTIVITY',
      icon: <Zap className="w-4 h-4" />,
    },
    {
      id: 'wallet',
      label: t('tabWallet') || 'VAULT',
      icon: <Wallet className="w-4 h-4" />,
    },
    {
      id: 'referral',
      label: t('tabReferral') || 'PARTNERS',
      icon: <Users className="w-4 h-4" />,
    },
  ];

  const handleTabClick = (tabId: TabType) => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    } catch {}
    onSelectTab(tabId);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center px-4 safe-bottom pb-4">
      {/* Floating Precision Dock */}
      <nav className="pointer-events-auto w-full max-w-md bottom-nav-glass rounded-2xl p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.8)] border border-white/10 relative">
        {/* Subtle top edge highlight */}
        <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        <div className="grid grid-cols-4 gap-1">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            const isDisabled = disabledTabs.includes(tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!isDisabled) {
                    handleTabClick(tab.id);
                  }
                }}
                disabled={isDisabled}
                type="button"
                className={`relative py-2 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-150 select-none ${
                  isDisabled
                    ? 'opacity-30 cursor-not-allowed text-[#475569]'
                    : isActive
                    ? 'text-white cursor-pointer active:scale-95'
                    : 'text-[#94A3B8] hover:text-[#CBD5E1] cursor-pointer group active:scale-95'
                }`}
              >
                {/* Active Dock Plate */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-white/[0.08] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] pointer-events-none" />
                )}

                {/* Active Micro-Indicator */}
                {isActive && (
                  <div className="absolute top-1 w-3.5 h-0.5 bg-[#22D3EE] rounded-full pointer-events-none" />
                )}

                {/* Icon */}
                <div
                  className={`relative z-10 transition-transform duration-150 ${
                    isDisabled
                      ? 'scale-90 opacity-60'
                      : isActive
                      ? 'text-[#38E8FF]'
                      : 'text-[#94A3B8] group-hover:scale-105'
                  }`}
                >
                  {tab.icon}
                </div>

                {/* Label */}
                <span
                  className={`relative z-10 text-[9.5px] font-bold tracking-wider transition-colors ${
                    isDisabled
                      ? 'text-[#475569]'
                      : isActive
                      ? 'text-white font-extrabold'
                      : 'text-[#94A3B8]'
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
