import type { AdminDepositAddresses, AdminUser, PricingSettings } from '../types';

export const DEFAULT_ADMIN_DEPOSIT_ADDRESSES: AdminDepositAddresses = {
  TRON: 'TLsV52sRDL79HXGGm9yzwKibb6XuUadTnS',
  ETHEREUM: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  SOLANA: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
};

export const DEFAULT_ADMIN_USERS: AdminUser[] = [
  {
    id: 'user-8515329556',
    tgId: '8515329556',
    name: 'Administrator',
    username: '@admin',
    plan: 'enterprise',
    extractsCount: 0,
    totalExtractedUsd: 0,
    status: 'ACTIVE',
    joinedAt: 'System Owner',
  },
];

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  plans: {
    pro: {
      weekly: 25,
      monthly: 79,
    },
    enterprise: {
      weekly: 69,
      monthly: 199,
    },
  },
  discount: {
    enabled: true,
    percent: 50,
  },
  banner: {
    enabled: true,
    textEn: 'New members get 50% off their first month!',
    textRu: 'Новые пользователи получают скидку 50% на первый месяц!',
    badgeText: '50% OFF',
    textColor: '#FFFFFF',
    bgColor: 'linear-gradient(135deg, rgba(255,0,85,0.2) 0%, rgba(168,85,247,0.2) 50%, rgba(56,232,255,0.2) 100%)',
    borderColor: 'rgba(255,0,85,0.5)',
    badgeBgColor: 'linear-gradient(135deg, #FF0055 0%, #FF5252 100%)',
    badgeTextColor: '#FFFFFF',
  },
};

export const PROMO_THEME_PRESETS = [
  {
    id: 'cyber_magenta',
    name: 'Cyber Magenta',
    textColor: '#FFFFFF',
    bgColor: 'linear-gradient(135deg, rgba(255,0,85,0.25) 0%, rgba(168,85,247,0.2) 50%, rgba(56,232,255,0.2) 100%)',
    borderColor: 'rgba(255,0,85,0.5)',
    badgeBgColor: 'linear-gradient(135deg, #FF0055 0%, #FF5252 100%)',
    badgeTextColor: '#FFFFFF',
  },
  {
    id: 'cyan_neon',
    name: 'Cyan Neon',
    textColor: '#38E8FF',
    bgColor: 'linear-gradient(135deg, rgba(34,211,238,0.2) 0%, rgba(14,165,233,0.1) 100%)',
    borderColor: 'rgba(34,211,238,0.4)',
    badgeBgColor: 'rgba(34,211,238,0.25)',
    badgeTextColor: '#38E8FF',
  },
  {
    id: 'emerald_matrix',
    name: 'Emerald Matrix',
    textColor: '#00E676',
    bgColor: 'linear-gradient(135deg, rgba(0,230,118,0.2) 0%, rgba(16,185,129,0.1) 100%)',
    borderColor: 'rgba(0,230,118,0.4)',
    badgeBgColor: 'rgba(0,230,118,0.25)',
    badgeTextColor: '#69F0AE',
  },
  {
    id: 'gold_flame',
    name: 'Gold Flame',
    textColor: '#FCD34D',
    bgColor: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(239,68,68,0.15) 100%)',
    borderColor: 'rgba(245,158,11,0.4)',
    badgeBgColor: 'rgba(239,68,68,0.3)',
    badgeTextColor: '#FCA5A5',
  },
  {
    id: 'purple_abyss',
    name: 'Purple Abyss',
    textColor: '#C084FC',
    bgColor: 'linear-gradient(135deg, rgba(168,85,247,0.22) 0%, rgba(217,70,239,0.12) 100%)',
    borderColor: 'rgba(168,85,247,0.45)',
    badgeBgColor: 'rgba(168,85,247,0.3)',
    badgeTextColor: '#F0ABFC',
  },
];

/**
 * Computes dynamic Pro weekly/monthly price taking into account global discounts.
 */
export function getEffectiveProPrice(
  pricingSettings: PricingSettings = DEFAULT_PRICING_SETTINGS,
  cycle: 'weekly' | 'monthly' = 'weekly'
): number {
  const base = Number(
    cycle === 'monthly'
      ? pricingSettings?.plans?.pro?.monthly ?? 79
      : pricingSettings?.plans?.pro?.weekly ?? 25
  );
  if (pricingSettings?.discount?.enabled) {
    const discountPercent = Number(pricingSettings.discount.percent ?? 0);
    return Math.round(base * (1 - discountPercent / 100));
  }
  return base;
}

/**
 * Computes dynamic Enterprise weekly/monthly price taking into account global discounts.
 */
export function getEffectiveEnterprisePrice(
  pricingSettings: PricingSettings = DEFAULT_PRICING_SETTINGS,
  cycle: 'weekly' | 'monthly' = 'weekly'
): number {
  const base = Number(
    cycle === 'monthly'
      ? pricingSettings?.plans?.enterprise?.monthly ?? 199
      : pricingSettings?.plans?.enterprise?.weekly ?? 69
  );
  if (pricingSettings?.discount?.enabled) {
    const discountPercent = Number(pricingSettings.discount.percent ?? 0);
    return Math.round(base * (1 - discountPercent / 100));
  }
  return base;
}