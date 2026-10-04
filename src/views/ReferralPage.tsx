import React, { useState, useEffect, useCallback } from 'react';
import type { ReferralStats, WithdrawalNetwork, WithdrawalRequest } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Users,
  DollarSign,
  TrendingUp,
  Share2,
  Copy,
  Check,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  AlertCircle,
  Gift,
  Sparkles,
  ExternalLink,
  FileText,
  Zap,
  HelpCircle,
} from 'lucide-react';

interface ReferralPageProps {
  tgUser?: {
    id: number | string;
    first_name?: string;
    last_name?: string;
    name?: string;
    username?: string;
  } | null;
}

export const ReferralPage: React.FC<ReferralPageProps> = ({ tgUser }) => {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Withdrawal Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [network, setNetwork] = useState<WithdrawalNetwork>('TRON');
  const [address, setAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  const userId = tgUser?.id ? String(tgUser.id) : '';
  const userName = tgUser?.name || [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(' ') || 'Operative';
  const userUsername = tgUser?.username ? `@${tgUser.username}` : '';

  const handleContactAffiliate = () => {
    const affiliateUrl = 'https://t.me/blockhunt_affiliate';
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(affiliateUrl);
    } else {
      window.open(affiliateUrl, '_blank');
    }
  };

  const fetchStats = useCallback(
    async () => {
      if (!userId) {
        return;
      }
      try {
        const res = await fetch(`/api/referrals/stats?tgId=${userId}`);
        const data = await res.json();
        if (data.ok && data.stats) {
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Error fetching referral stats:', err);
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const referralLink =
    stats?.referralLink ||
    (userId ? `https://t.me/Block_huntbot?start=ref_${userId}` : 'https://t.me/Block_huntbot');

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShareTelegram = () => {
    const text =
      language === 'ru'
        ? '⚡ Подключайся к BlockHunt Protocol — сканеру аппаратных уязвимостей SECP256K1 и мемпула криптокошельков:'
        : '⚡ Connect to BlockHunt Protocol — advanced SECP256K1 entropy and crypto mempool security scanner:';
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(
      referralLink
    )}&text=${encodeURIComponent(text)}`;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  // Payout validation
  const validateAddress = (net: WithdrawalNetwork, addr: string): boolean => {
    const clean = addr.trim();
    if (net === 'TRON') {
      return /^T[1-9A-HJ-NP-za-km-z]{33}$/.test(clean);
    }
    if (net === 'ETHEREUM') {
      return /^0x[a-fA-F0-9]{40}$/.test(clean);
    }
    if (net === 'SOLANA') {
      return /^[1-9A-HJ-NP-za-km-z]{32,44}$/.test(clean);
    }
    return false;
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(null);

    const numAmount = parseFloat(amount);
    const available = stats?.availableBalance || 0;

    if (isNaN(numAmount) || numAmount < 10) {
      setWithdrawError(t('minPayoutNotice'));
      return;
    }

    if (numAmount > available) {
      setWithdrawError(t('insufficientBalance'));
      return;
    }

    if (!validateAddress(network, address)) {
      setWithdrawError(t('invalidAddressForNet'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/referrals/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tgId: userId,
          userName,
          userUsername,
          amountUsd: numAmount,
          network,
          walletAddress: address.trim(),
          lang: language,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setWithdrawSuccess(t('payoutSubmittedSuccess'));
        setAmount('');
        setAddress('');
        await fetchStats();
        setTimeout(() => {
          setShowWithdrawModal(false);
          setWithdrawSuccess(null);
        }, 2200);
      } else {
        setWithdrawError(data.error || 'Failed to submit withdrawal request');
      }
    } catch (err: any) {
      setWithdrawError(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full px-4 pb-28 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-5 mb-5 border border-[#22D3EE]/30 bg-gradient-to-br from-[#0F172A]/90 via-[#0A0E1A]/95 to-[#020617]/95 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        {/* Glow ambient */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#22D3EE]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#A855F7]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#22D3EE]/15 border border-[#22D3EE]/40 text-[#22D3EE] text-[10px] font-mono font-bold tracking-wider mb-2">
              <Gift className="w-3.5 h-3.5" />
              <span>{t('commissionTag')}</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{t('referralProgramTitle')}</span>
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-[#38E8FF] transition-all cursor-pointer border border-white/10 hover:border-white/20 active:scale-95 flex items-center justify-center"
                title={t('infoModalTitle')}
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed max-w-sm">
              {t('referralCommissionDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Available Balance Card */}
      <div className="relative overflow-hidden rounded-2xl p-4 mb-4 bg-gradient-to-br from-[#0F291E]/80 via-[#0D1F17]/90 to-[#0A0E1A]/90 border border-emerald-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.12)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono tracking-wider font-semibold text-emerald-400/90 uppercase">
            {t('availablePayoutBalance')}
          </span>
          <DollarSign className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-black tracking-tight text-white font-mono">
              ${(stats?.availableBalance || 0).toFixed(2)}
            </div>
            <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
              {stats?.pendingWithdrawal && stats.pendingWithdrawal > 0 ? (
                <span className="text-amber-400/90">
                  (${stats.pendingWithdrawal.toFixed(2)} {t('pendingPayoutsAmount').toLowerCase()})
                </span>
              ) : (
                <span>Min. $10.00 USD</span>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setShowWithdrawModal(true);
              setWithdrawError(null);
              setWithdrawSuccess(null);
            }}
            disabled={(stats?.availableBalance || 0) < 10}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider transition-all flex items-center gap-1.5 shadow-lg ${
              (stats?.availableBalance || 0) >= 10
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-emerald-500/25 active:scale-95 cursor-pointer'
                : 'bg-white/5 text-[#64748B] border border-white/10 cursor-not-allowed opacity-60'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{t('requestPayoutTitle')}</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards - Only displayed when user has active referrals */}
      {((stats?.totalReferrals || 0) > 0 || Boolean(stats?.withdrawalsList && stats.withdrawalsList.length > 0)) && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Total Referrals */}
          <div className="rounded-2xl p-3.5 bg-[#0F172A]/70 border border-white/10">
            <div className="flex items-center justify-between text-[#94A3B8] mb-1.5">
              <span className="text-[10px] font-mono uppercase font-semibold">
                {t('totalReferralsCount')}
              </span>
              <Users className="w-3.5 h-3.5 text-[#38E8FF]" />
            </div>
            <div className="text-2xl font-black font-mono text-white">
              {stats?.totalReferrals ?? 0}
            </div>
          </div>

          {/* Active Paid Plans */}
          <div className="rounded-2xl p-3.5 bg-[#0F172A]/70 border border-white/10">
            <div className="flex items-center justify-between text-[#94A3B8] mb-1.5">
              <span className="text-[10px] font-mono uppercase font-semibold">
                {t('activePaidPlansCount')}
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-[#A855F7]" />
            </div>
            <div className="text-2xl font-black font-mono text-white">
              {stats?.activePlansCount ?? 0}
            </div>
          </div>

          {/* Total Earned */}
          <div className="rounded-2xl p-3.5 bg-[#0F172A]/70 border border-white/10">
            <div className="flex items-center justify-between text-[#94A3B8] mb-1.5">
              <span className="text-[10px] font-mono uppercase font-semibold">
                {t('totalEarnedCommission')}
              </span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black font-mono text-emerald-400">
              ${(stats?.totalEarned || 0).toFixed(2)}
            </div>
          </div>

          {/* Total Withdrawn */}
          <div className="rounded-2xl p-3.5 bg-[#0F172A]/70 border border-white/10">
            <div className="flex items-center justify-between text-[#94A3B8] mb-1.5">
              <span className="text-[10px] font-mono uppercase font-semibold">
                {t('totalWithdrawnAmount')}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="text-xl font-black font-mono text-teal-300">
              ${(stats?.totalWithdrawn || 0).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Personal Referral Link Section */}
      <div className="rounded-2xl p-4 mb-5 bg-[#0B1120]/90 border border-[#22D3EE]/25 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-bold tracking-wider text-[#22D3EE] uppercase flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" />
            {t('yourReferralLink')}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20">
            50% REVSHARE
          </span>
        </div>

        <div className="relative mb-3">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-white select-all focus:outline-none focus:border-[#22D3EE]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopyLink}
            className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 border border-white/15 transition-all active:scale-95"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">COPIED!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#38E8FF]" />
                <span>{t('copyLinkBtn')}</span>
              </>
            )}
          </button>

          <button
            onClick={handleShareTelegram}
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0088CC] to-[#00A8E8] hover:from-[#0099DD] hover:to-[#00B4F8] text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-[#0088CC]/20"
          >
            <Share2 className="w-4 h-4" />
            <span>{t('shareTelegramBtn')}</span>
          </button>
        </div>
      </div>

      {/* Conditional: For active referrers vs new referrers */}
      {((stats?.totalReferrals || 0) > 0 || Boolean(stats?.withdrawalsList && stats.withdrawalsList.length > 0)) ? (
        <>
          {/* Payout History Section */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="text-xs font-mono font-bold tracking-wider text-[#94A3B8] uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                {t('payoutHistoryTitle')}
              </h2>
              {stats?.withdrawalsList && stats.withdrawalsList.length > 0 && (
                <span className="text-[10px] font-mono text-[#64748B]">
                  {stats.withdrawalsList.length} total
                </span>
              )}
            </div>

            {stats?.withdrawalsList && stats.withdrawalsList.length > 0 ? (
              <div className="space-y-2">
                {stats.withdrawalsList.map((w: WithdrawalRequest) => {
                  const dateStr = new Date(w.requestedAt).toLocaleDateString(
                    language === 'ru' ? 'ru-RU' : 'en-US',
                    {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  );
                  return (
                    <div
                      key={w.id}
                      className="rounded-xl p-3 bg-[#0F172A]/70 border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-white">
                            ${w.amountUsd.toFixed(2)} USD
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-white/10 text-[#38E8FF]">
                            {w.network}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#64748B]">
                          {w.walletAddress.slice(0, 6)}...{w.walletAddress.slice(-6)} • {dateStr}
                        </span>
                        {w.txHash && (
                          <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                            Tx: {w.txHash.slice(0, 10)}...
                          </span>
                        )}
                        {w.note && (
                          <span className="text-[9px] font-mono text-red-400">
                            {w.note}
                          </span>
                        )}
                      </div>

                      <div>
                        {w.status === 'PENDING' && (
                          <span className="px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            {t('statusPending')}
                          </span>
                        )}
                        {w.status === 'PAID' && (
                          <span className="px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {t('statusPaid')}
                          </span>
                        )}
                        {w.status === 'REJECTED' && (
                          <span className="px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                            {t('statusRejected')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl p-4 bg-[#0F172A]/40 border border-white/5 text-center text-xs text-[#64748B] font-mono">
                {t('noPayoutsYet')}
              </div>
            )}
          </div>

          {/* Referred Operatives List */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="text-xs font-mono font-bold tracking-wider text-[#94A3B8] uppercase flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#38E8FF]" />
                {t('referredUsersTitle')}
              </h2>
              {stats?.referralsList && stats.referralsList.length > 0 && (
                <span className="text-[10px] font-mono text-[#64748B]">
                  {stats.referralsList.length} users
                </span>
              )}
            </div>

            {stats?.referralsList && stats.referralsList.length > 0 ? (
              <div className="space-y-2">
                {stats.referralsList.map((ref) => {
                  const joined = new Date(ref.joinedAt).toLocaleDateString(
                    language === 'ru' ? 'ru-RU' : 'en-US',
                    {
                      day: 'numeric',
                      month: 'short',
                    }
                  );
                  const isPaidPlan = ref.plan && ref.plan !== 'community';
                  return (
                    <div
                      key={ref.id}
                      className="rounded-xl p-3 bg-[#0F172A]/70 border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {ref.referredName || 'Operative'}
                          </span>
                          {ref.referredUsername && (
                            <span className="text-[10px] text-[#64748B] font-mono">
                              {ref.referredUsername.startsWith('@')
                                ? ref.referredUsername
                                : `@${ref.referredUsername}`}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-[#64748B]">
                          Joined {joined}
                        </span>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            isPaidPlan
                              ? 'bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/40'
                              : 'bg-white/5 text-[#94A3B8] border border-white/10'
                          }`}
                        >
                          {ref.plan || 'COMMUNITY'}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          +${(ref.earnedUsd || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl p-5 bg-[#0F172A]/40 border border-white/5 text-center text-xs text-[#64748B] font-mono">
                {t('noReferralsYet')}
              </div>
            )}
          </div>
        </>
      ) : (
        /* New Operatives View: How It Works & Full Rules & Terms */
        <>
          {/* How The 50% Program Works */}
          <div className="rounded-2xl p-5 mb-5 bg-[#0F172A]/70 border border-white/10">
            <h3 className="text-xs font-mono font-bold tracking-wider text-[#38E8FF] uppercase flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-[#38E8FF]" />
              {t('howItWorksTitle')}
            </h3>

            <div className="space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#22D3EE]/15 border border-[#22D3EE]/30 text-[#22D3EE] flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">{t('step1Head')}</h4>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">{t('step1Text')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#A855F7]/15 border border-[#A855F7]/30 text-[#A855F7] flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">{t('step2Head')}</h4>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">{t('step2Text')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">{t('step3Head')}</h4>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">{t('step3Text')}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Payout Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#0D1525] border border-white/15 rounded-t-3xl sm:rounded-2xl p-5 shadow-[0_-12px_48px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                  {t('requestPayoutTitle')}
                </h3>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  {t('requestPayoutDesc')}
                </p>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Error / Success Banners */}
            {withdrawError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}
            {withdrawSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{withdrawSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
              {/* Select Network */}
              <div>
                <label className="block text-[11px] font-mono uppercase font-semibold text-[#94A3B8] mb-1.5">
                  {t('payoutNetwork')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['TRON', 'SOLANA', 'ETHEREUM'] as WithdrawalNetwork[]).map((net) => {
                    const isSelected = network === net;
                    return (
                      <button
                        key={net}
                        type="button"
                        onClick={() => {
                          setNetwork(net);
                          setWithdrawError(null);
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                          isSelected
                            ? 'bg-[#22D3EE]/20 border-[#22D3EE] text-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                            : 'bg-white/5 border-white/10 text-[#94A3B8] hover:border-white/20'
                        }`}
                      >
                        {net === 'TRON' && 'TRX (TRC20)'}
                        {net === 'SOLANA' && 'SOL'}
                        {net === 'ETHEREUM' && 'ETH (ERC20)'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Destination Address */}
              <div>
                <label className="block text-[11px] font-mono uppercase font-semibold text-[#94A3B8] mb-1.5">
                  {t('payoutDestinationAddress')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    network === 'TRON'
                      ? 'TLsV52sRDL79HXGGm9yzwKibb6XuUadTnS'
                      : network === 'ETHEREUM'
                      ? '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
                      : '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
                  }
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setWithdrawError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-[#22D3EE] placeholder-[#475569]"
                />
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-mono uppercase font-semibold text-[#94A3B8]">
                    {t('payoutAmount')}
                  </label>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    Available: ${(stats?.availableBalance || 0).toFixed(2)} USD
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="10"
                    max={stats?.availableBalance || 0}
                    required
                    placeholder="10.00"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setWithdrawError(null);
                    }}
                    className="w-full px-3.5 py-2.5 pr-16 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-sm focus:outline-none focus:border-[#22D3EE]"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(String(stats?.availableBalance || 0))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-[#22D3EE]/15 hover:bg-[#22D3EE]/25 text-[#22D3EE] text-[10px] font-mono font-bold"
                  >
                    {t('maxBtn')}
                  </button>
                </div>
                <p className="text-[10px] font-mono text-[#64748B] mt-1">
                  {t('minPayoutNotice')}
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || (stats?.availableBalance || 0) < 10}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-95 text-black font-bold font-mono text-xs tracking-wider transition-all shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t('submittingPayout') : t('submitPayoutBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Program Terms & Media Kit Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0D1525] border border-white/15 rounded-t-3xl sm:rounded-2xl p-5 shadow-[0_-12px_48px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-y-auto space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] flex-shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">
                    {t('infoModalTitle')}
                  </h3>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    {t('infoModalSubtitle')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Media Kit & Creator Resources Card */}
            <div className="rounded-2xl p-4 bg-gradient-to-br from-[#1C1033]/90 via-[#0F172A]/90 to-[#0A0E1A]/95 border border-[#A855F7]/35 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#A855F7]/20 border border-[#A855F7]/40 text-[#C084FC] text-[10px] font-mono font-bold tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  <span>{t('affiliateHubBadge')}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  50% REVSHARE
                </span>
              </div>

              <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                <span>{t('affiliateHubTitle')}</span>
              </h4>

              <p className="text-xs text-[#94A3B8] leading-relaxed mb-3.5">
                {t('affiliateHubDesc')}
              </p>

              <button
                type="button"
                onClick={handleContactAffiliate}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#A855F7] via-[#9333EA] to-[#38E8FF] hover:opacity-95 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-[#A855F7]/25 transition-all active:scale-98 cursor-pointer"
              >
                <span>{t('contactAffiliateBtn')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Program Rules & Terms of Use */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-mono font-bold tracking-wider text-[#94A3B8] uppercase flex items-center gap-1.5 px-1">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                <span>{t('termsOfUseTitle')}</span>
              </h4>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                  <span className="text-emerald-400">💰</span>
                  <span>{t('rule1Title')}</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed pl-5">
                  {t('rule1Desc')}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                  <span className="text-teal-400">⚡</span>
                  <span>{t('rule2Title')}</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed pl-5">
                  {t('rule2Desc')}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                  <span className="text-[#A855F7]">🚀</span>
                  <span>{t('rule3Title')}</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed pl-5">
                  {t('rule3Desc')}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                  <span className="text-amber-400">🛡</span>
                  <span>{t('rule4Title')}</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed pl-5">
                  {t('rule4Desc')}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold transition-all cursor-pointer"
              >
                {t('closeModalBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
