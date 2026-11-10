import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AdminDepositAddresses, Network, PricingSettings } from '../types';
import {
  X,
  Check,
  Crown,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Copy,
  ShieldCheck,
  Search,
  AlertCircle,
  RefreshCw,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { useLivePrices } from '../hooks/useLivePrices';
import { useLanguage } from '../i18n/LanguageContext';
import { DEFAULT_ADMIN_DEPOSIT_ADDRESSES, DEFAULT_PRICING_SETTINGS } from '../data/adminSettings';
import { getTelegramHeaders } from '../lib/tgHeaders';

interface PaymentIntentView {
  id: string;
  tgId: string;
  plan: string;
  cycle: string;
  network: string;
  depositAddress: string;
  baseUsd: number;
  expectedUsd: number;
  expectedNative: number;
  nativeSymbol: string;
  stableSymbol: string;
  expiresAt: number;
}

interface LicensingModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlan: string;
  onSelectPlan: (planId: string) => void;
  adminAddresses?: AdminDepositAddresses;
  pricingSettings?: PricingSettings;
}

interface PlanItem {
  id: string;
  name: string;
  description: string;
  priceWeekly: string;
  priceMonthly: string;
  originalPriceWeekly?: string;
  originalPriceMonthly?: string;
  weeklyUsd: number;
  monthlyUsd: number;
  features: string[];
  isPopular: boolean;
}

