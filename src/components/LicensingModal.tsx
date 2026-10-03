import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useLivePrices } from '../hooks/useLivePrices';
import { useLanguage } from '../i18n/LanguageContext';
import { DEFAULT_ADMIN_DEPOSIT_ADDRESSES, DEFAULT_PRICING_SETTINGS } from '../data/adminSettings';

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
  const [copied, setCopied] = useState(false);

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
      name: 'COMMUNITY',
      description: 'Standard security testing & basic analysis',
      priceWeekly: 'FREE',
      priceMonthly: 'FREE',
      weeklyUsd: 0,
      monthlyUsd: 0,
      features: [
        'Single target scan limit (1/1 address)',
        'Withdrawals authorized under $100 only',
        '4 Virtual worker threads',
        'Standard dictionary seeds',
      ],
      isPopular: false,
    },
    {
      id: 'pro',
      name: 'PRO SUITE',
      description: 'Advanced multi-threaded scanning power',
      priceWeekly: `$${proWeeklyUsd}`,
      priceMonthly: `$${proMonthlyUsd}`,
      originalPriceWeekly: isDiscount ? `$${proBaseWeekly}` : undefined,
      originalPriceMonthly: isDiscount ? `$${proBaseMonthly}` : undefined,
      weeklyUsd: proWeeklyUsd,
      monthlyUsd: proMonthlyUsd,
      features: [
        'High-capacity withdrawals up to $10,000+',
        'Unlimited target address extractions',
        '16 High-performance worker threads',
        'Multi-network parallel clustering (TRC + ERC + SOL)',
        'Priority mempool routing & zero delay',
      ],
      isPopular: true,
    },
    {
      id: 'enterprise',
      name: 'ENTERPRISE',
      description: 'Maximum computing capacity & custom RPCs',
      priceWeekly: `$${entWeeklyUsd}`,
      priceMonthly: `$${entMonthlyUsd}`,
      originalPriceWeekly: isDiscount ? `$${entBaseWeekly}` : undefined,
      originalPriceMonthly: isDiscount ? `$${entBaseMonthly}` : undefined,
      weeklyUsd: entWeeklyUsd,
      monthlyUsd: entMonthlyUsd,
      features: [
        'Unrestricted withdrawals up to $50,000+',
        'Unlimited target address extractions',
        '64 Ultra threads & real-time hash collision',
        'Dedicated RPC node cluster routing',
        '24/7 SLA infrastructure support',
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
    // Notify admin when user clicks to buy / select a plan
    try {
      const tgUser = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number | string; first_name?: string; last_name?: string; username?: string } } } } }).Telegram?.WebApp?.initDataUnsafe?.user;
      fetch('/api/plan-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          price: billingCycle === 'weekly' ? plan.priceWeekly : plan.priceMonthly,
          billingCycle,
          user: tgUser
            ? {
                id: tgUser.id,
                name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Operative',
                username: tgUser.username || '',
              }
            : null,
        }),
      }).catch(() => {});
    } catch {}

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
  };

  const getDepositAddress = (network: Network): string => {
    if (network === 'TRON') return currentAddresses.TRON || adminAddresses.TRON;
    if (network === 'ETHEREUM') return currentAddresses.ETHEREUM || adminAddresses.ETHEREUM;
    return currentAddresses.SOLANA || adminAddresses.SOLANA;
  };

  const getPaymentAmountString = (plan: PlanItem, network: Network): string => {
    const usd = billingCycle === 'weekly' ? plan.weeklyUsd : plan.monthlyUsd;
    if (network === 'TRON') {
      const trxPrice = livePrices.TRX > 0 ? livePrices.TRX : 0.33;
      const trx = (usd / trxPrice).toFixed(1);
      return `${trx} TRX (or ${usd} USDT TRC-20)`;
    }
    if (network === 'SOLANA') {
      const solPrice = livePrices.SOL > 0 ? livePrices.SOL : 97;
      const sol = (usd / solPrice).toFixed(3);
      return `${sol} SOL`;
    }
    const ethPrice = livePrices.ETH > 0 ? livePrices.ETH : 2400;
    const eth = (usd / ethPrice).toFixed(4);
    return `${eth} ETH`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Verify transaction hash, check recipient address and amount matching strictly on-chain
  const handleVerifyPayment = async () => {
    if (!selectedPlanForPayment) return;
    const cleanHash = txHash.trim();

    if (!cleanHash) {
      setVerificationError(t('txErrorEmpty'));
      return;
    }

    let normalizedHash = cleanHash;
    // Auto-extract hash if user pasted explorer URL
    const tronMatch = cleanHash.match(/tronscan\.(?:org|io)\/#\/transaction\/([0-9a-fA-F]{64})/i);
    if (tronMatch) normalizedHash = tronMatch[1];

    const ethMatch = cleanHash.match(/etherscan\.(?:io|com)\/tx\/(0x[0-9a-fA-F]{64})/i);
    if (ethMatch) normalizedHash = ethMatch[1];

    const solMatch = cleanHash.match(/(?:solscan\.(?:io|com)|solana\.fm)\/tx\/([1-9A-HJ-NP-Za-km-z]{80,95})/i);
    if (solMatch) normalizedHash = solMatch[1];

    // Format check & sanitization
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

    setVerificationError(null);
    setIsVerifying(true);
    setVerificationLogs([
      `> Connecting to ${paymentNetwork} mainnet RPC cluster...`,
      `> Auditing on-chain transaction: ${normalizedHash.slice(0, 12)}...`,
    ]);

    let currentTgId: string | undefined;
    try {
      const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number | string } } } } }).Telegram?.WebApp;
      if (tg?.initDataUnsafe?.user?.id) {
        currentTgId = String(tg.initDataUnsafe.user.id);
      }
    } catch {}

    const controller = new AbortController();
    const clientTimeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: normalizedHash,
          network: paymentNetwork,
          planId: selectedPlanForPayment.id,
          billingCycle,
          lang: language,
          tgId: currentTgId,
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

      // Successful verification
      setIsMatched(true);
      const finalPlan = result.planId || selectedPlanForPayment.id;
      try {
        localStorage.setItem('shark_user_plan', finalPlan);
      } catch {}

      setTimeout(() => {
        onSelectPlan(finalPlan);
        setActivatedSuccess(finalPlan);
        setSelectedPlanForPayment(null);

        setTimeout(() => {
          setActivatedSuccess(null);
          onClose();
        }, 1500);
      }, 1200);
    } catch (err: unknown) {
      setIsMatched(false);
      let msg = err instanceof Error ? err.message : 'Server verification error';
      if (err instanceof Error && err.name === 'AbortError') {
        msg = language === 'ru'
          ? 'Время ожидания ответа истекло. Проверьте сеть или отправьте хэш в чат бота.'
          : 'Request timed out. Please check your network or send the transaction hash directly to the Telegram bot chat.';
      }
      setVerificationError(msg);
      setVerificationLogs((prev) => [
        ...prev,
        `> [ERROR] ${msg}`,
      ]);
    } finally {
      clearTimeout(clientTimeout);
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto terminal-scroll animate-modal-3d">
        <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-b from-[#22D3EE]/50 via-white/10 to-black/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)]">
          <div className="glass-panel-3d rounded-3xl p-5 relative overflow-hidden bg-[#141724]">
            {/* Top highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#38E8FF]/80 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-white/10">
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
                  System parameters upgraded to {activatedSuccess.toUpperCase()}
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

                {/* Deposit Details Card */}
                <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                  {/* Amount to send */}
                  <div>
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase block mb-1">
                      {t('requiredDeposit')} ({paymentNetwork})
                    </span>
                    <div className="flex items-center justify-between bg-black/50 rounded-xl p-2.5 border border-white/5">
                      <span className="text-sm font-mono font-extrabold text-[#38E8FF]">
                        {getPaymentAmountString(selectedPlanForPayment, paymentNetwork)}
                      </span>
                      <button
                        onClick={() => handleCopy(getPaymentAmountString(selectedPlanForPayment, paymentNetwork))}
                        type="button"
                        className="text-xs text-[#9CA3AF] hover:text-white cursor-pointer"
                        title="Copy Amount"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {livePrices && (
                      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-lg bg-[#22D3EE]/10 border border-[#22D3EE]/20 text-[10px] font-mono text-[#38E8FF]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse"></span>
                        <span>
                          {paymentNetwork === 'TRON' && `1 TRX ≈ $${(livePrices.TRX || 0.33).toFixed(3)} USD • Live Oracle Rate`}
                          {paymentNetwork === 'SOLANA' && `1 SOL ≈ $${(livePrices.SOL || 97).toFixed(2)} USD • Live Oracle Rate`}
                          {paymentNetwork === 'ETHEREUM' && `1 ETH ≈ $${(livePrices.ETH || 2400).toFixed(2)} USD • Live Oracle Rate`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Destination Address */}
                  <div>
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase block mb-1">
                      {t('adminDestination')} ({paymentNetwork})
                    </span>
                    <div className="bg-black/50 rounded-xl p-2.5 border border-white/5 flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-white break-all select-all">
                        {getDepositAddress(paymentNetwork)}
                      </span>
                      <button
                        onClick={() => handleCopy(getDepositAddress(paymentNetwork))}
                        type="button"
                        className="flex items-center gap-1 text-[11px] font-mono text-[#38E8FF] hover:text-white shrink-0 cursor-pointer"
                        title="Copy Address"
                      >
                        {copied ? (
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

                {/* Transaction Hash Input Box */}
                <div className="p-4 rounded-2xl bg-black/70 border border-[#22D3EE]/40 space-y-2.5 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-bold text-[#CBD5E1] uppercase tracking-wider flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-[#22D3EE]" />
                      <span>{t('enterTxid')}</span>
                    </label>
                  </div>

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

                  {/* Verification Error Message */}
                  {verificationError && (
                    <div className="flex items-center gap-1.5 text-xs text-[#FF5252] font-semibold pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{verificationError}</span>
                    </div>
                  )}

                  {/* Verification Logs Console */}
                  {verificationLogs.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-black/80 border border-white/10 font-mono text-[10px] space-y-1 mt-2 text-[#CBD5E1]">
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
                </div>

                {/* Confirm & Verify Button */}
                <button
                  onClick={handleVerifyPayment}
                  disabled={isVerifying || isMatched}
                  type="button"
                  className={`w-full py-3.5 rounded-2xl button-dark-metal flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase cursor-pointer select-none ${
                    isMatched ? 'text-[#00E676] border-[#00E676]/50' : 'text-white hover:text-[#38E8FF]'
                  }`}
                >
                  {isVerifying ? (
                    <span className="animate-pulse text-[#38E8FF]">
                      {t('checkingOnChain')}
                    </span>
                  ) : isMatched ? (
                    <span>MATCH CONFIRMED (12 BLOCKS)</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#38E8FF]" />
                      <span>{t('verifyAndActivate')}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center mt-3">
              <span className="text-[10px] font-mono text-[#64748B]">
                SECURE INFRASTRUCTURE // REAL-TIME MEMPOOL RPC AUDIT
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};