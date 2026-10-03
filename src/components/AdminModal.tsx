import React, { useState, useEffect, useRef } from 'react';
import type { AdminDepositAddresses, AdminUser, PricingSettings, ExtractionRecord, WithdrawalRequest } from '../types';
import {
  X,
  ShieldCheck,
  Check,
  RotateCcw,
  Save,
  Users,
  Wallet,
  Search,
  Crown,
  Lock,
  Copy,
  Trash2,
  Tag,
  Palette,
  Plus,
  Minus,
  Eye,
  Sliders,
  Sparkles,
  Send,
  MessageSquare,
  Activity,
  Ban,
  Radio,
  ArrowUpRight,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  DEFAULT_ADMIN_DEPOSIT_ADDRESSES,
  DEFAULT_ADMIN_USERS,
  DEFAULT_PRICING_SETTINGS,
  PROMO_THEME_PRESETS,
} from '../data/adminSettings';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: AdminDepositAddresses;
  onSaveAddresses: (addresses: AdminDepositAddresses) => void;
  users?: AdminUser[];
  onUpdateUsers?: (users: AdminUser[]) => void;
  pricingSettings?: PricingSettings;
  onSavePricingSettings?: (newSettings: PricingSettings) => void;
  onResetUserLimit?: (userId?: string) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  addresses,
  onSaveAddresses,
  users = DEFAULT_ADMIN_USERS,
  onUpdateUsers,
  pricingSettings = DEFAULT_PRICING_SETTINGS,
  onSavePricingSettings,
  onResetUserLimit,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'wallets' | 'pricing' | 'users' | 'withdrawals'>('wallets');

  // Withdrawals Management State
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [txHashInputs, setTxHashInputs] = useState<Record<string, string>>({});
  const [processingWdrId, setProcessingWdrId] = useState<string | null>(null);
  const [wdrFilter, setWdrFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'REJECTED'>('ALL');
  const [copiedWdrAddress, setCopiedWdrAddress] = useState<string | null>(null);


  // Wallets form state
  const [tronAddress, setTronAddress] = useState(addresses.TRON);
  const [ethAddress, setEthAddress] = useState(addresses.ETHEREUM);
  const [solAddress, setSolAddress] = useState(addresses.SOLANA);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state whenever modal opens or addresses update
  useEffect(() => {
    if (isOpen && addresses) {
      setTronAddress(addresses.TRON || DEFAULT_ADMIN_DEPOSIT_ADDRESSES.TRON);
      setEthAddress(addresses.ETHEREUM || DEFAULT_ADMIN_DEPOSIT_ADDRESSES.ETHEREUM);
      setSolAddress(addresses.SOLANA || DEFAULT_ADMIN_DEPOSIT_ADDRESSES.SOLANA);
    }
  }, [isOpen, addresses]);

  // Pricing & Promo management state
  const [pricingForm, setPricingForm] = useState<PricingSettings>(pricingSettings || DEFAULT_PRICING_SETTINGS);
  const [pricingSavedSuccess, setPricingSavedSuccess] = useState(false);

  // Sync pricing from props
  useEffect(() => {
    if (pricingSettings) {
      setPricingForm(pricingSettings);
    }
  }, [pricingSettings]);

  // Users management state
  const [userList, setUserList] = useState<AdminUser[]>(users);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'blocked' | 'paid'>('all');
  const [userActionMessage, setUserActionMessage] = useState<string | null>(null);
  const [copiedTgId, setCopiedTgId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetStatsConfirmId, setResetStatsConfirmId] = useState<string | null>(null);
  const initialUsersSyncedRef = useRef(false);

  // Broadcast & Direct Message state
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | AdminUser>('all');
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  // User Activity Drawer state
  const [activityModalUser, setActivityModalUser] = useState<AdminUser | null>(null);
  const [userExtractions, setUserExtractions] = useState<ExtractionRecord[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Sync users from props once initially, but allow local actions and live fetches to manage state
  useEffect(() => {
    if (users && users.length > 0 && !initialUsersSyncedRef.current) {
      setUserList(users);
      initialUsersSyncedRef.current = true;
    }
  }, [users]);

  // Fetch live real users from backend API
  const fetchLiveUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.users)) {
          setUserList(data.users);
          if (onUpdateUsers) onUpdateUsers(data.users);
        }
      }
    } catch (err) {
      console.error('Failed to load live users from API:', err);
    }
  };

  // Fetch live pricing settings from backend API
  const fetchLivePricing = async () => {
    try {
      const res = await fetch('/api/pricing-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.settings) {
          setPricingForm(data.settings);
          if (onSavePricingSettings) onSavePricingSettings(data.settings);
        }
      }
    } catch (err) {
      console.error('Failed to load live pricing from API:', err);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch('/api/admin/withdrawals');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.withdrawals)) {
          setWithdrawals(data.withdrawals);
        }
      }
    } catch (err) {
      console.error('Failed to load withdrawals:', err);
    }
  };

  const handleUpdateWithdrawal = async (id: string, status: 'PAID' | 'REJECTED', noteParam?: string) => {
    setProcessingWdrId(id);
    try {
      const txHash = txHashInputs[id] || '';
      const note = noteParam || '';
      const res = await fetch('/api/admin/withdrawals/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, txHash, note }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchWithdrawals();
        setUserActionMessage(status === 'PAID' ? 'PAYOUT APPROVED & MARKED PAID!' : 'PAYOUT REJECTED & REFUNDED!');
        setTimeout(() => setUserActionMessage(null), 3000);
      } else {
        setUserActionMessage(`Error: ${data.error}`);
        setTimeout(() => setUserActionMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('Error updating withdrawal:', err);
      setUserActionMessage(`Error: ${err.message}`);
      setTimeout(() => setUserActionMessage(null), 3000);
    } finally {
      setProcessingWdrId(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLiveUsers();
      fetchWithdrawals();
      fetchLivePricing();
    }
  }, [isOpen, activeTab]);

  const handleSavePricing = async () => {
    try {
      const res = await fetch('/api/pricing-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricingForm),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.settings) {
          setPricingForm(data.settings);
          if (onSavePricingSettings) onSavePricingSettings(data.settings);
        }
      }
    } catch (err) {
      console.error('Failed to sync pricing settings to server:', err);
      if (onSavePricingSettings) onSavePricingSettings(pricingForm);
    }
    setPricingSavedSuccess(true);
    setTimeout(() => setPricingSavedSuccess(false), 2000);
  };

  const handleResetPricingDefaults = () => {
    setPricingForm(DEFAULT_PRICING_SETTINGS);
  };

  const syncUserActionToServer = async (payload: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.users)) {
          setUserList(data.users);
          if (onUpdateUsers) onUpdateUsers(data.users);
        }
      }
    } catch (err) {
      console.error('Failed to sync user action to server:', err);
    }
  };

  if (!isOpen) return null;

  const handleSaveAddresses = () => {
    onSaveAddresses({
      TRON: tronAddress.trim(),
      ETHEREUM: ethAddress.trim(),
      SOLANA: solAddress.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 1800);
  };

  const handleResetDefaults = () => {
    setTronAddress(DEFAULT_ADMIN_DEPOSIT_ADDRESSES.TRON);
    setEthAddress(DEFAULT_ADMIN_DEPOSIT_ADDRESSES.ETHEREUM);
    setSolAddress(DEFAULT_ADMIN_DEPOSIT_ADDRESSES.SOLANA);
  };

  const handleCopyTgId = (tgId: string) => {
    navigator.clipboard?.writeText(tgId);
    setCopiedTgId(tgId);
    setTimeout(() => setCopiedTgId(null), 1500);
  };

  // User Actions
  const handleUpdatePlan = (userId: string, newPlan: 'community' | 'pro' | 'enterprise') => {
    const updated = userList.map((u) => {
      if (u.id === userId || u.tgId === userId) {
        return {
          ...u,
          plan: newPlan,
        };
      }
      return u;
    });
    setUserList(updated);
    if (onUpdateUsers) onUpdateUsers(updated);
    syncUserActionToServer({ action: 'update_plan', userId, plan: newPlan });
    setUserActionMessage(`Plan updated to ${newPlan.toUpperCase()}!`);
    setTimeout(() => setUserActionMessage(null), 2000);
  };

  const handleResetUserExtracts = async (userId: string) => {
    const cleanId = String(userId).replace('user-', '');
    const updated = userList.map((u) => {
      if (
        String(u.id) === String(userId) ||
        String(u.tgId) === String(userId) ||
        String(u.tgId) === cleanId ||
        String(u.id) === `user-${cleanId}`
      ) {
        return {
          ...u,
          extractsCount: 0,
        };
      }
      return u;
    });
    setUserList(updated);
    if (onUpdateUsers) onUpdateUsers(updated);

    await syncUserActionToServer({ action: 'reset_limit', userId });
    if (onResetUserLimit) onResetUserLimit(userId);

    setUserActionMessage(t('freeLimitResetSuccess') || 'Free extraction limit reset to 0/1!');
    setTimeout(() => setUserActionMessage(null), 2500);
  };

  const handleResetAllLimits = async () => {
    const updated = userList.map((u) => ({ ...u, extractsCount: 0 }));
    setUserList(updated);
    if (onUpdateUsers) onUpdateUsers(updated);

    await syncUserActionToServer({ action: 'reset_limit', userId: 'all' });
    if (onResetUserLimit) onResetUserLimit('all');

    setUserActionMessage(t('allLimitsResetSuccess') || 'All users free limits reset to 0/1!');
    setTimeout(() => setUserActionMessage(null), 2500);
  };

  const executeResetUserStats = async (userId: string) => {
    setResetStatsConfirmId(null);
    const cleanId = String(userId).replace('user-', '');
    const updated = userList.map((u) => {
      if (
        String(u.id) === String(userId) ||
        String(u.tgId) === String(userId) ||
        String(u.tgId) === cleanId ||
        String(u.id) === `user-${cleanId}`
      ) {
        return {
          ...u,
          extractsCount: 0,
          totalExtractedUsd: 0,
        };
      }
      return u;
    });
    setUserList(updated);
    if (onUpdateUsers) onUpdateUsers(updated);

    await syncUserActionToServer({ action: 'reset_stats', userId });
    if (onResetUserLimit) onResetUserLimit(userId);

    setUserActionMessage('User stats reset to $0.');
    setTimeout(() => setUserActionMessage(null), 2500);
  };

  const handleToggleUserStatus = (userId: string) => {
    const cleanId = String(userId).replace('user-', '');
    const target = userList.find(
      (u) =>
        String(u.id) === String(userId) ||
        String(u.tgId) === String(userId) ||
        String(u.tgId) === cleanId
    );
    const isBlocked = target?.status === 'BLOCKED' || target?.status === 'RESTRICTED';
    const nextStatus = (isBlocked ? 'ACTIVE' : 'BLOCKED') as 'ACTIVE' | 'BLOCKED';

    const updated = userList.map((u) => {
      if (
        String(u.id) === String(userId) ||
        String(u.tgId) === String(userId) ||
        String(u.tgId) === cleanId ||
        String(u.id) === `user-${cleanId}`
      ) {
        return {
          ...u,
          status: nextStatus,
          blockedAt: nextStatus === 'BLOCKED' ? new Date().toISOString() : undefined,
        };
      }
      return u;
    });
    setUserList(updated);
    if (onUpdateUsers) onUpdateUsers(updated);
    syncUserActionToServer({ action: 'toggle_status', userId, status: nextStatus });
    setUserActionMessage(nextStatus === 'BLOCKED' ? 'User BLOCKED.' : 'User ACTIVATED.');
    setTimeout(() => setUserActionMessage(null), 2000);
  };

  const executeDeleteUser = async (userId: string) => {
    setDeleteConfirmId(null);
    const cleanId = String(userId).replace('user-', '');
    const updated = userList.filter(
      (u) =>
        String(u.id) !== String(userId) &&
        String(u.tgId) !== String(userId) &&
        String(u.tgId) !== cleanId &&
        String(u.id) !== `user-${cleanId}`
    );
    setUserList(updated);
    if (onUpdateUsers) onUpdateUsers(updated);

    await syncUserActionToServer({ action: 'delete', userId });
    setUserActionMessage(t('userDeletedPermanently') || 'User deleted permanently.');
    setTimeout(() => setUserActionMessage(null), 2500);
  };

  // Activity Modal Handler
  const handleOpenUserActivity = async (u: AdminUser) => {
    setActivityModalUser(u);
    setLoadingActivity(true);
    setUserExtractions([]);
    try {
      const res = await fetch(`/api/extractions?tgId=${u.tgId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.extractions)) {
          setUserExtractions(data.extractions);
        }
      }
    } catch (err) {
      console.error('Failed to load user extractions:', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  // Broadcast & Direct Message Handlers
  const handleOpenBroadcast = (target: 'all' | AdminUser) => {
    setBroadcastTarget(target);
    setBroadcastText('');
    setBroadcastResult(null);
    setBroadcastModalOpen(true);
  };

  const handleSendBroadcast = async () => {
    if (!broadcastText.trim()) return;
    setBroadcastSending(true);
    setBroadcastResult(null);
    try {
      const targetParam = broadcastTarget === 'all' ? 'all' : broadcastTarget.tgId;
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: targetParam,
          message: broadcastText.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setBroadcastResult(`Delivered: ${data.delivered}, Failed: ${data.failed}`);
        setTimeout(() => {
          setBroadcastModalOpen(false);
          setBroadcastResult(null);
        }, 1800);
      } else {
        setBroadcastResult(`Error: ${data.error || 'Failed'}`);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setBroadcastResult(`Network error: ${errorMsg}`);
    } finally {
      setBroadcastSending(false);
    }
  };

  // Filter users by search and active filter tab
  const filteredUsers = userList.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.tgId.includes(q) ||
      u.plan.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (userFilter === 'active') return u.status === 'ACTIVE';
    if (userFilter === 'blocked') return u.status === 'BLOCKED' || u.status === 'RESTRICTED';
    if (userFilter === 'paid') return u.plan !== 'community';
    return true;
  });

  const totalVolume = userList.reduce((acc, u) => acc + u.totalExtractedUsd, 0);
  const proCount = userList.filter((u) => u.plan !== 'community').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col animate-modal-3d">
        <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-b from-[#38E8FF]/60 via-white/10 to-black/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(34,211,238,0.2)] flex flex-col overflow-hidden">
          <div className="glass-panel-3d rounded-3xl p-5 relative overflow-hidden bg-[#141724] flex flex-col max-h-[90vh]">
            {/* Top highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#38E8FF]/80 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#22D3EE]/20 border border-[#22D3EE]/40 flex items-center justify-center text-[#38E8FF] shadow-[0_0_12px_rgba(34,211,238,0.3)]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-wider text-white">
                    {t('adminTitle')}
                  </h3>
                  <span className="text-[10px] font-mono text-[#38E8FF] tracking-wider uppercase font-semibold">
                    {t('adminSubtitle')}
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-black/50 border border-white/10 mb-3.5 shrink-0 text-xs">
              <button
                onClick={() => setActiveTab('wallets')}
                type="button"
                className={`py-2 px-1 rounded-xl font-bold tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'wallets'
                    ? 'bg-[#22D3EE]/20 text-[#38E8FF] border border-[#22D3EE]/40 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('tabWallets')}</span>
              </button>

              <button
                onClick={() => setActiveTab('pricing')}
                type="button"
                className={`py-2 px-1 rounded-xl font-bold tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'pricing'
                    ? 'bg-[#22D3EE]/20 text-[#38E8FF] border border-[#22D3EE]/40 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <Tag className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('tabPricing')}</span>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                type="button"
                className={`py-2 px-1 rounded-xl font-bold tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-[#22D3EE]/20 text-[#38E8FF] border border-[#22D3EE]/40 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('tabUsers')}</span>
              </button>

              <button
                onClick={() => setActiveTab('withdrawals')}
                type="button"
                className={`py-2 px-1 rounded-xl font-bold tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer relative ${
                  activeTab === 'withdrawals'
                    ? 'bg-[#22D3EE]/20 text-[#38E8FF] border border-[#22D3EE]/40 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span className="truncate">{t('tabWithdrawals')}</span>
                {withdrawals.filter((w) => w.status === 'PENDING').length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[9px] font-bold font-mono animate-pulse">
                    {withdrawals.filter((w) => w.status === 'PENDING').length}
                  </span>
                )}
              </button>
            </div>

            {/* Action Feedback Toast */}
            {(savedSuccess || pricingSavedSuccess || userActionMessage) && (
              <div className="mb-3 p-2.5 rounded-xl bg-[#00E676]/15 border border-[#00E676]/40 text-center animate-fadeIn shrink-0">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#00E676]">
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {pricingSavedSuccess
                      ? (t('pricingSavedSuccess') || 'PRICING & PROMO SAVED!')
                      : savedSuccess
                      ? 'ADDRESSES UPDATED SUCCESSFULLY!'
                      : userActionMessage}
                  </span>
                </div>
              </div>
            )}

            {/* TAB 1: WALLETS */}
            {activeTab === 'wallets' && (
              <div className="space-y-3.5 overflow-y-auto terminal-scroll pr-1">
                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-[11px] text-[#9CA3AF]">
                  Configure the receiving wallets for license upgrades (PRO & ENTERPRISE). Users will see these addresses when paying in TRX, SOL, or ETH.
                </div>

                <div className="space-y-3">
                  {/* TRON */}
                  <div className="bg-black/50 rounded-2xl p-3 border border-white/10 focus-within:border-[#22D3EE]/50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10.5px] font-bold text-[#CBD5E1] uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#38E8FF]" />
                        <span>TRON (TRX / USDT TRC-20) Destination</span>
                      </label>
                      <span className="text-[9px] font-mono text-[#9CA3AF]">BASE58</span>
                    </div>
                    <input
                      type="text"
                      value={tronAddress}
                      onChange={(e) => setTronAddress(e.target.value)}
                      placeholder="e.g. TLsV52sRDL79HXGGm9yzwKibb6XuUadTnS"
                      className="w-full bg-transparent text-xs font-mono text-[#38E8FF] focus:outline-none border-b border-white/10 focus:border-[#38E8FF] py-1"
                    />
                  </div>

                  {/* ETHEREUM */}
                  <div className="bg-black/50 rounded-2xl p-3 border border-white/10 focus-within:border-[#22D3EE]/50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10.5px] font-bold text-[#CBD5E1] uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#00E676]" />
                        <span>ETHEREUM (ETH ERC-20) Destination</span>
                      </label>
                      <span className="text-[9px] font-mono text-[#9CA3AF]">HEX (0x...)</span>
                    </div>
                    <input
                      type="text"
                      value={ethAddress}
                      onChange={(e) => setEthAddress(e.target.value)}
                      placeholder="e.g. 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                      className="w-full bg-transparent text-xs font-mono text-[#00E676] focus:outline-none border-b border-white/10 focus:border-[#00E676] py-1"
                    />
                  </div>

                  {/* SOLANA */}
                  <div className="bg-black/50 rounded-2xl p-3 border border-white/10 focus-within:border-[#22D3EE]/50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10.5px] font-bold text-[#CBD5E1] uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#A855F7]" />
                        <span>SOLANA (SOL) Destination</span>
                      </label>
                      <span className="text-[9px] font-mono text-[#9CA3AF]">BASE58</span>
                    </div>
                    <input
                      type="text"
                      value={solAddress}
                      onChange={(e) => setSolAddress(e.target.value)}
                      placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                      className="w-full bg-transparent text-xs font-mono text-[#C084FC] focus:outline-none border-b border-white/10 focus:border-[#C084FC] py-1"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    onClick={handleSaveAddresses}
                    type="button"
                    className="flex-1 py-3 px-4 rounded-xl button-dark-metal flex items-center justify-center gap-2 text-xs font-bold tracking-wider text-white hover:text-[#38E8FF] uppercase cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-[#22D3EE]" />
                    <span>{t('saveAddresses')}</span>
                  </button>

                  <button
                    onClick={handleResetDefaults}
                    type="button"
                    className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#9CA3AF] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Reset to default addresses"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('defaultsBtn')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: PRICING & PROMO */}
            {activeTab === 'pricing' && (
              <div className="space-y-4 overflow-y-auto terminal-scroll pr-1">
                {/* 1. Master Discount Controls */}
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-white tracking-wide uppercase flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#38E8FF]" />
                        <span>{t('discountSettingsTitle')}</span>
                      </h4>
                      <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                        {t('enableDiscount')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPricingForm((prev) => ({
                          ...prev,
                          discount: { ...prev.discount, enabled: !prev.discount.enabled },
                        }))
                      }
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                        pricingForm.discount.enabled
                          ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/50 shadow-[0_0_10px_rgba(0,230,118,0.3)]'
                          : 'bg-white/5 text-[#9CA3AF] border border-white/10'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          pricingForm.discount.enabled ? 'bg-[#00E676] animate-pulse' : 'bg-[#64748B]'
                        }`}
                      />
                      <span>{pricingForm.discount.enabled ? 'ACTIVE (ON)' : 'DISABLED (OFF)'}</span>
                    </button>
                  </div>

                  {pricingForm.discount.enabled && (
                    <div className="pt-2 border-t border-white/5 space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#CBD5E1] text-[11px] font-semibold">
                          {t('discountPercent')}
                        </span>
                        <span className="font-mono font-extrabold text-[#00E676] text-sm">
                          {pricingForm.discount.percent}% OFF
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="5"
                          max="90"
                          step="5"
                          value={pricingForm.discount.percent}
                          onChange={(e) =>
                            setPricingForm((prev) => ({
                              ...prev,
                              discount: { ...prev.discount, percent: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-[#00E676] cursor-pointer"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          {[25, 50, 70].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() =>
                                setPricingForm((prev) => ({
                                  ...prev,
                                  discount: { ...prev.discount, percent: pct },
                                }))
                              }
                              className={`px-2 py-0.5 rounded-lg text-[9.5px] font-mono font-bold transition-all cursor-pointer ${
                                pricingForm.discount.percent === pct
                                  ? 'bg-[#00E676]/30 text-[#00E676] border border-[#00E676]/60'
                                  : 'bg-white/5 text-[#9CA3AF] border border-white/10 hover:text-white'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Plan Base Pricing (Pro Suite & Enterprise) */}
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-3">
                  <h4 className="text-xs font-extrabold text-white tracking-wide uppercase flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#38E8FF]" />
                    <span>{t('planPricingTitle')}</span>
                  </h4>

                  {/* PRO SUITE */}
                  <div className="p-3 rounded-xl bg-black/60 border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#38E8FF]">PRO SUITE</span>
                      <span className="text-[10px] font-mono text-[#9CA3AF]">
                        {pricingForm.discount.enabled
                          ? `Effective: $${Math.round(pricingForm.plans.pro.weekly * (1 - pricingForm.discount.percent / 100))}/wk · $${Math.round(pricingForm.plans.pro.monthly * (1 - pricingForm.discount.percent / 100))}/mo`
                          : `Standard: $${pricingForm.plans.pro.weekly}/wk · $${pricingForm.plans.pro.monthly}/mo`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Weekly */}
                      <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                        <span className="text-[9.5px] font-bold text-[#9CA3AF] block mb-1">Weekly Base ($USD)</span>
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setPricingForm((prev) => ({
                                ...prev,
                                plans: {
                                  ...prev.plans,
                                  pro: { ...prev.plans.pro, weekly: Math.max(1, prev.plans.pro.weekly - 5) },
                                },
                              }))
                            }
                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={pricingForm.plans.pro.weekly}
                            onChange={(e) =>
                              setPricingForm((prev) => ({
                                ...prev,
                                plans: {
                                  ...prev.plans,
                                  pro: { ...prev.plans.pro, weekly: Math.max(1, Number(e.target.value)) },
                                },
                              }))
                            }
                            className="w-14 text-center bg-black/60 border border-white/10 rounded py-0.5 text-xs font-mono font-bold text-[#38E8FF]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPricingForm((prev) => ({
                                ...prev,
                                plans: {
                                  ...prev.plans,
                                  pro: { ...prev.plans.pro, weekly: prev.plans.pro.weekly + 5 },
                                },
                              }))
                            }
                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Monthly */}
                      <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                        <span className="text-[9.5px] font-bold text-[#9CA3AF] block mb-1">Monthly Base ($USD)</span>
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setPricingForm((prev) => ({
                                ...prev,
                                plans: {
                                  ...prev.plans,
                                  pro: { ...prev.plans.pro, monthly: Math.max(1, prev.plans.pro.monthly - 5) },
                                },
                              }))
                            }
                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={pricingForm.plans.pro.monthly}
                            onChange={(e) =>
                              setPricingForm((prev) => ({
                                ...prev,
                                plans: {
                                  ...prev.plans,
                                  pro: { ...prev.plans.pro, monthly: Math.max(1, Number(e.target.value)) },
                                },
                              }))
                            }
                            className="w-14 text-center bg-black/60 border border-white/10 rounded py-0.5 text-xs font-mono font-bold text-[#38E8FF]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPricingForm((prev) => ({
                                ...prev,
                                plans: {
                                  ...prev.plans,
                                  pro: { ...prev.plans.pro, monthly: prev.plans.pro.monthly + 5 },
                                },
                              }))
                            }
                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ENTERPRISE */}
                  <div className="p-3 rounded-xl bg-black/60 border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#FCD34D]">ENTERPRISE</span>
                      <span className="text-[10px] font-mono text-[#9CA3AF]">
                        {pricingForm.discount.enabled
                          ? `Effective: $${Math.round(pricingForm.plans.enterprise.weekly * (1 - pricingForm.discount.percent / 100))}/wk · $${Math.round(pricingForm.plans.enterprise.monthly * (1 - pricingForm.discount.percent / 100))}/mo`
                          : `Standard: $${pricingForm.plans.enterprise.weekly}/wk · $${pricingForm.plans.enterprise.monthly}/mo`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Weekly */}
                      <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                        <span className="text-[9.5px] font-bold text-[#9CA3AF] block mb-1">Weekly Base ($USD)</span>
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setPricingForm((prev) => ({
                                ...prev,
                                plans: {
                                  ...prev.plans,
                                  enterprise: { ...prev.plans.enterprise, weekly: Math.max(1, prev.plans.enterprise.weekly - 5) },
                                },
                              }))
                            }
                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={pricingForm.plans.enterprise.weekly}
                            onChange={(e) =>
                              setPricingForm((prev) => ({
                                ...prev,
                                plans: {
                                  ...prev.plans,
                                  enterprise: { ...prev.plans.enterprise, weekly: Math.max(1, Number(e.target.value)) },
                                },
                              }))
                            }
                            className="w-14 text-center bg-black/60 border border-white/10 rounded py-0.5 text-xs font-mono font-bold text-[#FCD34D]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPricingForm((prev) => ({
                                ...prev,
                                plans: {
                                  ...prev.plans,
                                  enterprise: { ...prev.plans.enterprise, weekly: prev.plans.enterprise.weekly + 5 },
                                },
                              }))
                            }
                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Monthly */}
                      <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                        <span className="text-[9.5px] font-bold text-[#9CA3AF] block mb-1">Monthly Base ($USD)</span>
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setPricingForm((prev) => ({
                                ...prev,
                                plans: {
                                  ...prev.plans,
                                  enterprise: { ...prev.plans.enterprise, monthly: Math.max(1, prev.plans.enterprise.monthly - 10) },
                                },
                              }))
                            }
                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={pricingForm.plans.enterprise.monthly}
                            onChange={(e) =>
                              setPricingForm((prev) => ({
                                ...prev,
                                plans: {
                                  ...prev.plans,
                                  enterprise: { ...prev.plans.enterprise, monthly: Math.max(1, Number(e.target.value)) },
                                },
                              }))
                            }
                            className="w-14 text-center bg-black/60 border border-white/10 rounded py-0.5 text-xs font-mono font-bold text-[#FCD34D]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPricingForm((prev) => ({
                                ...prev,
                                plans: {
                                  ...prev.plans,
                                  enterprise: { ...prev.plans.enterprise, monthly: prev.plans.enterprise.monthly + 10 },
                                },
                              }))
                            }
                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Promo Banner Customization */}
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-white tracking-wide uppercase flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#FF0055]" />
                        <span>{t('promoBannerTitle')}</span>
                      </h4>
                      <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                        {t('bannerNotice')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPricingForm((prev) => ({
                          ...prev,
                          banner: { ...prev.banner, enabled: !prev.banner.enabled },
                        }))
                      }
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                        pricingForm.banner.enabled
                          ? 'bg-[#22D3EE]/20 text-[#38E8FF] border border-[#22D3EE]/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                          : 'bg-white/5 text-[#9CA3AF] border border-white/10'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          pricingForm.banner.enabled ? 'bg-[#38E8FF] animate-pulse' : 'bg-[#64748B]'
                        }`}
                      />
                      <span>{pricingForm.banner.enabled ? 'VISIBLE (ON)' : 'HIDDEN (OFF)'}</span>
                    </button>
                  </div>

                  {/* Theme Presets */}
                  <div>
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase block mb-1.5 flex items-center gap-1">
                      <Palette className="w-3 h-3 text-[#38E8FF]" />
                      <span>{t('bannerThemePresets')}</span>
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {PROMO_THEME_PRESETS.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() =>
                            setPricingForm((prev) => ({
                              ...prev,
                              banner: {
                                ...prev.banner,
                                textColor: theme.textColor,
                                bgColor: theme.bgColor,
                                borderColor: theme.borderColor,
                                badgeBgColor: theme.badgeBgColor,
                                badgeTextColor: theme.badgeTextColor,
                              },
                            }))
                          }
                          className="p-1.5 rounded-xl border border-white/10 text-center font-bold text-[10px] text-white hover:border-[#38E8FF]/60 transition-all cursor-pointer truncate"
                          style={{ background: theme.bgColor }}
                        >
                          {theme.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Interactive Preview Card */}
                  <div>
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase block mb-1 flex items-center gap-1">
                      <Eye className="w-3 h-3 text-[#00E676]" />
                      <span>{t('livePreviewLabel')}</span>
                    </span>
                    {pricingForm.banner.enabled ? (
                      <div
                        className="p-2.5 rounded-2xl flex items-center justify-between shadow-md transition-all animate-fadeIn"
                        style={{
                          background: pricingForm.banner.bgColor,
                          borderColor: pricingForm.banner.borderColor,
                          borderWidth: '1px',
                          borderStyle: 'solid',
                        }}
                      >
                        <div className="flex items-center gap-2 text-xs font-black">
                          <span
                            className="px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wider uppercase shadow-sm"
                            style={{
                              background: pricingForm.banner.badgeBgColor,
                              color: pricingForm.banner.badgeTextColor,
                            }}
                          >
                            {pricingForm.banner.badgeText || '50% OFF'}
                          </span>
                          <span
                            className="text-[11px] font-bold tracking-wide"
                            style={{ color: pricingForm.banner.textColor }}
                          >
                            {pricingForm.banner.textEn || 'New members get 50% off their first month!'}
                          </span>
                        </div>
                        <span
                          className="text-[9.5px] font-mono font-bold shrink-0 uppercase tracking-wider opacity-80"
                          style={{ color: pricingForm.banner.textColor }}
                        >
                          PROMO
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-black/40 border border-dashed border-white/10 text-center text-[10.5px] text-[#64748B]">
                        Banner is currently disabled (cleanly hidden from Licensing modal)
                      </div>
                    )}
                  </div>

                  {/* Banner Text Inputs */}
                  <div className="space-y-2.5 pt-2 border-t border-white/5">
                    <div>
                      <label className="text-[10px] font-bold text-[#CBD5E1] block mb-1">
                        {t('bannerTextEn')}
                      </label>
                      <input
                        type="text"
                        value={pricingForm.banner.textEn}
                        onChange={(e) =>
                          setPricingForm((prev) => ({
                            ...prev,
                            banner: { ...prev.banner, textEn: e.target.value },
                          }))
                        }
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#38E8FF]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#CBD5E1] block mb-1">
                        {t('bannerTextRu')}
                      </label>
                      <input
                        type="text"
                        value={pricingForm.banner.textRu}
                        onChange={(e) =>
                          setPricingForm((prev) => ({
                            ...prev,
                            banner: { ...prev.banner, textRu: e.target.value },
                          }))
                        }
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#38E8FF]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#CBD5E1] block mb-1">
                        {t('badgeTextLabel')}
                      </label>
                      <input
                        type="text"
                        value={pricingForm.banner.badgeText}
                        onChange={(e) =>
                          setPricingForm((prev) => ({
                            ...prev,
                            banner: { ...prev.banner, badgeText: e.target.value },
                          }))
                        }
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#38E8FF]"
                      />
                    </div>

                    {/* Color inputs */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* Text Color */}
                      <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[9.5px] font-bold text-[#9CA3AF] block mb-1">{t('bannerTextColor')}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={pricingForm.banner.textColor.startsWith('#') ? pricingForm.banner.textColor : '#FFFFFF'}
                            onChange={(e) =>
                              setPricingForm((prev) => ({
                                ...prev,
                                banner: { ...prev.banner, textColor: e.target.value },
                              }))
                            }
                            className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            value={pricingForm.banner.textColor}
                            onChange={(e) =>
                              setPricingForm((prev) => ({
                                ...prev,
                                banner: { ...prev.banner, textColor: e.target.value },
                              }))
                            }
                            className="w-full bg-black/60 border border-white/10 rounded px-1.5 py-1 text-[10px] font-mono text-white"
                          />
                        </div>
                      </div>

                      {/* Border Color */}
                      <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[9.5px] font-bold text-[#9CA3AF] block mb-1">{t('bannerBorderColor')}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={pricingForm.banner.borderColor.startsWith('#') ? pricingForm.banner.borderColor : '#FF0055'}
                            onChange={(e) =>
                              setPricingForm((prev) => ({
                                ...prev,
                                banner: { ...prev.banner, borderColor: e.target.value },
                              }))
                            }
                            className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            value={pricingForm.banner.borderColor}
                            onChange={(e) =>
                              setPricingForm((prev) => ({
                                ...prev,
                                banner: { ...prev.banner, borderColor: e.target.value },
                              }))
                            }
                            className="w-full bg-black/60 border border-white/10 rounded px-1.5 py-1 text-[10px] font-mono text-white"
                          />
                        </div>
                      </div>

                      {/* Badge Background */}
                      <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[9.5px] font-bold text-[#9CA3AF] block mb-1">{t('badgeBgColorLabel')}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={pricingForm.banner.badgeBgColor.startsWith('#') ? pricingForm.banner.badgeBgColor : '#FF0055'}
                            onChange={(e) =>
                              setPricingForm((prev) => ({
                                ...prev,
                                banner: { ...prev.banner, badgeBgColor: e.target.value },
                              }))
                            }
                            className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            value={pricingForm.banner.badgeBgColor}
                            onChange={(e) =>
                              setPricingForm((prev) => ({
                                ...prev,
                                banner: { ...prev.banner, badgeBgColor: e.target.value },
                              }))
                            }
                            className="w-full bg-black/60 border border-white/10 rounded px-1.5 py-1 text-[10px] font-mono text-white"
                          />
                        </div>
                      </div>

                      {/* Badge Text Color */}
                      <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[9.5px] font-bold text-[#9CA3AF] block mb-1">{t('badgeTextColorLabel')}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={pricingForm.banner.badgeTextColor.startsWith('#') ? pricingForm.banner.badgeTextColor : '#FFFFFF'}
                            onChange={(e) =>
                              setPricingForm((prev) => ({
                                ...prev,
                                banner: { ...prev.banner, badgeTextColor: e.target.value },
                              }))
                            }
                            className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            value={pricingForm.banner.badgeTextColor}
                            onChange={(e) =>
                              setPricingForm((prev) => ({
                                ...prev,
                                banner: { ...prev.banner, badgeTextColor: e.target.value },
                              }))
                            }
                            className="w-full bg-black/60 border border-white/10 rounded px-1.5 py-1 text-[10px] font-mono text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Background gradient string */}
                    <div>
                      <label className="text-[10px] font-bold text-[#CBD5E1] block mb-1">
                        {t('bannerBgColor')}
                      </label>
                      <input
                        type="text"
                        value={pricingForm.banner.bgColor}
                        onChange={(e) =>
                          setPricingForm((prev) => ({
                            ...prev,
                            banner: { ...prev.banner, bgColor: e.target.value },
                          }))
                        }
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-[10.5px] font-mono text-white focus:outline-none focus:border-[#38E8FF]"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing Save and Reset Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleResetPricingDefaults}
                    className="px-3 py-2.5 rounded-xl border border-white/10 bg-black/40 hover:bg-white/5 text-[#9CA3AF] hover:text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('defaultsBtn')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSavePricing}
                    className="flex-1 py-2.5 rounded-xl button-dark-metal text-white border border-[#22D3EE]/50 hover:border-[#38E8FF] font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.25)] transition-all"
                  >
                    <Save className="w-3.5 h-3.5 text-[#38E8FF]" />
                    <span>{t('savePricingChanges')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: USERS */}
            {activeTab === 'users' && (
              <div className="flex flex-col flex-1 overflow-hidden space-y-3">
                {/* Metrics Bar */}
                <div className="grid grid-cols-4 gap-1.5 shrink-0 text-center font-mono text-xs">
                  <div className="bg-black/50 p-2 rounded-xl border border-white/5">
                    <span className="text-[8.5px] text-[#9CA3AF] uppercase block">{t('totalUsers')}</span>
                    <span className="text-white font-extrabold text-sm">{userList.length}</span>
                  </div>
                  <div className="bg-black/50 p-2 rounded-xl border border-[#22D3EE]/20">
                    <span className="text-[8.5px] text-[#22D3EE] uppercase block">{t('paidTiers')}</span>
                    <span className="text-[#38E8FF] font-extrabold text-sm">{proCount}</span>
                  </div>
                  <div className="bg-black/50 p-2 rounded-xl border border-[#FF5252]/20">
                    <span className="text-[8.5px] text-[#FF5252] uppercase block">{t('filterBlocked')}</span>
                    <span className="text-[#FF5252] font-extrabold text-sm">
                      {userList.filter((u) => u.status === 'BLOCKED' || u.status === 'RESTRICTED').length}
                    </span>
                  </div>
                  <div className="bg-black/50 p-2 rounded-xl border border-[#00E676]/20">
                    <span className="text-[8.5px] text-[#00E676] uppercase block">{t('totalVolume')}</span>
                    <span className="text-[#00E676] font-extrabold text-xs leading-5 truncate block">
                      ${totalVolume.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Filter and Broadcast Control Bar */}
                <div className="flex flex-col gap-2 shrink-0">
                  {/* Search Bar + Broadcast Alert Button */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('searchUsers')}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]"
                      />
                    </div>
                    <button
                      onClick={() => handleOpenBroadcast('all')}
                      type="button"
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#22D3EE]/20 to-[#38E8FF]/30 hover:from-[#22D3EE]/30 hover:to-[#38E8FF]/40 border border-[#22D3EE]/40 text-[#38E8FF] font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(34,211,238,0.2)] shrink-0 transition-all active:scale-95"
                      title="Broadcast telegram message to all users"
                    >
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      <span className="hidden sm:inline">{t('broadcastBtn')}</span>
                      <span className="sm:hidden">ALERT</span>
                    </button>
                    <button
                      onClick={handleResetAllLimits}
                      type="button"
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#00E676]/20 to-[#10B981]/30 hover:from-[#00E676]/30 hover:to-[#10B981]/40 border border-[#00E676]/40 text-[#00E676] font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(0,230,118,0.2)] shrink-0 transition-all active:scale-95"
                      title="Reset free 0/1 extraction limit for all users"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">0/1 RESET ALL</span>
                      <span className="sm:hidden">0/1 ALL</span>
                    </button>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-[11px] font-mono">
                    {(['all', 'active', 'blocked', 'paid'] as const).map((filterKey) => {
                      const labels = {
                        all: t('filterAll'),
                        active: t('filterActive'),
                        blocked: t('filterBlocked'),
                        paid: t('filterPaid'),
                      };
                      return (
                        <button
                          key={filterKey}
                          type="button"
                          onClick={() => setUserFilter(filterKey)}
                          className={`flex-1 py-1 rounded-lg font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                            userFilter === filterKey
                              ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                              : 'text-[#64748B] hover:text-[#CBD5E1]'
                          }`}
                        >
                          {labels[filterKey]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Feedback Banner */}
                {userActionMessage && (
                  <div className="py-1.5 px-3 rounded-xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 text-[#38E8FF] text-xs font-mono text-center animate-fade-in shrink-0">
                    {userActionMessage}
                  </div>
                )}

                {/* Users List Container */}
                <div className="space-y-2.5 overflow-y-auto terminal-scroll pr-1 flex-1">
                  {filteredUsers.map((u) => {
                    const isOwner = String(u.tgId) === '8515329556';
                    const isBlocked = u.status === 'BLOCKED' || u.status === 'RESTRICTED';

                    return (
                      <div
                        key={u.id}
                        className={`rounded-2xl p-3 border transition-all ${
                          isOwner
                            ? 'bg-gradient-to-r from-[#22D3EE]/10 via-[#22D3EE]/5 to-transparent border-[#22D3EE]/40 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                            : isBlocked
                            ? 'bg-[#FF1744]/5 border-[#FF1744]/30'
                            : 'bg-black/50 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* User Header Row */}
                        <div className="flex items-start justify-between mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold border ${
                                isOwner
                                  ? 'bg-[#22D3EE]/20 border-[#22D3EE]/50 text-[#38E8FF]'
                                  : isBlocked
                                  ? 'bg-[#FF1744]/20 border-[#FF1744]/50 text-[#FF5252]'
                                  : 'bg-white/10 border-white/15 text-white'
                              }`}
                            >
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-extrabold text-white">{u.name}</span>
                                {isOwner && (
                                  <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-[#38E8FF]/20 text-[#38E8FF] border border-[#38E8FF]/40 font-bold flex items-center gap-0.5">
                                    <Crown className="w-2.5 h-2.5" />
                                    <span>{t('owner')}</span>
                                  </span>
                                )}
                                <span
                                  className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded font-bold uppercase border ${
                                    isBlocked
                                      ? 'bg-[#FF1744]/20 text-[#FF5252] border-[#FF1744]/40'
                                      : 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30'
                                  }`}
                                >
                                  {isBlocked ? t('filterBlocked') : t('filterActive')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-[#9CA3AF] mt-0.5">
                                <span>{u.username || '@anonymous'}</span>
                                <span>•</span>
                                <button
                                  onClick={() => handleCopyTgId(u.tgId)}
                                  type="button"
                                  className="text-[#38E8FF] hover:underline cursor-pointer flex items-center gap-0.5"
                                  title="Copy Telegram ID"
                                >
                                  <span>ID: {u.tgId}</span>
                                  {copiedTgId === u.tgId ? (
                                    <Check className="w-2.5 h-2.5 text-[#00E676]" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Stats Pill */}
                          <div className="text-right font-mono">
                            <span className="text-xs font-extrabold text-[#00E676]">
                              ${u.totalExtractedUsd.toLocaleString()}
                            </span>
                            <span className="block text-[9px] text-[#94A3B8]">
                              {u.extractsCount} {t('keys')}
                            </span>
                          </div>
                        </div>

                        {/* Plan Tier Selector (Promote / Demote) */}
                        {!isOwner && (
                          <div className="mb-2.5 p-1 rounded-xl bg-black/40 border border-white/5">
                            <div className="flex items-center justify-between px-1.5 py-0.5 text-[9px] font-mono text-[#64748B] uppercase mb-1">
                              <span>Plan Tier:</span>
                              <span className="font-bold text-white uppercase">{u.plan}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-[10px] font-mono font-bold">
                              {/* Community */}
                              <button
                                onClick={() => handleUpdatePlan(u.id, 'community')}
                                type="button"
                                className={`py-1 rounded-lg border transition-all cursor-pointer ${
                                  u.plan === 'community'
                                    ? 'bg-white/15 text-white border-white/30 shadow-sm'
                                    : 'bg-transparent text-[#64748B] border-transparent hover:text-[#94A3B8]'
                                }`}
                              >
                                FREE
                              </button>
                              {/* PRO */}
                              <button
                                onClick={() => handleUpdatePlan(u.id, 'pro')}
                                type="button"
                                className={`py-1 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                  u.plan === 'pro'
                                    ? 'bg-[#00E676]/20 text-[#00E676] border-[#00E676]/50 shadow-[0_0_8px_rgba(0,230,118,0.2)]'
                                    : 'bg-transparent text-[#64748B] border-transparent hover:text-[#00E676]'
                                }`}
                              >
                                <Crown className="w-2.5 h-2.5" />
                                <span>PRO</span>
                              </button>
                              {/* Enterprise */}
                              <button
                                onClick={() => handleUpdatePlan(u.id, 'enterprise')}
                                type="button"
                                className={`py-1 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                  u.plan === 'enterprise'
                                    ? 'bg-[#C084FC]/20 text-[#C084FC] border-[#C084FC]/50 shadow-[0_0_8px_rgba(192,132,252,0.2)]'
                                    : 'bg-transparent text-[#64748B] border-transparent hover:text-[#C084FC]'
                                }`}
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>ENTERPRISE</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Admin Action Controls */}
                        <div className="flex items-center gap-1 pt-2 border-t border-white/5 text-[10px] font-mono flex-wrap">
                          {/* Message User via Bot */}
                          <button
                            onClick={() => handleOpenBroadcast(u)}
                            type="button"
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-[#38E8FF]/15 border border-white/10 hover:border-[#38E8FF]/40 text-[#CBD5E1] hover:text-[#38E8FF] transition-all cursor-pointer flex items-center gap-1"
                            title="Send message via Telegram bot"
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>{t('sendMessageBtn')}</span>
                          </button>

                          {/* View Activity Logs */}
                          <button
                            onClick={() => handleOpenUserActivity(u)}
                            type="button"
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-[#22D3EE]/15 border border-white/10 hover:border-[#22D3EE]/40 text-[#CBD5E1] hover:text-[#22D3EE] transition-all cursor-pointer flex items-center gap-1"
                            title="View user extraction history"
                          >
                            <Activity className="w-2.5 h-2.5" />
                            <span>{t('viewActivityBtn')}</span>
                          </button>

                          {/* Reset Limits */}
                          <button
                            onClick={() => handleResetUserExtracts(u.id)}
                            type="button"
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#CBD5E1] hover:text-white transition-all cursor-pointer flex items-center gap-1"
                            title="Reset 0/1 limit"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>0/1</span>
                          </button>

                          {/* Reset Volume */}
                          {resetStatsConfirmId === u.id ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#FFB800]/20 border border-[#FFB800]/50 animate-fadeIn">
                              <span className="text-[10px] text-[#FFD54F] font-bold">Reset $0?</span>
                              <button
                                onClick={() => executeResetUserStats(u.id)}
                                type="button"
                                className="px-1.5 py-0.5 rounded bg-[#FFB800] hover:bg-[#FFA000] text-black text-[9.5px] font-bold transition-colors cursor-pointer"
                              >
                                {t('confirmAction')}
                              </button>
                              <button
                                onClick={() => setResetStatsConfirmId(null)}
                                type="button"
                                className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[#CBD5E1] text-[9.5px] font-bold transition-colors cursor-pointer"
                              >
                                {t('cancelAction')}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setResetStatsConfirmId(u.id)}
                              type="button"
                              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#9CA3AF] hover:text-white transition-all cursor-pointer flex items-center gap-1"
                              title="Reset volume & counter to $0"
                            >
                              <span>$0</span>
                            </button>
                          )}

                          {/* Block / Unblock (Non-owner only) */}
                          {!isOwner && (
                            <button
                              onClick={() => handleToggleUserStatus(u.id)}
                              type="button"
                              className={`px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                isBlocked
                                  ? 'bg-[#FF5252]/20 text-[#FF5252] border-[#FF5252]/50 hover:bg-[#FF5252]/30'
                                  : 'bg-white/5 text-[#9CA3AF] border-white/10 hover:border-[#FF5252]/40 hover:text-[#FF5252]'
                              }`}
                              title={isBlocked ? 'Unblock user access' : 'Block user from app'}
                            >
                              {isBlocked ? (
                                <>
                                  <Lock className="w-2.5 h-2.5 text-[#FF5252]" />
                                  <span>{t('unblockUser')}</span>
                                </>
                              ) : (
                                <>
                                  <Ban className="w-2.5 h-2.5" />
                                  <span>{t('blockUser')}</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Delete User (Non-owner only) with inline confirmation */}
                          {!isOwner && (
                            deleteConfirmId === u.id ? (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#FF5252]/20 border border-[#FF5252]/50 ml-auto animate-fadeIn">
                                <span className="text-[10px] text-[#FF5252] font-bold">{t('confirmDeletePrompt')}</span>
                                <button
                                  onClick={() => executeDeleteUser(u.id)}
                                  type="button"
                                  className="px-1.5 py-0.5 rounded bg-[#FF5252] hover:bg-[#FF2D2D] text-white text-[9.5px] font-bold transition-colors cursor-pointer"
                                >
                                  {t('confirmAction')}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  type="button"
                                  className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[#CBD5E1] text-[9.5px] font-bold transition-colors cursor-pointer"
                                >
                                  {t('cancelAction')}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(u.id)}
                                type="button"
                                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-[#FF5252]/20 border border-white/10 hover:border-[#FF5252]/40 text-[#9CA3AF] hover:text-[#FF5252] transition-all cursor-pointer flex items-center gap-1 ml-auto"
                                title={t('deleteUser')}
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <div className="p-6 rounded-2xl bg-black/40 border border-white/5 text-center my-4 space-y-2">
                      <Users className="w-8 h-8 text-[#9CA3AF]/40 mx-auto" />
                      <div className="text-xs font-bold text-white">{t('noUsersFound')}</div>
                      <div className="text-[10px] text-[#9CA3AF]">{t('realUsersHint')}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Broadcast & Direct Message Modal Overlay */}
            {broadcastModalOpen && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                <div className="relative w-full max-w-md rounded-2xl p-[1.5px] bg-gradient-to-b from-[#38E8FF] via-white/10 to-black shadow-2xl">
                  <div className="rounded-2xl p-5 bg-[#161928] border border-white/10 flex flex-col space-y-3 font-sans">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#38E8FF]/20 border border-[#38E8FF]/40 flex items-center justify-center text-[#38E8FF]">
                          <Send className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">
                            {broadcastTarget === 'all' ? t('broadcastModalTitle') : t('directMessageTitle')}
                          </h4>
                          <span className="text-[10px] font-mono text-[#38E8FF]">
                            {broadcastTarget === 'all'
                              ? `${t('msgTargetAll')} (${userList.length})`
                              : `${(broadcastTarget as AdminUser).name} (ID: ${(broadcastTarget as AdminUser).tgId})`}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setBroadcastModalOpen(false)}
                        type="button"
                        className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#9CA3AF] hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Template Buttons */}
                    <div>
                      <span className="text-[9.5px] font-mono text-[#94A3B8] uppercase block mb-1">
                        Quick Templates:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() =>
                            setBroadcastText(
                              language === 'ru'
                                ? `🎉 <b>НОВАЯ АКЦИЯ: СКИДКА 50%!</b>\n\nДля новых пользователей BlockHunt Protocol объявлена скидка 50% на тарифы PRO и ENTERPRISE!\n\n⚡ Откройте Mini App и активируйте тариф по выгодной цене!`
                                : `🎉 <b>SPECIAL PROMO: 50% DISCOUNT!</b>\n\nA limited 50% discount on PRO and ENTERPRISE plans is now active for BlockHunt Protocol users!\n\n⚡ Open the Mini App and upgrade now!`
                            )
                          }
                          type="button"
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white cursor-pointer"
                        >
                          {t('tplPromo')}
                        </button>
                        <button
                          onClick={() =>
                            setBroadcastText(
                              language === 'ru'
                                ? `⚠️ <b>ПРЕДУПРЕЖДЕНИЕ ПРОТОКОЛА БЕЗОПАСНОСТИ</b>\n\nНикогда не передавайте ваши приватные ключи третьим лицам. BlockHunt Protocol переводит найденные средства только на указанный вами адрес кошелька.`
                                : `⚠️ <b>SECURITY PROTOCOL NOTICE</b>\n\nPlease never share your private keys with anyone. BlockHunt Protocol operates strictly on-chain and routes extracted balances directly to your designated payout address.`
                            )
                          }
                          type="button"
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white cursor-pointer"
                        >
                          {t('tplSecurity')}
                        </button>
                        <button
                          onClick={() =>
                            setBroadcastText(
                              language === 'ru'
                                ? `⚡ <b>ОБНОВЛЕНИЕ СИСТЕМЫ // BLOCKHUNT v3.8</b>\n\nКриптографическое ядро поиска коллизий SECP256K1 оптимизировано. Скорость сканирования увеличена в 4 раза!`
                                : `⚡ <b>SYSTEM UPGRADE // BLOCKHUNT v3.8</b>\n\nSECP256K1 cryptographic collision engine optimized. Scanning throughput and verification speed increased 4x!`
                            )
                          }
                          type="button"
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white cursor-pointer"
                        >
                          {t('tplUpdate')}
                        </button>
                      </div>
                    </div>

                    {/* Text Input */}
                    <div>
                      <textarea
                        value={broadcastText}
                        onChange={(e) => setBroadcastText(e.target.value)}
                        placeholder={t('msgPlaceholder')}
                        rows={4}
                        className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#38E8FF] font-sans resize-none"
                      />
                    </div>

                    {/* Delivery Result Feedback */}
                    {broadcastResult && (
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-center text-[#38E8FF]">
                        {broadcastResult}
                      </div>
                    )}

                    {/* Modal Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setBroadcastModalOpen(false)}
                        type="button"
                        className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-[#CBD5E1] cursor-pointer"
                      >
                        {t('closeBtn')}
                      </button>
                      <button
                        onClick={handleSendBroadcast}
                        disabled={broadcastSending || !broadcastText.trim()}
                        type="button"
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#22D3EE] to-[#38E8FF] hover:brightness-110 text-black font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Send className={`w-3.5 h-3.5 ${broadcastSending ? 'animate-spin' : ''}`} />
                        <span>{broadcastSending ? t('msgSending') : t('msgSendBtn')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Activity Drawer Overlay */}
            {activityModalUser && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                <div className="relative w-full max-w-md max-h-[85vh] rounded-2xl p-[1.5px] bg-gradient-to-b from-[#22D3EE] via-white/10 to-black shadow-2xl flex flex-col overflow-hidden">
                  <div className="rounded-2xl p-4 bg-[#141724] border border-white/10 flex flex-col flex-1 overflow-hidden space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#22D3EE]/20 border border-[#22D3EE]/40 flex items-center justify-center text-[#22D3EE]">
                          <Activity className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{t('userActivityTitle')}</h4>
                          <span className="text-[10px] font-mono text-[#38E8FF]">
                            {activityModalUser.name} (ID: {activityModalUser.tgId})
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActivityModalUser(null)}
                        type="button"
                        className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#9CA3AF] hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-2 shrink-0 font-mono text-xs">
                      <div className="bg-black/50 p-2 rounded-xl border border-white/5">
                        <span className="text-[9px] text-[#94A3B8] uppercase block">Total Volume:</span>
                        <span className="text-[#00E676] font-extrabold text-sm">
                          ${activityModalUser.totalExtractedUsd.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-black/50 p-2 rounded-xl border border-white/5">
                        <span className="text-[9px] text-[#94A3B8] uppercase block">Total Extractions:</span>
                        <span className="text-white font-extrabold text-sm">
                          {activityModalUser.extractsCount}
                        </span>
                      </div>
                    </div>

                    {/* Extractions List */}
                    <div className="space-y-2 overflow-y-auto terminal-scroll flex-1 pr-1">
                      {loadingActivity && (
                        <div className="p-6 text-center text-xs font-mono text-[#22D3EE] animate-pulse">
                          Loading extraction history from server...
                        </div>
                      )}

                      {!loadingActivity && userExtractions.length === 0 && (
                        <div className="p-6 text-center text-xs font-mono text-[#64748B]">
                          {t('noActivityLogs')}
                        </div>
                      )}

                      {!loadingActivity &&
                        userExtractions.map((ext) => (
                          <div
                            key={ext.id}
                            className="bg-black/50 p-2.5 rounded-xl border border-white/5 font-mono text-[11px] space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border ${
                                  ext.network === 'TRON'
                                    ? 'bg-[#FF1744]/15 text-[#FF5252] border-[#FF1744]/30'
                                    : ext.network === 'ETHEREUM'
                                    ? 'bg-[#627EEA]/15 text-[#8EA4F7] border-[#627EEA]/30'
                                    : 'bg-[#14F195]/15 text-[#14F195] border-[#14F195]/30'
                                }`}
                              >
                                {ext.network}
                              </span>
                              <span className="text-[#00E676] font-bold">
                                +${ext.balanceUsd.toLocaleString()} USD
                              </span>
                            </div>
                            <div className="text-[10px] text-[#94A3B8] break-all select-all">
                              {ext.walletAddress}
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-[#64748B]">
                              <span>
                                {ext.balanceCrypto} {ext.symbol}
                              </span>
                              <span>{new Date(ext.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => setActivityModalUser(null)}
                      type="button"
                      className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-[#CBD5E1] shrink-0 cursor-pointer"
                    >
                      {t('closeActivity')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Withdrawals Management Tab */}
            {activeTab === 'withdrawals' && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                {/* Header & Filters */}
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                      {t('adminWithdrawalsTitle')}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30">
                      {withdrawals.length} TOTAL
                    </span>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-xl border border-white/10 text-[10px] font-mono">
                    {(['ALL', 'PENDING', 'PAID', 'REJECTED'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setWdrFilter(filter)}
                        className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                          wdrFilter === filter
                            ? 'bg-white/15 text-white font-bold'
                            : 'text-[#64748B] hover:text-white'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Withdrawals List */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[350px] max-h-[550px]">
                  {withdrawals
                    .filter((w) => wdrFilter === 'ALL' || w.status === wdrFilter)
                    .map((w) => {
                      const dateStr = new Date(w.requestedAt).toLocaleString(
                        language === 'ru' ? 'ru-RU' : 'en-US',
                        {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      );
                      const isPending = w.status === 'PENDING';
                      const isPaid = w.status === 'PAID';
                      const isRejected = w.status === 'REJECTED';
                      const isProcessing = processingWdrId === w.id;

                      return (
                        <div
                          key={w.id}
                          className={`rounded-2xl p-3.5 border transition-all ${
                            isPending
                              ? 'bg-[#0F172A]/90 border-amber-500/30 shadow-[0_4px_16px_rgba(245,158,11,0.1)]'
                              : isPaid
                              ? 'bg-[#0A1612]/70 border-emerald-500/20'
                              : 'bg-[#180F12]/70 border-red-500/20'
                          }`}
                        >
                          {/* Top Row: User + Amount + Status */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">
                                  {w.userName}
                                </span>
                                {w.userUsername && (
                                  <span className="text-[10px] font-mono text-[#64748B]">
                                    {w.userUsername.startsWith('@')
                                      ? w.userUsername
                                      : `@${w.userUsername}`}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#94A3B8] mt-0.5">
                                <span>ID: <code className="text-white">{w.tgId}</code></span>
                                <span>•</span>
                                <span>{dateStr}</span>
                              </div>
                            </div>

                            <div className="text-right flex flex-col items-end gap-1">
                              <span className="text-sm font-black font-mono text-emerald-400">
                                ${w.amountUsd.toFixed(2)} USD
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-white/10 text-[#38E8FF]">
                                  {w.network}
                                </span>
                                {isPending && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                                    PENDING
                                  </span>
                                )}
                                {isPaid && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                    PAID
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                                    REJECTED
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Destination Wallet Address Box */}
                          <div className="rounded-xl p-2 bg-black/60 border border-white/10 mb-2.5 flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-[9px] font-mono text-[#64748B] block uppercase">
                                DESTINATION WALLET ({w.network}):
                              </span>
                              <span className="text-[11px] font-mono text-white break-all select-all font-semibold">
                                {w.walletAddress}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(w.walletAddress);
                                setCopiedWdrAddress(w.id);
                                setTimeout(() => setCopiedWdrAddress(null), 1800);
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white shrink-0 cursor-pointer"
                              title="Copy Address"
                            >
                              {copiedWdrAddress === w.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Additional info if resolved */}
                          {w.txHash && (
                            <div className="text-[10px] font-mono text-emerald-400 mb-2 break-all bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                              TxID: {w.txHash}
                            </div>
                          )}
                          {w.note && (
                            <div className="text-[10px] font-mono text-red-400 mb-2 bg-red-500/10 p-1.5 rounded-lg border border-red-500/20">
                              Reason: {w.note}
                            </div>
                          )}

                          {/* Action Buttons for Pending requests */}
                          {isPending && (
                            <div className="pt-2 border-t border-white/10 space-y-2">
                              <div>
                                <input
                                  type="text"
                                  placeholder={t('txHashOptional')}
                                  value={txHashInputs[w.id] || ''}
                                  onChange={(e) =>
                                    setTxHashInputs((prev) => ({
                                      ...prev,
                                      [w.id]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-[#22D3EE] placeholder-[#475569]"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleUpdateWithdrawal(w.id, 'PAID')}
                                  className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold font-mono text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{t('markPaidBtn')}</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => {
                                    const reason = prompt(
                                      language === 'ru'
                                        ? 'Укажите причину отклонения (средства вернутся на баланс пользователя):'
                                        : 'Enter rejection reason (funds will be refunded to user balance):'
                                    );
                                    if (reason !== null) {
                                      handleUpdateWithdrawal(w.id, 'REJECTED', reason);
                                    }
                                  }}
                                  className="py-2 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold font-mono text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>{t('rejectPayoutBtn')}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {withdrawals.filter((w) => wdrFilter === 'ALL' || w.status === wdrFilter).length === 0 && (
                    <div className="p-8 text-center text-xs text-[#64748B] font-mono rounded-2xl bg-black/20 border border-white/5">
                      {t('noWithdrawalRequests')}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-center mt-3 shrink-0">
              <span className="text-[9.5px] font-mono text-[#64748B]">
                AUTHENTICATED OPERATOR: TELEGRAM ID 8515329556 // SECURE CONSOLE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};