export const LicensingModal: React.FC<LicensingModalProps> = ({
  isOpen,
  onClose,
  activePlan,
  onSelectPlan,
  adminAddresses = DEFAULT_ADMIN_DEPOSIT_ADDRESSES,
  pricingSettings = DEFAULT_PRICING_SETTINGS,
}) => {
  const { language, t } = useLanguage();
  const [currentAddresses, setCurrentAddresses] = useState<AdminDepositAddresses>(adminAddresses);
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly'>('weekly');
  const [activatedSuccess, setActivatedSuccess] = useState<string | null>(null);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<PlanItem | null>(null);
  const [paymentNetwork, setPaymentNetwork] = useState<Network>('TRON');
  const [copiedField, setCopiedField] = useState<'addr' | 'native' | 'stable' | null>(null);
  const isVerifyingRef = useRef(false);
  const isAutoCheckingRef = useRef(false);

  // Unique Invoice & Auto-Detection State
  const [activeIntent, setActiveIntent] = useState<PaymentIntentView | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentSecondsLeft, setIntentSecondsLeft] = useState(0);
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const [showManualTx, setShowManualTx] = useState(false);

  // Sync prop changes
  useEffect(() => {
    if (adminAddresses) {
      setCurrentAddresses(adminAddresses);
    }
  }, [adminAddresses]);

  // Always fetch latest live deposit addresses directly from server whenever modal opens
  useEffect(() => {
    if (isOpen) {
      fetch('/api/deposit-addresses')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && (data.TRON || data.ETHEREUM || data.SOLANA)) {
            setCurrentAddresses((prev) => ({
              ...prev,
              ...data,
            }));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Transaction Hash verification state
  const [txHash, setTxHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationLogs, setVerificationLogs] = useState<string[]>([]);
  const [isMatched, setIsMatched] = useState(false);

  const { prices: livePrices } = useLivePrices();

  const getTelegramUserId = useCallback((): string | undefined => {
    try {
      const tg = (window as unknown as {
        Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number | string } } } };
      }).Telegram?.WebApp;
      if (tg?.initDataUnsafe?.user?.id) {
        return String(tg.initDataUnsafe.user.id);
      }
    } catch {}
    return undefined;
  }, []);

  const applyConfirmedActivation = useCallback(
    (finalPlan: string, hash?: string) => {
      setIsMatched(true);
      if (hash) {
        setVerificationLogs((prev) => [
          ...prev,
          `> [MATCHED] Confirmed tx ${hash.slice(0, 12)}... on-chain!`,
        ]);
      }
      try {
        localStorage.setItem('shark_user_plan', finalPlan);
      } catch {}

      setTimeout(() => {
        onSelectPlan(finalPlan);
        setActivatedSuccess(finalPlan);
        setSelectedPlanForPayment(null);
        setActiveIntent(null);

        setTimeout(() => {
          setActivatedSuccess(null);
          onClose();
        }, 1500);
      }, 1200);
    },
    [onSelectPlan, onClose]
  );

  // Create or reuse a unique micro-amount invoice whenever payment checkout opens/changes
  useEffect(() => {
    if (!isOpen || !selectedPlanForPayment || selectedPlanForPayment.id === 'community') {
      setActiveIntent(null);
      return;
    }

    const currentTgId = getTelegramUserId();
    if (!currentTgId) {
      setActiveIntent(null);
      return;
    }

    let cancelled = false;
    setIntentLoading(true);
    setVerificationError(null);

    fetch('/api/payments/intent', {
      method: 'POST',
      headers: getTelegramHeaders(),
      body: JSON.stringify({
        tgId: currentTgId,
        plan: selectedPlanForPayment.id,
        billingCycle,
        network: paymentNetwork,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.ok && data.intent) {
          setActiveIntent(data.intent);
          setIntentSecondsLeft(Math.max(0, Math.floor((data.intent.expiresAt - Date.now()) / 1000)));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIntentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedPlanForPayment, paymentNetwork, billingCycle, getTelegramUserId]);

  const checkIntentStatus = useCallback(
    async (manualTrigger = false) => {
      if (!activeIntent || isMatched || isAutoCheckingRef.current || isVerifyingRef.current) return;
      isAutoCheckingRef.current = true;
      if (manualTrigger) {
        setIsAutoChecking(true);
        setVerificationError(null);
      }

      try {
        const res = await fetch('/api/payments/check-intent', {
          method: 'POST',
          headers: getTelegramHeaders(),
          body: JSON.stringify({
            intentId: activeIntent.id,
            tgId: activeIntent.tgId,
            lang: language,
          }),
        });
        const data = await res.json().catch(() => null);
        if (data?.ok && data.status === 'COMPLETED') {
          applyConfirmedActivation(data.plan || activeIntent.plan, data.txHash);
          return;
        }
        if (manualTrigger) {
          setVerificationLogs((prev) => [
            ...prev.slice(-3),
            language === 'ru'
              ? '> Транзакция ещё не подтверждена в сети. Повторите проверку через несколько секунд.'
              : '> Deposit not yet confirmed on-chain. Please wait a few seconds and check again.',
          ]);
        }
      } catch {
        // Silent ignore for periodic background poll
      } finally {
        isAutoCheckingRef.current = false;
        if (manualTrigger) setIsAutoChecking(false);
      }
    },
    [activeIntent, isMatched, language, applyConfirmedActivation]
  );

  // Expiration countdown (1s) + Push/Cached Auto-Check Polling (every 12s while checkout visible)
  useEffect(() => {
    if (!isOpen || !selectedPlanForPayment || !activeIntent || isMatched) return;

    const tickTimer = setInterval(() => {
      setIntentSecondsLeft(Math.max(0, Math.floor((activeIntent.expiresAt - Date.now()) / 1000)));
    }, 1000);

    const pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkIntentStatus(false);
      }
    }, 12000);

    return () => {
      clearInterval(tickTimer);
      clearInterval(pollTimer);
    };
  }, [isOpen, selectedPlanForPayment, activeIntent, isMatched, checkIntentStatus]);

  if (!isOpen) return null;

  const isDiscount = pricingSettings.discount?.enabled ?? true;
  const discountPercent = pricingSettings.discount?.percent ?? 50;

  const proBaseWeekly = pricingSettings.plans?.pro?.weekly ?? 25;
  const proBaseMonthly = pricingSettings.plans?.pro?.monthly ?? 79;
  const proWeeklyUsd = isDiscount ? Math.round(proBaseWeekly * (1 - discountPercent / 100)) : proBaseWeekly;
  const proMonthlyUsd = isDiscount ? Math.round(proBaseMonthly * (1 - discountPercent / 100)) : proBaseMonthly;

  const entBaseWeekly = pricingSettings.plans?.enterprise?.weekly ?? 69;
  const entBaseMonthly = pricingSettings.plans?.enterprise?.monthly ?? 199;
  const entWeeklyUsd = isDiscount ? Math.round(entBaseWeekly * (1 - discountPercent / 100)) : entBaseWeekly;
  const entMonthlyUsd = isDiscount ? Math.round(entBaseMonthly * (1 - discountPercent / 100)) : entBaseMonthly;

  const plans: PlanItem[] = [
    {
      id: 'community',
      name: t('planCommunityName'),
      description: t('planCommunityDesc'),
      priceWeekly: 'FREE',
      priceMonthly: 'FREE',
      weeklyUsd: 0,
      monthlyUsd: 0,
      features: [
        t('planCommunityF1'),
        t('planCommunityF2'),
        t('planCommunityF3'),
        t('planCommunityF4'),
      ],
      isPopular: false,
    },
    {
      id: 'pro',
      name: t('planProName'),
      description: t('planProDesc'),
      priceWeekly: `$${proWeeklyUsd}`,
      priceMonthly: `$${proMonthlyUsd}`,
      originalPriceWeekly: isDiscount ? `$${proBaseWeekly}` : undefined,
      originalPriceMonthly: isDiscount ? `$${proBaseMonthly}` : undefined,
      weeklyUsd: proWeeklyUsd,
      monthlyUsd: proMonthlyUsd,
      features: [
        t('planProF1'),
        t('planProF2'),
        t('planProF3'),
        t('planProF4'),
        t('planProF5'),
      ],
      isPopular: true,
    },
    {
      id: 'enterprise',
      name: t('planEnterpriseName'),
      description: t('planEnterpriseDesc'),
      priceWeekly: `$${entWeeklyUsd}`,
      priceMonthly: `$${entMonthlyUsd}`,
      originalPriceWeekly: isDiscount ? `$${entBaseWeekly}` : undefined,
      originalPriceMonthly: isDiscount ? `$${entBaseMonthly}` : undefined,
      weeklyUsd: entWeeklyUsd,
      monthlyUsd: entMonthlyUsd,
      features: [
        t('planEnterpriseF1'),
        t('planEnterpriseF2'),
        t('planEnterpriseF3'),
        t('planEnterpriseF4'),
        t('planEnterpriseF5'),
      ],
      isPopular: false,
    },
  ];

  const calcCrypto = (usd: number) => {
    const trxPrice = livePrices.TRX > 0 ? livePrices.TRX : 0.33;
    const solPrice = livePrices.SOL > 0 ? livePrices.SOL : 97;
    const trx = (usd / trxPrice).toFixed(1);
    const sol = (usd / solPrice).toFixed(2);
    return `≈ ${trx} TRX / ${sol} SOL`;
  };

  const handlePlanClick = (plan: PlanItem) => {
    if (plan.id === 'community') {
      onSelectPlan(plan.id);
      setActivatedSuccess(plan.id);
      setTimeout(() => {
        setActivatedSuccess(null);
        onClose();
      }, 1200);
      return;
    }
    setSelectedPlanForPayment(plan);
    setTxHash('');
    setVerificationError(null);
    setVerificationLogs([]);
    setIsMatched(false);
    setShowManualTx(false);
  };

  const getDepositAddress = (network: Network): string => {
    if (activeIntent && activeIntent.network === network && activeIntent.depositAddress) {
      return activeIntent.depositAddress;
    }
    if (network === 'TRON') return currentAddresses.TRON || adminAddresses.TRON;
    if (network === 'ETHEREUM') return currentAddresses.ETHEREUM || adminAddresses.ETHEREUM;
    return currentAddresses.SOLANA || adminAddresses.SOLANA;
  };

  const getCheckoutAmounts = (plan: PlanItem, network: Network) => {
    if (activeIntent && activeIntent.network === network) {
      return {
        nativeAmount: String(activeIntent.expectedNative),
        nativeSymbol: activeIntent.nativeSymbol,
        stableAmount: activeIntent.expectedUsd.toFixed(2),
        stableSymbol: activeIntent.stableSymbol,
      };
    }
    const usd = billingCycle === 'weekly' ? plan.weeklyUsd : plan.monthlyUsd;
    if (network === 'TRON') {
      const trxPrice = livePrices.TRX > 0 ? livePrices.TRX : 0.31;
      return {
        nativeAmount: (usd / trxPrice).toFixed(2),
        nativeSymbol: 'TRX',
        stableAmount: usd.toFixed(2),
        stableSymbol: 'USDT',
      };
    }
    if (network === 'SOLANA') {
      const solPrice = livePrices.SOL > 0 ? livePrices.SOL : 83;
      return {
        nativeAmount: (usd / solPrice).toFixed(4),
        nativeSymbol: 'SOL',
        stableAmount: usd.toFixed(2),
        stableSymbol: 'USDT',
      };
    }
    const ethPrice = livePrices.ETH > 0 ? livePrices.ETH : 2040;
    return {
      nativeAmount: (usd / ethPrice).toFixed(5),
      nativeSymbol: 'ETH',
      stableAmount: usd.toFixed(2),
      stableSymbol: 'USDT',
    };
  };

  const formatRemainingTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCopy = (text: string, field: 'addr' | 'native' | 'stable') => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Verify transaction hash, check recipient address and amount matching strictly on-chain
  const handleVerifyPayment = async () => {
    if (isVerifyingRef.current || isVerifying || !selectedPlanForPayment) return;
    const cleanHash = txHash.trim();

    if (!cleanHash) {
      setVerificationError(t('txErrorEmpty'));
      return;
    }

    let normalizedHash = cleanHash;
    const tronMatch = cleanHash.match(/tronscan\.(?:org|io)\/#\/transaction\/([0-9a-fA-F]{64})/i);
    if (tronMatch) normalizedHash = tronMatch[1];

    const ethMatch = cleanHash.match(/etherscan\.(?:io|com)\/tx\/(0x[0-9a-fA-F]{64})/i);
    if (ethMatch) normalizedHash = ethMatch[1];

    const solMatch = cleanHash.match(/(?:solscan\.(?:io|com)|solana\.fm)\/tx\/([1-9A-HJ-NP-Za-km-z]{80,95})/i);
    if (solMatch) normalizedHash = solMatch[1];

    if (paymentNetwork === 'ETHEREUM') {
      if (!normalizedHash.startsWith('0x') && /^[0-9a-fA-F]{64}$/.test(normalizedHash)) {
        normalizedHash = '0x' + normalizedHash;
      }
      if (!/^0x[0-9a-fA-F]{64}$/i.test(normalizedHash)) {
        setVerificationError(t('txErrorInvalid'));
        return;
      }
    } else if (paymentNetwork === 'TRON') {
      normalizedHash = normalizedHash.replace(/^0x/i, '');
      if (!/^[0-9a-fA-F]{64}$/i.test(normalizedHash)) {
        setVerificationError(t('txErrorInvalid'));
        return;
      }
    } else if (paymentNetwork === 'SOLANA') {
      if (!/^[1-9A-HJ-NP-Za-km-z]{80,95}$/.test(normalizedHash)) {
        setVerificationError(t('txErrorInvalid'));
        return;
      }
    }

    isVerifyingRef.current = true;
    setVerificationError(null);
    setIsVerifying(true);
    setVerificationLogs([
      `> Connecting to ${paymentNetwork} mainnet RPC cluster...`,
      `> Auditing on-chain transaction: ${normalizedHash.slice(0, 12)}...`,
    ]);

    const currentTgId = getTelegramUserId();
    const controller = new AbortController();
    const clientTimeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: getTelegramHeaders(),
        body: JSON.stringify({
          txHash: normalizedHash,
          network: paymentNetwork,
          plan: selectedPlanForPayment.id,
          planId: selectedPlanForPayment.id,
          billingCycle,
          lang: language,
          tgId: currentTgId,
          intentId: activeIntent?.id,
        }),
        signal: controller.signal,
      });

      const result = await res.json();
      if (result.logs && Array.isArray(result.logs)) {
        setVerificationLogs(result.logs);
      }

      if (!result.ok) {
        setIsMatched(false);
        setVerificationError(result.error || 'Verification failed');
        setVerificationLogs((prev) => [
          ...prev,
          `> [REJECTED] ${result.error || 'Verification failed'}`,
        ]);
        return;
      }

      const finalPlan = result.planId || selectedPlanForPayment.id;
      applyConfirmedActivation(finalPlan);
    } catch (err: unknown) {
      setIsMatched(false);
      let msg = err instanceof Error ? err.message : 'Server verification error';
      if (err instanceof Error && err.name === 'AbortError') {
        msg =
          language === 'ru'
            ? 'Время ожидания ответа истекло. Проверьте сеть или попробуйте снова.'
            : 'Request timed out. Please check your network and retry.';
      }
      setVerificationError(msg);
      setVerificationLogs((prev) => [...prev, `> [ERROR] ${msg}`]);
    } finally {
      clearTimeout(clientTimeout);
      isVerifyingRef.current = false;
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto terminal-scroll animate-drawer-enter sm:animate-modal-3d">
        <div className="rounded-t-3xl sm:rounded-3xl border border-white/12 bg-[#12151F] shadow-[0_-12px_40px_rgba(0,0,0,0.9)] p-5 relative overflow-hidden">
          {/* Top Drag Handle (Mobile Ergonomics) */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3.5 sm:hidden" />

          {/* Top Hairline Accent */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#22D3EE]/20 to-[#38E8FF]/10 border border-[#22D3EE]/40 flex items-center justify-center text-[#38E8FF] shadow-[0_0_12px_rgba(34,211,238,0.3)]">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-wider text-white">
                    {selectedPlanForPayment ? t('paymentCheckout') : t('licensingTitle')}
                  </h3>
                  <span className="text-[10px] font-mono text-[#38E8FF] tracking-wider uppercase font-semibold">
                    {selectedPlanForPayment
                      ? `${selectedPlanForPayment.name} // ${t('onChainAudit')}`
                      : t('computeTiers')}
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

            {/* Success Message Banner */}
            {activatedSuccess && (
              <div className="mb-4 p-3 rounded-2xl bg-[#00E676]/15 border border-[#00E676]/40 text-center animate-fadeIn">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#00E676]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('planActivatedSuccess')}</span>
                </div>
                <span className="text-[10px] font-mono text-[#CBD5E1]">
                  {t('planUpgradedTo')} {activatedSuccess.toUpperCase()}
                </span>
              </div>
            )}

            {!selectedPlanForPayment ? (
              /* Plans Selection Screen */
              <>
                {/* Promo Banner */}
                {pricingSettings.banner?.enabled && (
                  <div
                    className="mb-3.5 p-2.5 rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(0,0,0,0.4)] transition-all animate-fadeIn"
                    style={{
                      background: pricingSettings.banner.bgColor,
                      borderColor: pricingSettings.banner.borderColor,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  >
                    <div className="flex items-center gap-2 text-xs font-black">
                      <span
                        className="px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wider uppercase shadow-sm"
                        style={{
                          background: pricingSettings.banner.badgeBgColor,
                          color: pricingSettings.banner.badgeTextColor,
                        }}
                      >
                        {pricingSettings.banner.badgeText || '50% OFF'}
                      </span>
                      <span
                        className="text-[11px] font-bold tracking-wide"
                        style={{ color: pricingSettings.banner.textColor }}
                      >
                        {language === 'ru'
                          ? pricingSettings.banner.textRu || pricingSettings.banner.textEn
                          : pricingSettings.banner.textEn || pricingSettings.banner.textRu}
                      </span>
                    </div>
                    <span
                      className="text-[9.5px] font-mono font-bold shrink-0 uppercase tracking-wider hidden xs:inline opacity-80"
                      style={{ color: pricingSettings.banner.textColor }}
                    >
                      PROMO
                    </span>
                  </div>
                )}

                {/* Billing Cycle Toggle */}
                <div className="flex justify-center mb-4">
                  <div className="bg-black/50 p-1 rounded-2xl border border-white/10 flex items-center gap-1 text-xs">
                    <button
                      onClick={() => setBillingCycle('weekly')}
                      type="button"
                      className={`px-4 py-1.5 rounded-xl font-bold tracking-wider transition-all cursor-pointer ${
                        billingCycle === 'weekly'
                          ? 'bg-[#22D3EE]/20 text-[#38E8FF] border border-[#22D3EE]/40 shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                          : 'text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      {t('weekly')}
                    </button>
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      type="button"
                      className={`px-4 py-1.5 rounded-xl font-bold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                        billingCycle === 'monthly'
                          ? 'bg-[#22D3EE]/20 text-[#38E8FF] border border-[#22D3EE]/40 shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                          : 'text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      <span>{t('monthly')}</span>
                      {isDiscount && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Plans List */}
                <div className="space-y-3 mb-4">
                  {plans.map((plan) => {
                    const isCurrent = activePlan === plan.id;
                    const price = billingCycle === 'weekly' ? plan.priceWeekly : plan.priceMonthly;
                    const originalPrice = billingCycle === 'weekly' ? plan.originalPriceWeekly : plan.originalPriceMonthly;
                    const period = billingCycle === 'weekly' ? '/wk' : '/mo';
                    const cryptoEquiv =
                      price === 'FREE'
                        ? '0 TRX / 0 SOL'
                        : billingCycle === 'weekly'
                        ? calcCrypto(plan.weeklyUsd)
                        : calcCrypto(plan.monthlyUsd);

                    return (
                      <div
                        key={plan.id}
                        className={`rounded-2xl p-4 transition-all duration-300 relative overflow-hidden ${
                          plan.isPopular
                            ? 'bg-gradient-to-b from-[#1C2738] to-[#121A26] border border-[#22D3EE]/40 shadow-[0_10px_25px_-5px_rgba(34,211,238,0.18)]'
                            : 'bg-black/40 border border-white/10 hover:border-white/20'
                        }`}
                      >
                        {plan.isPopular && (
                          <div className="absolute top-0 right-0 bg-gradient-to-l from-[#22D3EE] to-[#38E8FF] text-black text-[9px] font-extrabold uppercase px-3 py-0.5 rounded-bl-xl shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                            RECOMMENDED
                          </div>
                        )}

                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-extrabold text-white tracking-wider">
                                {plan.name}
                              </h4>
                              {isCurrent && (
                                <span className="text-[9px] font-mono px-2 py-0.2 rounded-full bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30 font-bold">
                                  {t('currentlyActive')}
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] text-[#9CA3AF] mt-0.5">
                              {plan.description}
                            </p>
                          </div>

                          <div className="text-right">
                            <div className="flex items-baseline justify-end gap-1.5">
                              {originalPrice && (
                                <span className="text-xs font-mono line-through text-[#EF4444]/90 font-semibold">
                                  {originalPrice}
                                </span>
                              )}
                              <span className="text-lg font-mono font-extrabold text-[#00E676]">
                                {price}
                              </span>
                              {price !== 'FREE' && (
                                <span className="text-[10px] font-mono text-[#9CA3AF]">
                                  {period}
                                </span>
                              )}
                            </div>
                            {price !== 'FREE' && (
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                {isDiscount && (
                                  <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-[#FF0055]/20 text-[#FF5252] border border-[#FF0055]/30">
                                    -{discountPercent}%
                                  </span>
                                )}
                                <span className="text-[9.5px] font-mono text-[#38E8FF]">
                                  {cryptoEquiv}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Features list */}
                        <div className="grid grid-cols-1 gap-1.5 my-3 pt-2 border-t border-white/5 text-[11px]">
                          {plan.features.map((feat, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-[#CBD5E1]">
                              <Check className="w-3.5 h-3.5 text-[#00E676] shrink-0" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>

                        {/* Activation CTA */}
                        <button
                          onClick={() => handlePlanClick(plan)}
                          disabled={isCurrent}
                          type="button"
                          className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 ${
                            isCurrent
                              ? 'bg-white/5 text-[#9CA3AF] border border-white/10 cursor-default'
                              : plan.isPopular
                              ? 'button-dark-metal text-white hover:text-[#38E8FF] border border-[#22D3EE]/40'
                              : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                          }`}
                        >
                          {isCurrent ? (
                            <span>{t('currentlyActive')}</span>
                          ) : (
                            <>
                              <span>{t('selectPlan')} {plan.name}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Payment Checkout & On-Chain Verify Screen */
              <div className="space-y-4 animate-modal-3d">
                <button
                  onClick={() => setSelectedPlanForPayment(null)}
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-mono text-[#38E8FF] hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t('backToPlans')}</span>
                </button>

                {/* Plan Summary Card */}
                <div className="p-3.5 rounded-2xl bg-black/50 border border-[#22D3EE]/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#9CA3AF] uppercase block">{t('selectedTier')}</span>
                      <h4 className="text-base font-extrabold text-white">{selectedPlanForPayment.name}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-mono font-extrabold text-[#00E676]">
                        {billingCycle === 'weekly' ? selectedPlanForPayment.priceWeekly : selectedPlanForPayment.priceMonthly}
                      </span>
                      <span className="text-[10px] font-mono text-[#9CA3AF] block uppercase">
                        {billingCycle === 'weekly' ? t('weekly') : t('monthly')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Currency Selector */}
                <div>
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-2">
                    {t('selectPaymentNet')}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['TRON', 'SOLANA', 'ETHEREUM'] as Network[]).map((net) => (
                      <button
                        key={net}
                        onClick={() => {
                          setPaymentNetwork(net);
                          setTxHash('');
                          setVerificationError(null);
                          setVerificationLogs([]);
                          setIsMatched(false);
                        }}
                        type="button"
                        className={`p-2.5 rounded-xl border text-center font-mono text-xs font-bold transition-all cursor-pointer ${
                          paymentNetwork === net
                            ? 'bg-[#22D3EE]/20 border-[#22D3EE] text-white shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                            : 'bg-black/40 border-white/10 text-[#9CA3AF] hover:text-white'
                        }`}
                      >
                        <div>{net === 'TRON' ? 'TRX / USDT' : net}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deposit Details Card with Unique Micro-Amount Fingerprint */}
                {(() => {
                  const amounts = getCheckoutAmounts(selectedPlanForPayment, paymentNetwork);
                  const destAddr = getDepositAddress(paymentNetwork);
                  return (
                    <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                      {/* Deposit Header & Invoice Timer */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                        <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                          {t('requiredDeposit')}
                        </span>
                        {activeIntent && intentSecondsLeft > 0 && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-mono text-[#94A3B8]">
                            <Clock className="w-3 h-3 text-[#38E8FF]" />
                            <span>
                              {t('expiresIn')}: <strong className="text-white">{formatRemainingTime(intentSecondsLeft)}</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Exact Unique Amount Notice */}
                      <p className="text-[10.5px] text-[#CBD5E1] leading-snug">
                        {t('exactAmountNotice')}
                      </p>

                      {intentLoading ? (
                        <div className="py-3 px-3 rounded-xl bg-black/50 border border-white/5 text-center text-xs font-mono text-[#38E8FF] animate-pulse">
                          {t('creatingInvoice')}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {/* Option 1: Stablecoin Exact Amount (USDT) */}
                          <div className="flex items-center justify-between bg-black/50 rounded-xl p-2.5 border border-[#00E676]/25">
                            <div>
                              <span className="text-[9px] font-mono text-[#94A3B8] uppercase block">
                                {paymentNetwork === 'TRON' ? 'USDT TRC-20' : paymentNetwork === 'ETHEREUM' ? 'USDT / USDC ERC-20' : 'USDT / USDC SPL'}
                              </span>
                              <span className="text-sm font-mono font-extrabold text-[#00E676]">
                                {amounts.stableAmount} {amounts.stableSymbol}
                              </span>
                            </div>
                            <button
                              onClick={() => handleCopy(amounts.stableAmount, 'stable')}
                              type="button"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-[#00E676] cursor-pointer"
                              title="Copy Exact USDT Amount"
                            >
                              {copiedField === 'stable' ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{t('copied')}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>{t('copy')}</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Option 2: Native Coin Exact Amount (TRX / ETH / SOL) */}
                          <div className="flex items-center justify-between bg-black/50 rounded-xl p-2.5 border border-[#22D3EE]/25">
                            <div>
                              <span className="text-[9px] font-mono text-[#94A3B8] uppercase block">
                                {amounts.nativeSymbol} ({paymentNetwork} NATIVE)
                              </span>
                              <span className="text-sm font-mono font-extrabold text-[#38E8FF]">
                                {amounts.nativeAmount} {amounts.nativeSymbol}
                              </span>
                            </div>
                            <button
                              onClick={() => handleCopy(amounts.nativeAmount, 'native')}
                              type="button"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-[#38E8FF] cursor-pointer"
                              title="Copy Exact Native Amount"
                            >
                              {copiedField === 'native' ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-[#00E676]" />
                                  <span className="text-[#00E676]">{t('copied')}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>{t('copy')}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Destination Address */}
                      <div>
                        <span className="text-[10px] font-bold text-[#9CA3AF] uppercase block mb-1">
                          {t('adminDestination')} ({paymentNetwork})
                        </span>
                        <div className="bg-black/50 rounded-xl p-2.5 border border-white/5 flex items-center justify-between gap-2">
                          <span className="text-xs font-mono text-white break-all select-all">
                            {destAddr}
                          </span>
                          <button
                            onClick={() => handleCopy(destAddr, 'addr')}
                            type="button"
                            className="flex items-center gap-1 text-[11px] font-mono text-[#38E8FF] hover:text-white shrink-0 cursor-pointer"
                            title="Copy Address"
                          >
                            {copiedField === 'addr' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#00E676]" />
                                <span className="text-[#00E676]">{t('copied')}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>{t('copy')}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Verification Logs Console */}
                {verificationLogs.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-black/80 border border-white/10 font-mono text-[10px] space-y-1 text-[#CBD5E1]">
                    {verificationLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={
                          log.includes('MATCHED') || log.includes('CONFIRMED')
                            ? 'text-[#00E676] font-bold'
                            : 'text-[#38E8FF]'
                        }
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                )}

                {/* Match Confirmed Banner */}
                {isMatched && (
                  <div className="p-2.5 rounded-xl bg-[#00E676]/15 border border-[#00E676]/40 flex items-center gap-2 text-xs font-bold text-[#00E676] animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{t('matchConfirmed')}</span>
                  </div>
                )}

                {/* Primary Instant Auto-Check CTA Button (No TxHash Copy Required) */}
                {activeIntent && (
                  <button
                    onClick={() => checkIntentStatus(true)}
                    disabled={isAutoChecking || isVerifying || isMatched}
                    type="button"
                    className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-extrabold tracking-wider uppercase cursor-pointer select-none transition-all ${
                      isMatched
                        ? 'bg-[#00E676]/20 border border-[#00E676]/50 text-[#00E676]'
                        : 'bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00C853] hover:to-[#00B048] text-black shadow-[0_4px_16px_rgba(0,230,118,0.25)] active:scale-98'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${isAutoChecking ? 'animate-spin' : ''}`} />
                    <span>{isAutoChecking ? t('checkingOnChain') : isMatched ? 'MATCH CONFIRMED' : t('checkNowBtn')}</span>
                  </button>
                )}

                {/* Manual TxHash Backup Accordion */}
                <div className="rounded-2xl bg-black/50 border border-white/10 overflow-hidden">
                  <button
                    onClick={() => setShowManualTx((prev) => !prev)}
                    type="button"
                    className="w-full px-4 py-2.5 flex items-center justify-between text-[11px] font-mono text-[#94A3B8] hover:text-white cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-[#22D3EE]" />
                      <span>{t('manualTxToggle')}</span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showManualTx ? 'rotate-180' : ''}`} />
                  </button>

                  {showManualTx && (
                    <div className="p-3.5 pt-1 space-y-2.5 border-t border-white/[0.06]">
                      <input
                        type="text"
                        value={txHash}
                        onChange={(e) => {
                          setTxHash(e.target.value);
                          if (verificationError) setVerificationError(null);
                        }}
                        placeholder={
                          paymentNetwork === 'ETHEREUM'
                            ? '0x...'
                            : paymentNetwork === 'TRON'
                            ? '64-hex Tron transaction hash...'
                            : 'Solana base58 transaction signature...'
                        }
                        className="w-full p-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-[#22D3EE] text-xs font-mono text-[#38E8FF] placeholder-[#64748B] focus:outline-none"
                      />

                      {verificationError && (
                        <div className="flex items-center gap-1.5 text-xs text-[#FF5252] font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{verificationError}</span>
                        </div>
                      )}

                      <button
                        onClick={handleVerifyPayment}
                        disabled={isVerifying || isMatched}
                        type="button"
                        className="w-full py-2.5 rounded-xl button-dark-metal border border-[#22D3EE]/30 flex items-center justify-center gap-2 text-xs font-bold tracking-wider uppercase text-white hover:text-[#38E8FF] cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#38E8FF]" />
                        <span>{isVerifying ? t('checkingOnChain') : t('verifyAndActivate')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-[#0B0D14] border border-white/[0.04] text-center mt-3">
              <span className="text-[10px] font-mono-terminal text-[#64748B]">
                SECURE INFRASTRUCTURE // REAL-TIME MEMPOOL RPC AUDIT
              </span>
            </div>
        </div>
      </div>
    </div>
  );
};