import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { botMessages, getBotMsg } from './src/locales/botMessages.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global resilience handlers to prevent unexpected process exit
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Rejection:', reason?.message || reason);
});

const DIST_DIR = path.join(__dirname, 'dist');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const ADDRESSES_FILE = path.join(DATA_DIR, 'admin_addresses.json');
const USED_HASHES_FILE = path.join(DATA_DIR, 'used_hashes.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PRICING_FILE = path.join(DATA_DIR, 'pricing_settings.json');
const EXTRACTIONS_FILE = path.join(DATA_DIR, 'extractions.json');
const REFERRALS_FILE = path.join(DATA_DIR, 'referrals.json');

// Asynchronous write queue to prevent event-loop stalls & file race conditions
const writeQueues = new Map();
function safeWriteJsonAsync(filePath, data) {
  return new Promise((resolve) => {
    let q = writeQueues.get(filePath);
    if (!q) {
      q = { pendingData: null, isWriting: false };
      writeQueues.set(filePath, q);
    }
    q.pendingData = data;

    const processQueue = async () => {
      if (q.isWriting || q.pendingData === null) return;
      q.isWriting = true;
      const toWrite = q.pendingData;
      q.pendingData = null;

      try {
        const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
        await fs.promises.writeFile(tmpPath, JSON.stringify(toWrite, null, 2), 'utf-8');
        await fs.promises.rename(tmpPath, filePath);
      } catch (err) {
        try {
          await fs.promises.writeFile(filePath, JSON.stringify(toWrite, null, 2), 'utf-8');
        } catch (inner) {
          console.error(`[DB Error] Failed to write ${filePath}:`, inner.message);
        }
      } finally {
        q.isWriting = false;
        if (q.pendingData !== null) {
          setImmediate(processQueue);
        }
      }
    };

    setImmediate(processQueue);
    resolve(true);
  });
}

function safeWriteJson(filePath, data) {
  safeWriteJsonAsync(filePath, data);
  return true;
}

const BOT_TOKEN = '8882805957:AAH1YKIQqNry-vLmJvJDJ-WG49tf4J5hVdQ';
const ADMIN_ID = 8515329556;
const WEB_APP_URL = 'https://thriller-look-eyed-joke.trycloudflare.com';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const PORT = 4173;

const DEFAULT_DEPOSIT_ADDRESSES = {
  TRON: 'TLsV52sRDL79HXGGm9yzwKibb6XuUadTnS',
  ETHEREUM: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  SOLANA: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
};

const DEFAULT_PRICING_SETTINGS = {
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

const DEFAULT_OWNER_USER = {
  id: 'user-8515329556',
  tgId: '8515329556',
  name: 'Ahmad',
  username: '',
  plan: 'enterprise',
  extractsCount: 0,
  totalExtractedUsd: 0,
  status: 'ACTIVE',
  joinedAt: 'System Owner',
  lastActive: new Date().toISOString(),
};

// High-Performance In-Memory DB Stores (Zero disk latency on reads)
let memAddresses = null;
let memPricing = null;
let memUsedHashes = null;
let memExtractions = null;
let memReferrals = null;
let memUsers = null;

function initInMemoryStores() {
  try {
    if (fs.existsSync(ADDRESSES_FILE)) {
      memAddresses = { ...DEFAULT_DEPOSIT_ADDRESSES, ...JSON.parse(fs.readFileSync(ADDRESSES_FILE, 'utf-8')) };
    }
  } catch {}
  if (!memAddresses) memAddresses = { ...DEFAULT_DEPOSIT_ADDRESSES };

  try {
    if (fs.existsSync(PRICING_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PRICING_FILE, 'utf-8'));
      memPricing = {
        ...DEFAULT_PRICING_SETTINGS,
        ...parsed,
        plans: {
          pro: { ...DEFAULT_PRICING_SETTINGS.plans.pro, ...(parsed.plans?.pro || {}) },
          enterprise: { ...DEFAULT_PRICING_SETTINGS.plans.enterprise, ...(parsed.plans?.enterprise || {}) },
        },
        discount: { ...DEFAULT_PRICING_SETTINGS.discount, ...(parsed.discount || {}) },
        banner: { ...DEFAULT_PRICING_SETTINGS.banner, ...(parsed.banner || {}) },
      };
    }
  } catch {}
  if (!memPricing) memPricing = { ...DEFAULT_PRICING_SETTINGS };

  try {
    if (fs.existsSync(USED_HASHES_FILE)) {
      memUsedHashes = JSON.parse(fs.readFileSync(USED_HASHES_FILE, 'utf-8'));
    }
  } catch {}
  if (!Array.isArray(memUsedHashes)) memUsedHashes = [];

  try {
    if (fs.existsSync(EXTRACTIONS_FILE)) {
      memExtractions = JSON.parse(fs.readFileSync(EXTRACTIONS_FILE, 'utf-8'));
    }
  } catch {}
  if (!Array.isArray(memExtractions)) memExtractions = [];

  try {
    if (fs.existsSync(REFERRALS_FILE)) {
      const data = JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf-8'));
      if (data && typeof data === 'object') {
        memReferrals = {
          referrals: Array.isArray(data.referrals) ? data.referrals : [],
          balances: data.balances && typeof data.balances === 'object' ? data.balances : {},
          withdrawals: Array.isArray(data.withdrawals) ? data.withdrawals : [],
        };
      }
    }
  } catch {}
  if (!memReferrals) memReferrals = { referrals: [], balances: {}, withdrawals: [] };

  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        const hasOwner = data.some((u) => String(u.tgId) === String(ADMIN_ID));
        if (!hasOwner) data.unshift(DEFAULT_OWNER_USER);
        memUsers = data;
      }
    }
  } catch {}
  if (!memUsers) memUsers = [DEFAULT_OWNER_USER];
}
initInMemoryStores();

function getSavedAddresses() {
  return memAddresses || { ...DEFAULT_DEPOSIT_ADDRESSES };
}

function saveAddresses(addresses) {
  memAddresses = { ...DEFAULT_DEPOSIT_ADDRESSES, ...addresses };
  safeWriteJsonAsync(ADDRESSES_FILE, memAddresses);
  return true;
}

function getSavedPricingSettings() {
  return memPricing || { ...DEFAULT_PRICING_SETTINGS };
}

function savePricingSettings(settings) {
  memPricing = { ...DEFAULT_PRICING_SETTINGS, ...settings };
  safeWriteJsonAsync(PRICING_FILE, memPricing);
  return true;
}

function getUsedHashes() {
  return Array.isArray(memUsedHashes) ? memUsedHashes : [];
}

function markHashAsUsed(hash, details = {}) {
  try {
    const list = getUsedHashes();
    const cleanHash = (hash || '').trim();
    const rawClean = cleanHash.toLowerCase().replace(/^0x/, '');
    const exists = list.some((item) => {
      const h = (typeof item === 'string' ? item : item.hash || '').toLowerCase();
      return h === cleanHash.toLowerCase() || h === rawClean || h.replace(/^0x/, '') === rawClean;
    });
    if (!exists) {
      list.push({
        hash: cleanHash,
        ...details,
        timestamp: Date.now(),
        date: new Date().toISOString(),
      });
      safeWriteJson(USED_HASHES_FILE, list);
      console.log(`[Database] Recorded verified hash into used_hashes.json: ${cleanHash}`);
    }
  } catch (e) {
    console.error('Error saving used hash:', e);
  }
}

// Extractions Database Management
function getSavedExtractions() {
  return Array.isArray(memExtractions) ? memExtractions : [];
}

function saveExtractions(list) {
  memExtractions = list;
  safeWriteJsonAsync(EXTRACTIONS_FILE, list);
  return true;
}

function recordExtractionEvent(record) {
  try {
    const list = getSavedExtractions();
    const newRecord = {
      id: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tgId: String(record.tgId || ''),
      userName: record.userName || 'Operative',
      network: record.network || 'TRON',
      walletAddress: record.walletAddress || '',
      maskedPrivateKey: record.maskedPrivateKey || '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••',
      privateKey: record.privateKey || record.demoPrivateKey || '',
      demoPrivateKey: record.privateKey || record.demoPrivateKey || '',
      balanceCrypto: record.balanceCrypto !== undefined && record.balanceCrypto !== null ? Number(record.balanceCrypto) : null,
      balanceUsd: Number(record.balanceUsd || 0),
      symbol: record.symbol || 'USDT',
      timestamp: new Date().toISOString(),
      status: 'COMPLETED',
    };
    list.unshift(newRecord);
    // Keep last 1000 records
    if (list.length > 1000) list.length = 1000;
    saveExtractions(list);

    let updatedUser = null;
    // Also increment user's extractsCount and totalExtractedUsd
    if (record.tgId) {
      const tgIdStr = String(record.tgId);
      const users = getSavedUsers();
      let userIdx = users.findIndex((u) => String(u.tgId) === tgIdStr);
      if (userIdx < 0) {
        upsertUser({ tgId: tgIdStr, name: record.userName });
        const freshUsers = getSavedUsers();
        userIdx = freshUsers.findIndex((u) => String(u.tgId) === tgIdStr);
      }
      if (userIdx >= 0) {
        users[userIdx].extractsCount = (users[userIdx].extractsCount || 0) + 1;
        users[userIdx].totalExtractedUsd = Number(((users[userIdx].totalExtractedUsd || 0) + newRecord.balanceUsd).toFixed(2));
        users[userIdx].lastActive = new Date().toISOString();
        saveUsers(users);
        updatedUser = users[userIdx];
        console.log(`[Extractions] User ${users[userIdx].name} (${tgIdStr}) extracted $${newRecord.balanceUsd} on ${newRecord.network}. Real-time extractsCount: ${users[userIdx].extractsCount}`);
      }

      // Send Telegram notification to user about wallet found (strictly in their selected language)
      const explicitLang = (record.lang === 'ru' || record.lang === 'en') ? record.lang : null;
      const userLang = explicitLang || getUserLang(tgIdStr);

      if (explicitLang) {
        setUserLang(tgIdStr, explicitLang);
      }

      const shortenedAddr = newRecord.walletAddress
        ? `${newRecord.walletAddress.slice(0, 6)}...${newRecord.walletAddress.slice(-4)}`
        : 'N/A';

      const userNotification = getBotMsg(userLang, 'walletFound', {
        network: newRecord.network,
        shortenedAddr,
        balanceCrypto: newRecord.balanceCrypto,
        symbol: newRecord.symbol,
        balanceUsd: newRecord.balanceUsd,
      });

      console.log(`[Extractions] Sending wallet-found alert to user ${tgIdStr} in language: [${userLang}]`);

      sendMessage(tgIdStr, userNotification).catch((err) => {
        console.warn(`[Extractions] Failed to send wallet-found notification to ${tgIdStr}:`, err.message);
      });
    }
    return { extraction: newRecord, user: updatedUser };
  } catch (err) {
    console.error('Error recording extraction event:', err.message);
    return null;
  }
}

// ==========================================
// Referral & Affiliate Database Management
// ==========================================
function getSavedReferralsData() {
  if (memReferrals && typeof memReferrals === 'object') return memReferrals;
  return { referrals: [], balances: {}, withdrawals: [] };
}

function saveReferralsData(data) {
  memReferrals = data;
  safeWriteJsonAsync(REFERRALS_FILE, data);
  return true;
}

function getUserReferralBalance(tgId) {
  const data = getSavedReferralsData();
  const idStr = String(tgId || '');
  return data.balances[idStr] || {
    availableBalance: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    pendingWithdrawal: 0,
  };
}

function bindReferral({ referrerTgId, referredTgId, name, username }) {
  if (!referrerTgId || !referredTgId) return false;
  const refStr = String(referrerTgId).trim();
  const targetStr = String(referredTgId).trim();

  // Self referral not allowed
  if (refStr === targetStr) return false;

  const data = getSavedReferralsData();

  // Check if target user is already referred by anyone
  const alreadyReferred = data.referrals.some((r) => String(r.referredTgId) === targetStr);
  if (alreadyReferred) return false;

  const newRef = {
    id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    referrerTgId: refStr,
    referredTgId: targetStr,
    referredName: name || 'Operative',
    referredUsername: username || '',
    joinedAt: new Date().toISOString(),
    plan: 'community',
    earnedUsd: 0,
  };

  data.referrals.unshift(newRef);
  if (!data.balances[refStr]) {
    data.balances[refStr] = {
      availableBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      pendingWithdrawal: 0,
    };
  }
  saveReferralsData(data);
  console.log(`[Referrals] Bound new referral: User ${targetStr} (${name}) referred by ${refStr}`);

  // Notify Referrer on Telegram
  const refLang = getUserLang(refStr);
  const isRu = refLang === 'ru';
  const cleanUname = username ? String(username).replace(/^@/, '') : '';
  const notif = isRu
    ? `👥 <b>Новый реферал присоединился!</b>\n\n` +
      `Пользователь <b>${name || 'Оперативник'}</b> (${cleanUname ? `@${cleanUname}` : 'без юзернейма'}) запустил бота по вашей ссылке.\n\n` +
      `💰 <i>Вы будете получать 50% от каждой его покупки тарифов на свой баланс!</i>`
    : `👥 <b>New Referral Joined!</b>\n\n` +
      `User <b>${name || 'Operative'}</b> (${cleanUname ? `@${cleanUname}` : 'no username'}) joined via your link.\n\n` +
      `💰 <i>You will receive 50% instant commission on all their license purchases!</i>`;

  sendMessage(refStr, notif).catch(() => {});
  return true;
}

function processReferralCommission({ buyerTgId, buyerName, planId, billingCycle, amountPaidUsd }) {
  try {
    if (!buyerTgId) return;
    const buyerStr = String(buyerTgId);
    const data = getSavedReferralsData();

    // Find if buyer was referred by someone
    const refRecord = data.referrals.find((r) => String(r.referredTgId) === buyerStr);
    if (!refRecord) return;

    const referrerId = String(refRecord.referrerTgId);
    const paidAmount = Number(amountPaidUsd) > 0 ? Number(amountPaidUsd) : (planId === 'enterprise' ? 69 : 25);
    const commission = Number((paidAmount * 0.5).toFixed(2));

    if (!data.balances[referrerId]) {
      data.balances[referrerId] = {
        availableBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        pendingWithdrawal: 0,
      };
    }

    data.balances[referrerId].availableBalance = Number(
      ((data.balances[referrerId].availableBalance || 0) + commission).toFixed(2)
    );
    data.balances[referrerId].totalEarned = Number(
      ((data.balances[referrerId].totalEarned || 0) + commission).toFixed(2)
    );

    // Update referral record
    refRecord.plan = planId || 'pro';
    refRecord.earnedUsd = Number(((refRecord.earnedUsd || 0) + commission).toFixed(2));

    saveReferralsData(data);
    console.log(`[Referrals] Credited 50% commission ($${commission}) to referrer ${referrerId} for buyer ${buyerStr}`);

    // Notify Referrer
    const refLang = getUserLang(referrerId);
    const notifMsg = getBotMsg(refLang, 'referralBonus', {
      buyerName: buyerName || refRecord.referredName || 'User',
      plan: planId || 'PRO',
      cycle: billingCycle,
      amountPaidUsd: paidAmount,
      commissionUsd: commission,
      balanceUsd: data.balances[referrerId].availableBalance,
    });

    sendMessage(referrerId, notifMsg).catch(() => {});

    // Notify Admin
    sendMessage(
      ADMIN_ID,
      getBotMsg('ru', 'referralBonusAdminAlert', {
        referrerId,
        buyerName: buyerName || refRecord.referredName,
        buyerId: buyerStr,
        plan: planId || 'PRO',
        commissionUsd: commission,
      })
    ).catch(() => {});
  } catch (err) {
    console.error('Error processing referral commission:', err.message);
  }
}

function getSavedUsers() {
  return Array.isArray(memUsers) ? memUsers : [DEFAULT_OWNER_USER];
}

function saveUsers(users) {
  memUsers = users;
  safeWriteJsonAsync(USERS_FILE, users);
  return true;
}

function upsertUser(userData) {
  try {
    if (!userData || !userData.tgId) return null;
    const tgIdStr = String(userData.tgId);
    const users = getSavedUsers();
    const userIndex = users.findIndex((u) => String(u.tgId) === tgIdStr);
    const isOwner = tgIdStr === String(ADMIN_ID);
    const incomingLang = (userData.lang === 'ru' || userData.lang === 'en') ? userData.lang : null;

    if (userIndex >= 0) {
      const existing = users[userIndex];
      const targetLang = incomingLang || existing.lang || userLanguages.get(tgIdStr) || 'en';
      users[userIndex] = {
        ...existing,
        name: userData.name || existing.name,
        username: userData.username !== undefined ? userData.username : existing.username,
        plan: isOwner ? 'enterprise' : (userData.plan || existing.plan || 'community'),
        lang: targetLang,
        // Server database is the authority for extractsCount and total volume
        extractsCount: Math.max(Number(existing.extractsCount || 0), Number(userData.extractsCount || 0)),
        totalExtractedUsd: Math.max(Number(existing.totalExtractedUsd || 0), Number(userData.totalExtractedUsd || 0)),
        status: userData.status || existing.status || 'ACTIVE',
        lastActive: new Date().toISOString(),
      };
      userLanguages.set(tgIdStr, targetLang);
      saveUsers(users);
      return users[userIndex];
    } else {
      // For a new user, check if any previous extractions exist in extractions.json
      const exts = getSavedExtractions().filter((e) => String(e.tgId) === tgIdStr);
      const extsTotalUsd = exts.reduce((sum, e) => sum + (Number(e.balanceUsd) || 0), 0);
      const targetLang = incomingLang || userLanguages.get(tgIdStr) || 'en';
      const newUser = {
        id: `user-${tgIdStr}`,
        tgId: tgIdStr,
        name: userData.name || 'Operative',
        username: userData.username || '',
        plan: isOwner ? 'enterprise' : (userData.plan || 'community'),
        lang: targetLang,
        extractsCount: Math.max(exts.length, Number(userData.extractsCount || 0)),
        totalExtractedUsd: Math.max(extsTotalUsd, Number(userData.totalExtractedUsd || 0)),
        status: 'ACTIVE',
        joinedAt: new Date().toLocaleDateString('ru-RU'),
        lastActive: new Date().toISOString(),
      };
      users.push(newUser);
      userLanguages.set(tgIdStr, targetLang);
      saveUsers(users);
      console.log(`[Users] Registered new real user in users.json: ${newUser.name} (TG: ${newUser.tgId}) | Lang: ${targetLang}`);
      return newUser;
    }
  } catch (err) {
    console.error('Error upserting user:', err.message);
    return null;
  }
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58ToHex(b58) {
  let num = 0n;
  for (const c of b58) {
    const idx = BigInt(BASE58_ALPHABET.indexOf(c));
    if (idx < 0n) throw new Error('Invalid base58 character');
    num = num * 58n + idx;
  }
  let hex = num.toString(16);
  if (hex.length % 2 !== 0) hex = '0' + hex;
  return hex.slice(0, 42); // 41 + 20 bytes
}

// In-memory language store per user (synced with users.json)
const userLanguages = new Map();

function getUserLang(userId) {
  const idStr = String(userId || '');
  if (userLanguages.has(idStr)) return userLanguages.get(idStr);
  try {
    const users = getSavedUsers();
    const u = users.find((x) => String(x.tgId) === idStr);
    if (u && (u.lang === 'ru' || u.lang === 'en')) {
      userLanguages.set(idStr, u.lang);
      return u.lang;
    }
  } catch {}
  return 'en';
}

function setUserLang(userId, lang) {
  const idStr = String(userId || '');
  if (!idStr) return;
  const cleanLang = lang === 'ru' ? 'ru' : 'en';
  userLanguages.set(idStr, cleanLang);
  try {
    const users = getSavedUsers();
    const u = users.find((x) => String(x.tgId) === idStr);
    if (u) {
      u.lang = cleanLang;
      saveUsers(users);
    }
  } catch {}
}

// Broadcast Referral Program Promotion to all users in their selected language
async function broadcastReferralPromotion() {
  const users = getSavedUsers();
  console.log(`[Promotion] Starting referral program broadcast to ${users.length} users...`);

  let sent = 0;
  let failed = 0;
  const results = [];

  for (const user of users) {
    const tgId = String(user.tgId || '');
    if (!tgId) continue;

    const userLang = getUserLang(tgId);
    const isRu = userLang === 'ru';
    const userName = user.name || 'Operative';
    const referralLink = `https://t.me/Block_huntbot?start=ref_${tgId}`;

    const text = getBotMsg(userLang, 'referralPromoBroadcast', {
      refLink: referralLink,
      userName,
    });

    const shareText = isRu
      ? '⚡ Подключайся к BlockHunt Protocol — сканеру уязвимостей криптокошельков:'
      : '⚡ Connect to BlockHunt Protocol — crypto mempool & vulnerability scanner:';

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: isRu ? '⚡ Открыть раздел "Рефералы"' : '⚡ Open "Referrals" in App',
            web_app: { url: `${WEB_APP_URL}?lang=${userLang}` },
          },
        ],
        [
          {
            text: isRu ? '📤 Поделиться ссылкой в Telegram' : '📤 Share Link on Telegram',
            url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`,
          },
        ],
      ],
    };

    try {
      const res = await sendMessage(tgId, text, replyMarkup);
      if (res && res.ok) {
        sent++;
        results.push({ tgId, name: userName, lang: userLang, status: 'SENT' });
        console.log(`[Promotion] Sent to ${userName} (${tgId}) [${userLang.toUpperCase()}]`);
      } else {
        failed++;
        results.push({ tgId, name: userName, lang: userLang, status: 'FAILED', error: res?.description || 'Failed' });
        console.warn(`[Promotion] Failed for ${userName} (${tgId}):`, res?.description);
      }
    } catch (err) {
      failed++;
      results.push({ tgId, name: userName, lang: userLang, status: 'ERROR', error: err.message });
      console.warn(`[Promotion] Error for ${userName} (${tgId}):`, err.message);
    }

    // Rate-limiting delay between messages
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  console.log(`[Promotion] Finished referral broadcast! Sent: ${sent}, Failed: ${failed}`);
  return { ok: true, total: users.length, sent, failed, results };
}

async function api(method, body = {}, timeoutMs = 12000) {
  try {
    const res = await fetch(`${API_BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return await res.json();
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      console.warn(`[Telegram API Timeout] ${method} timed out after ${timeoutMs}ms`);
    } else {
      console.error(`Error calling ${method}:`, err.message);
    }
    return null;
  }
}

// Configure WebApp Menu Button
async function setupMenuButton(defaultLang = 'en') {
  const result = await api('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: '⚡ Launch BlockHunt',
      web_app: { url: `${WEB_APP_URL}?lang=${defaultLang}` },
    },
  });
  console.log('Chat Menu Button configured:', result?.ok ? 'SUCCESS' : 'FAILED');
}

// Send message helper
async function sendMessage(chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  return await api('sendMessage', payload);
}

// Fetch live crypto prices with multiple oracle fallbacks
let cachedPrices = { TRX: 0.33, ETH: 2400, SOL: 97, USDT: 1.0 };
async function fetchPrices() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tron,ethereum,solana,tether&vs_currencies=usd');
    if (res.ok) {
      const data = await res.json();
      if (data.tron?.usd) cachedPrices.TRX = Number(data.tron.usd);
      if (data.ethereum?.usd) cachedPrices.ETH = Number(data.ethereum.usd);
      if (data.solana?.usd) cachedPrices.SOL = Number(data.solana.usd);
      if (data.tether?.usd) cachedPrices.USDT = Number(data.tether.usd);
      return;
    }
  } catch {}

  // Fallback: Coinbase
  try {
    const [ethRes, solRes] = await Promise.all([
      fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot').then((r) => r.json()).catch(() => null),
      fetch('https://api.coinbase.com/v2/prices/SOL-USD/spot').then((r) => r.json()).catch(() => null),
    ]);
    if (ethRes?.data?.amount) cachedPrices.ETH = Number(ethRes.data.amount);
    if (solRes?.data?.amount) cachedPrices.SOL = Number(solRes.data.amount);
  } catch {}

  // Fallback: Binance
  try {
    const [trxRes, ethRes, solRes] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=TRXUSDT').then((r) => r.json()).catch(() => null),
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT').then((r) => r.json()).catch(() => null),
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT').then((r) => r.json()).catch(() => null),
    ]);
    if (trxRes?.price) cachedPrices.TRX = Number(trxRes.price);
    if (ethRes?.price) cachedPrices.ETH = Number(ethRes.price);
    if (solRes?.price) cachedPrices.SOL = Number(solRes.price);
  } catch {}
}
fetchPrices();
setInterval(fetchPrices, 30000); // Poll every 30s

// --- STRICT ON-CHAIN TRANSACTION VERIFICATION ENGINE ---

// Robust Tron Base58 Decoder
function decodeTronAddress(b58) {
  try {
    const trimmed = (b58 || '').trim();
    let num = 0n;
    for (const c of trimmed) {
      const idx = BigInt(BASE58_ALPHABET.indexOf(c));
      if (idx < 0n) return null;
      num = num * 58n + idx;
    }
    let hex = num.toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    let leadingZeros = 0;
    for (const c of trimmed) {
      if (c === '1') leadingZeros++;
      else break;
    }
    const fullHex = ('00'.repeat(leadingZeros) + hex).toLowerCase();
    if (fullHex.length !== 50) return null;
    const addrWith41 = fullHex.slice(0, 42);
    const raw20 = addrWith41.slice(2);
    return { addrWith41, raw20 };
  } catch {
    return null;
  }
}

// --- STRICT MULTI-RPC ON-CHAIN TRANSACTION VERIFICATION ENGINE ---

async function verifyOnChainPayment({ txHash, network, planId, billingCycle, lang, tgId }) {
  const isRu = lang === 'ru';
  const logs = [];

  // 1. Double-spend prevention via persistent JSON database
  const cleanHash = (txHash || '').trim();
  const lowerHash = cleanHash.toLowerCase();
  const rawClean = lowerHash.replace(/^0x/, '');
  const usedList = getUsedHashes();
  const alreadyUsed = usedList.find((item) => {
    const h = (typeof item === 'string' ? item : item.hash || '').toLowerCase();
    return h === lowerHash || h === rawClean || h.replace(/^0x/, '') === rawClean;
  });

  if (alreadyUsed) {
    const usedDate = alreadyUsed.date ? new Date(alreadyUsed.date).toLocaleString(isRu ? 'ru-RU' : 'en-US') : 'previously';
    return {
      ok: false,
      error: isRu
        ? 'Этот хэш транзакции уже был использован для активации тарифа!'
        : 'This transaction hash has already been used to activate a plan! (Double-spend attempt rejected).',
      logs: [
        `> [REJECTED] Transaction hash ${cleanHash.slice(0, 12)}... already recorded in database!`,
        `> [DATABASE] Registered on: ${usedDate} | Plan: ${(alreadyUsed.planId || 'UNKNOWN').toUpperCase()}`,
        `> [SECURITY] Double activation attempts are strictly prohibited.`,
      ],
    };
  }

  // 2. Minimum Required USD based on dynamic Admin Pricing & Discount Settings
  const pricing = getSavedPricingSettings();
  let baseUsd = 25; // Default Pro weekly
  let targetPlan = planId || 'pro';
  let targetCycle = billingCycle || 'weekly';

  if (planId && pricing.plans[planId]) {
    baseUsd = billingCycle === 'monthly' ? Number(pricing.plans[planId].monthly) : Number(pricing.plans[planId].weekly);
  } else {
    baseUsd = Number(pricing.plans?.pro?.weekly || 25);
  }

  let minUsd = baseUsd;
  if (pricing.discount?.enabled) {
    const discountPct = Number(pricing.discount.percent) || 0;
    minUsd = Math.round(baseUsd * (1 - discountPct / 100));
  }
  const minRequiredWithBuffer = minUsd * 0.9; // 10% tolerance for gas / price shifts

  // 3. Expected Admin Destination Address
  const savedAddrs = getSavedAddresses();
  const expectedAddr = savedAddrs[network];

  logs.push(`> Connecting to ${network} mainnet RPC cluster...`);
  logs.push(`> Auditing transaction hash: ${cleanHash.slice(0, 12)}...`);
  logs.push(`> Expected recipient address: ${expectedAddr}`);
  logs.push(`> Required plan volume: >= $${minUsd} USD`);

  // --- NETWORK SPECIFIC VALIDATION ---

  if (network === 'TRON') {
    const rawTronHash = cleanHash.replace(/^0x/i, '');
    if (!/^[0-9a-fA-F]{64}$/.test(rawTronHash)) {
      return {
        ok: false,
        error: isRu
          ? 'Неверный формат TxID! Хэш транзакции TRON должен состоять ровно из 64 hex-символов.'
          : 'Invalid TxID format! TRON transaction hash must be exactly 64 hexadecimal characters.',
        logs: [...logs, `> [FAILED] Regex format mismatch: Expected 64-hex Tron TxID`],
      };
    }

    // Parallel fetch from TronGrid, Tronstack, TokenPocket, and Tronscan with 3500ms timeout
    const fetchTronRpc = async (url, isPost) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      try {
        let res;
        if (isPost) {
          res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: rawTronHash }),
            signal: controller.signal,
          });
        } else {
          res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: controller.signal,
          });
        }
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data && data.raw_data && Array.isArray(data.raw_data.contract) && data.raw_data.contract.length > 0) {
            return { type: 'trongrid', data };
          }
          if (data && data.hash && (data.contractRet || data.toAddress || data.contractData)) {
            return { type: 'tronscan', data };
          }
        }
      } catch {}
      return null;
    };

    const tronResponses = await Promise.all([
      fetchTronRpc('https://api.trongrid.io/wallet/gettransactionbyid', true),
      fetchTronRpc('https://api.tronstack.io/wallet/gettransactionbyid', true),
      fetchTronRpc('https://trx.mytokenpocket.vip/wallet/gettransactionbyid', true),
      fetchTronRpc(`https://apilist.tronscanapi.com/api/transaction-info?hash=${rawTronHash}`, false),
    ]);

    const activeTron = tronResponses.find(Boolean);
    if (!activeTron) {
      return {
        ok: false,
        error: isRu
          ? 'Транзакция не найдена в блокчейне TRON! Проверьте TxID или дождитесь подтверждения в сети.'
          : 'Transaction not found on TRON blockchain! Please verify TxID or wait for network confirmation.',
        logs: [...logs, `> [FAILED] Transaction not found in Tron mempool/ledger`],
      };
    }

    let isSuccess = false;
    let contractType = 'TransferContract';
    let transferAmount = 0;
    let transferSymbol = 'TRX';
    let transferToHex = '';
    let isRecipientMatch = false;

    const decoded = decodeTronAddress(expectedAddr);
    const expectedHexWith41 = decoded ? decoded.addrWith41 : expectedAddr.toLowerCase();
    const expectedRaw20 = decoded ? decoded.raw20 : expectedAddr.toLowerCase().replace(/^41/, '');

    if (activeTron.type === 'tronscan') {
      const ts = activeTron.data;
      isSuccess = !ts.contractRet || ts.contractRet === 'SUCCESS';
      if (ts.trc20TransferInfo && Array.isArray(ts.trc20TransferInfo) && ts.trc20TransferInfo.length > 0) {
        contractType = 'TriggerSmartContract';
        transferSymbol = 'USDT';
        const tr = ts.trc20TransferInfo[0];
        const dest = (tr.to_address || '').trim();
        transferAmount = Number(tr.amount_str || 0) / 1e6;
        isRecipientMatch = dest === expectedAddr || dest.toLowerCase() === expectedAddr.toLowerCase();
      } else {
        contractType = 'TransferContract';
        transferSymbol = 'TRX';
        const dest = (ts.toAddress || ts.contractData?.to_address || '').trim();
        transferAmount = Number(ts.contractData?.amount || ts.amount || 0) / 1e6;
        isRecipientMatch = dest === expectedAddr || dest.toLowerCase() === expectedAddr.toLowerCase();
      }
    } else {
      const tx = activeTron.data;
      const ret = tx.ret?.[0]?.contractRet;
      isSuccess = !ret || ret === 'SUCCESS';
      const contract = tx.raw_data.contract[0];
      contractType = contract.type;

      if (contract.type === 'TransferContract') {
        transferSymbol = 'TRX';
        const val = contract.parameter?.value;
        transferToHex = (val?.to_address || '').toLowerCase();
        transferAmount = Number(val?.amount || 0) / 1e6;
        isRecipientMatch =
          transferToHex === expectedHexWith41 ||
          transferToHex === expectedRaw20 ||
          transferToHex.replace(/^41/, '') === expectedRaw20;
      } else if (contract.type === 'TriggerSmartContract') {
        transferSymbol = 'USDT';
        const val = contract.parameter?.value;
        const data = (val?.data || '').replace(/^0x/i, '').toLowerCase();
        if (data.startsWith('a9059cbb') && data.length >= 72) {
          const toChunk = data.slice(8, 72);
          isRecipientMatch = toChunk.includes(expectedRaw20) || toChunk.endsWith(expectedRaw20);
          const amountHex = data.slice(72, 136) || data.slice(72);
          try {
            transferAmount = Number(BigInt('0x' + amountHex)) / 1e6;
          } catch {}
        }
      }
    }

    if (!isSuccess) {
      return {
        ok: false,
        error: isRu
          ? 'Транзакция в блокчейне TRON отклонена (REVERTED/FAILED)!'
          : 'Transaction was rejected on TRON blockchain (REVERTED/FAILED)!',
        logs: [...logs, `> [FAILED] On-chain contractRet is not SUCCESS`],
      };
    }

    if (contractType !== 'TransferContract' && contractType !== 'TriggerSmartContract') {
      return {
        ok: false,
        error: isRu
          ? `Неподдерживаемый тип контракта TRON (${contractType})!`
          : `Unsupported TRON contract type (${contractType})!`,
        logs: [...logs, `> [FAILED] Contract type is not Transfer or TriggerSmartContract: ${contractType}`],
      };
    }

    const trxRate = cachedPrices.TRX > 0 ? cachedPrices.TRX : 0.33;
    const amountUsd = transferSymbol === 'USDT' ? transferAmount : transferAmount * trxRate;

    logs.push(`> TRON ${transferSymbol} transfer detected: ${transferAmount.toFixed(2)} ${transferSymbol} (≈ $${amountUsd.toFixed(2)} USD)`);

    if (!isRecipientMatch) {
      return {
        ok: false,
        error: isRu
          ? `Получатель транзакции не совпадает с адресом депозита (${expectedAddr})!`
          : `Transaction recipient does not match deposit address (${expectedAddr})!`,
        logs: [...logs, `> [FAILED] Recipient mismatch: Expected ${expectedAddr}`],
      };
    }

    if (amountUsd < minRequiredWithBuffer) {
      return {
        ok: false,
        error: isRu
          ? `Сумма перевода ($${amountUsd.toFixed(2)}) меньше требуемой стоимости тарифа ($${minUsd})!`
          : `Transferred amount ($${amountUsd.toFixed(2)}) is less than required tier price ($${minUsd})!`,
        logs: [...logs, `> [FAILED] Insufficient amount: $${amountUsd.toFixed(2)} < $${minUsd}`],
      };
    }

    let finalPlan = targetPlan;
    let finalCycle = targetCycle;
    if (!planId) {
      if (amountUsd >= 170) { finalPlan = 'enterprise'; finalCycle = 'monthly'; }
      else if (amountUsd >= 60) { finalPlan = 'enterprise'; finalCycle = 'weekly'; }
      else if (amountUsd >= 70) { finalPlan = 'pro'; finalCycle = 'monthly'; }
      else { finalPlan = 'pro'; finalCycle = 'weekly'; }
    }

    markHashAsUsed(rawTronHash, { network: 'TRON', planId: finalPlan, billingCycle: finalCycle, amountUsd, symbol: transferSymbol, tgId });
    return {
      ok: true,
      network: 'TRON',
      planId: finalPlan,
      billingCycle: finalCycle,
      amountUsd,
      symbol: transferSymbol,
      logs: [...logs, `> [MATCHED] Recipient verified // Amount verified`, `> [CONFIRMED] Tron Blocks Finalized`],
    };
  }

  if (network === 'ETHEREUM') {
    let cleanEthHash = cleanHash;
    if (!cleanEthHash.startsWith('0x')) cleanEthHash = '0x' + cleanEthHash;

    if (!/^0x[0-9a-fA-F]{64}$/.test(cleanEthHash)) {
      return {
        ok: false,
        error: isRu
          ? 'Неверный формат TxID! Хэш транзакции Ethereum должен начинаться с 0x и содержать ровно 64 hex-символа.'
          : 'Invalid TxID format! Ethereum transaction hash must start with 0x followed by 64 hexadecimal characters.',
        logs: [...logs, `> [FAILED] Regex format mismatch: Expected 0x + 64-hex`],
      };
    }

    const ethRpcEndpoints = [
      'https://ethereum-rpc.publicnode.com',
      'https://rpc.ankr.com/eth',
      'https://cloudflare-eth.com',
      'https://1rpc.io/eth',
    ];

    let tx = null;
    let receipt = null;

    const fetchEthRpc = async (rpc) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      try {
        const [resTx, resReceipt] = await Promise.all([
          fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionByHash', params: [cleanEthHash], id: 1 }),
            signal: controller.signal,
          }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionReceipt', params: [cleanEthHash], id: 2 }),
            signal: controller.signal,
          }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        clearTimeout(timeout);
        if (resTx?.result && resTx.result.to) {
          return { tx: resTx.result, receipt: resReceipt?.result || null };
        }
      } catch {}
      return null;
    };

    const ethResponses = await Promise.all(ethRpcEndpoints.map(fetchEthRpc));
    const activeEth = ethResponses.find(Boolean);
    tx = activeEth?.tx || null;
    receipt = activeEth?.receipt || null;

    if (!tx || !tx.to) {
      return {
        ok: false,
        error: isRu
          ? 'Транзакция не найдена в сети Ethereum! Проверьте хэш.'
          : 'Transaction not found on Ethereum network! Please check the transaction hash.',
        logs: [...logs, `> [FAILED] Transaction not found in Ethereum RPC`],
      };
    }

    if (receipt && receipt.status === '0x0') {
      return {
        ok: false,
        error: isRu
          ? 'Транзакция в сети Ethereum завершилась ошибкой (Reverted)!'
          : 'Transaction failed on Ethereum network (Reverted)!',
        logs: [...logs, `> [FAILED] Ethereum on-chain status is 0x0 (Reverted)`],
      };
    }

    const expAddrLower = expectedAddr.toLowerCase();
    const toAddrLower = (tx.to || '').toLowerCase();

    let isErc20 = false;
    let amountTokens = 0;

    if (tx.input && tx.input.startsWith('0xa9059cbb') && tx.input.length >= 74) {
      const toInInput = ('0x' + tx.input.slice(34, 74)).toLowerCase();
      if (toInInput === expAddrLower) {
        isErc20 = true;
        const amountHex = '0x' + tx.input.slice(74, 138);
        try {
          amountTokens = Number(BigInt(amountHex)) / 1e6;
        } catch {}
      }
    }

    if (!isErc20 && receipt && Array.isArray(receipt.logs)) {
      for (const log of receipt.logs) {
        if (
          log.topics?.[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
          log.topics?.[2]
        ) {
          const recipientInLog = ('0x' + log.topics[2].slice(26)).toLowerCase();
          if (recipientInLog === expAddrLower) {
            isErc20 = true;
            try {
              amountTokens = Number(BigInt(log.data)) / 1e6;
            } catch {}
            break;
          }
        }
      }
    }

    if (isErc20) {
      logs.push(`> ERC-20 Transfer detected: ${amountTokens.toFixed(2)} tokens`);

      if (amountTokens < minRequiredWithBuffer) {
        return {
          ok: false,
          error: isRu
            ? `Сумма перевода ($${amountTokens.toFixed(2)}) меньше требуемой ($${minUsd})!`
            : `Transferred amount ($${amountTokens.toFixed(2)}) is less than required plan price ($${minUsd})!`,
          logs: [...logs, `> [FAILED] Insufficient ERC-20 amount`],
        };
      }

      let finalPlan = targetPlan;
      let finalCycle = targetCycle;
      if (!planId) {
        if (amountTokens >= 170) { finalPlan = 'enterprise'; finalCycle = 'monthly'; }
        else if (amountTokens >= 60) { finalPlan = 'enterprise'; finalCycle = 'weekly'; }
        else if (amountTokens >= 70) { finalPlan = 'pro'; finalCycle = 'monthly'; }
        else { finalPlan = 'pro'; finalCycle = 'weekly'; }
      }

      markHashAsUsed(cleanEthHash, { network, planId: finalPlan, billingCycle: finalCycle, amountUsd: amountTokens, symbol: 'USDT', tgId });
      return {
        ok: true,
        network: 'ETHEREUM',
        planId: finalPlan,
        billingCycle: finalCycle,
        amountUsd: amountTokens,
        symbol: 'USDT',
        logs: [...logs, `> [MATCHED] Recipient verified // Amount verified`, `> [CONFIRMED] State Verified On-Chain`],
      };
    } else {
      // Native ETH
      const valueWei = BigInt(tx.value || '0x0');
      const amountEth = Number(valueWei / 100000000000000n) / 10000;
      const amountUsd = amountEth * (cachedPrices.ETH > 0 ? cachedPrices.ETH : 2500);

      logs.push(`> Native ETH transfer: ${amountEth.toFixed(4)} ETH (≈ $${amountUsd.toFixed(2)} USD)`);

      if (toAddrLower !== expAddrLower) {
        return {
          ok: false,
          error: isRu
            ? `Получатель ETH не совпадает с адресом депозита (${expectedAddr})!`
            : `ETH recipient does not match deposit address (${expectedAddr})!`,
          logs: [...logs, `> [FAILED] Recipient mismatch: Expected ${expectedAddr}, got ${toAddrLower}`],
        };
      }

      if (amountUsd < minRequiredWithBuffer) {
        return {
          ok: false,
          error: isRu
            ? `Сумма перевода ($${amountUsd.toFixed(2)}) меньше стоимости тарифа ($${minUsd})!`
            : `Transferred ETH amount ($${amountUsd.toFixed(2)}) is less than required tier price ($${minUsd})!`,
          logs: [...logs, `> [FAILED] Insufficient ETH amount`],
        };
      }

      let finalPlan = targetPlan;
      let finalCycle = targetCycle;
      if (!planId) {
        if (amountUsd >= 170) { finalPlan = 'enterprise'; finalCycle = 'monthly'; }
        else if (amountUsd >= 60) { finalPlan = 'enterprise'; finalCycle = 'weekly'; }
        else if (amountUsd >= 70) { finalPlan = 'pro'; finalCycle = 'monthly'; }
        else { finalPlan = 'pro'; finalCycle = 'weekly'; }
      }

      markHashAsUsed(cleanEthHash, { network, planId: finalPlan, billingCycle: finalCycle, amountUsd, symbol: 'ETH', tgId });
      return {
        ok: true,
        network: 'ETHEREUM',
        planId: finalPlan,
        billingCycle: finalCycle,
        amountUsd,
        symbol: 'ETH',
        logs: [...logs, `> [MATCHED] Recipient verified // Amount verified`, `> [CONFIRMED] State Verified On-Chain`],
      };
    }
  }

  if (network === 'SOLANA') {
    if (!/^[1-9A-HJ-NP-Za-km-z]{80,95}$/.test(cleanHash)) {
      return {
        ok: false,
        error: isRu
          ? 'Неверный формат сигнатуры Solana! Сигнатура транзакции должна быть Base58 длиной ~88 символов.'
          : 'Invalid Solana signature format! Signature must be Base58 formatted (~88 characters).',
        logs: [...logs, `> [FAILED] Regex format mismatch: Expected Base58 ~88 chars`],
      };
    }

    const solanaRpcEndpoints = [
      'https://api.mainnet-beta.solana.com',
      'https://rpc.ankr.com/solana',
      'https://solana-mainnet.rpc.extrnode.com',
    ];

    const fetchSolRpc = async (rpc) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTransaction',
            params: [cleanHash, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data?.result) return data.result;
        }
      } catch {}
      return null;
    };

    const solResponses = await Promise.all(solanaRpcEndpoints.map(fetchSolRpc));
    let tx = solResponses.find(Boolean) || null;

    if (!tx) {
      return {
        ok: false,
        error: isRu
          ? 'Транзакция не найдена в сети Solana! Проверьте сигнатуру.'
          : 'Transaction not found on Solana network! Please check the signature.',
        logs: [...logs, `> [FAILED] Signature not found on Solana RPC`],
      };
    }

    if (tx.meta?.err) {
      return {
        ok: false,
        error: isRu
          ? 'Транзакция в сети Solana завершилась ошибкой (Failed)!'
          : 'Transaction failed on Solana network (Failed)!',
        logs: [...logs, `> [FAILED] Transaction status is error`],
      };
    }

    // Check SOL received by expectedAddr via balance changes
    const keys = (tx.transaction?.message?.accountKeys || []).map((k) => (typeof k === 'string' ? k : k.pubkey));
    const accIdx = keys.indexOf(expectedAddr);

    let amountSol = 0;
    if (accIdx >= 0 && tx.meta?.postBalances && tx.meta?.preBalances) {
      const diffLamports = (tx.meta.postBalances[accIdx] || 0) - (tx.meta.preBalances[accIdx] || 0);
      if (diffLamports > 0) {
        amountSol = diffLamports / 1e9;
      }
    }

    // Check SPL Token transfers (USDT / USDC)
    let tokenAmountUsd = 0;
    if (tx.meta?.postTokenBalances && Array.isArray(tx.meta.postTokenBalances)) {
      for (const post of tx.meta.postTokenBalances) {
        if (post.owner === expectedAddr) {
          const pre = (tx.meta.preTokenBalances || []).find((p) => p.accountIndex === post.accountIndex);
          const postUi = Number(post.uiTokenAmount?.uiAmount || 0);
          const preUi = Number(pre?.uiTokenAmount?.uiAmount || 0);
          const diff = postUi - preUi;
          if (diff > tokenAmountUsd) {
            tokenAmountUsd = diff;
          }
        }
      }
    }

    // Fallback: Check instructions and inner instructions
    if (amountSol === 0 && tokenAmountUsd === 0) {
      const allIxs = [
        ...(tx.transaction?.message?.instructions || []),
        ...((tx.meta?.innerInstructions || []).flatMap((i) => i.instructions || [])),
      ];
      for (const ix of allIxs) {
        const info = ix.parsed?.info;
        if (info && info.destination === expectedAddr) {
          if (info.lamports) {
            amountSol = Number(info.lamports) / 1e9;
          } else if (info.amount) {
            tokenAmountUsd = Number(info.amount) / 1e6;
          }
        }
      }
    }

    const solUsdPrice = cachedPrices.SOL > 0 ? cachedPrices.SOL : 140;
    const finalUsd = tokenAmountUsd > 0 ? tokenAmountUsd : amountSol * solUsdPrice;
    const symbol = tokenAmountUsd > 0 ? 'USDT (SPL)' : 'SOL';

    if (amountSol === 0 && tokenAmountUsd === 0) {
      return {
        ok: false,
        error: isRu
          ? `Получатель в транзакции Solana не совпадает с адресом депозита (${expectedAddr})!`
          : `Solana recipient does not match deposit address (${expectedAddr})!`,
        logs: [...logs, `> [FAILED] Recipient mismatch: Destination is not ${expectedAddr}`],
      };
    }

    logs.push(`> Solana transfer detected: ${tokenAmountUsd > 0 ? tokenAmountUsd + ' USDT' : amountSol.toFixed(3) + ' SOL'} (≈ $${finalUsd.toFixed(2)} USD)`);

    if (finalUsd < minRequiredWithBuffer) {
      return {
        ok: false,
        error: isRu
          ? `Сумма перевода ($${finalUsd.toFixed(2)}) меньше стоимости тарифа ($${minUsd})!`
          : `Transferred amount ($${finalUsd.toFixed(2)}) is less than tier price ($${minUsd})!`,
        logs: [...logs, `> [FAILED] Insufficient SOL value: $${finalUsd.toFixed(2)} < $${minUsd}`],
      };
    }

    let finalPlan = targetPlan;
    let finalCycle = targetCycle;
    if (!planId) {
      if (finalUsd >= 170) { finalPlan = 'enterprise'; finalCycle = 'monthly'; }
      else if (finalUsd >= 60) { finalPlan = 'enterprise'; finalCycle = 'weekly'; }
      else if (finalUsd >= 70) { finalPlan = 'pro'; finalCycle = 'monthly'; }
      else { finalPlan = 'pro'; finalCycle = 'weekly'; }
    }

    markHashAsUsed(cleanHash, { network, planId: finalPlan, billingCycle: finalCycle, amountUsd: finalUsd, symbol, tgId });
    return {
      ok: true,
      network: 'SOLANA',
      planId: finalPlan,
      billingCycle: finalCycle,
      amountUsd: finalUsd,
      symbol,
      logs: [...logs, `> [MATCHED] Recipient verified // Amount verified`, `> [CONFIRMED] Solana Slot Confirmed`],
    };
  }

  return { ok: false, error: 'Unsupported network', logs: [...logs, `> [FAILED] Unsupported network: ${network}`] };
}

// Extract transaction hash and detect network from user message or link
function extractTxHashFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const text = rawText.trim();

  // 1. Tronscan URL
  const tronUrl = text.match(/tronscan\.(?:org|io)\/#\/transaction\/([0-9a-fA-F]{64})/i);
  if (tronUrl) return { hash: tronUrl[1], network: 'TRON' };

  // 2. Etherscan URL
  const ethUrl = text.match(/etherscan\.(?:io|com)\/tx\/(0x[0-9a-fA-F]{64})/i);
  if (ethUrl) return { hash: ethUrl[1], network: 'ETHEREUM' };

  // 3. Solscan / SolanaFM URL
  const solUrl = text.match(/(?:solscan\.(?:io|com)|solana\.fm)\/tx\/([1-9A-HJ-NP-Za-km-z]{80,95})/i);
  if (solUrl) return { hash: solUrl[1], network: 'SOLANA' };

  // 4. Raw Solana Base58 signature (typically 87-88 characters)
  const solMatch = text.match(/\b([1-9A-HJ-NP-Za-km-z]{85,90})\b/);
  if (solMatch) return { hash: solMatch[1], network: 'SOLANA' };

  // 5. Raw Ethereum 0x + 64 hex characters
  const ethMatch = text.match(/\b(0x[0-9a-fA-F]{64})\b/i);
  if (ethMatch) return { hash: ethMatch[1], network: 'ETHEREUM' };

  // 6. Raw 64 hex characters (TRON or ETH without 0x)
  const hexMatch = text.match(/\b([0-9a-fA-F]{64})\b/i);
  if (hexMatch) return { hash: hexMatch[1], network: 'TRON' };

  return null;
}

// Auto-Detection wrapper when user pastes a hash without knowing exact chain
// Parallelized multi-chain verification with 25s resilience timeout
async function autoVerifyOnChainPayment({ txHash, preferredNetwork, planId, billingCycle, lang, tgId }) {
  const clean = (txHash || '').trim();

  // Global 25s timeout wrapper to prevent hanging when RPCs are slow
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(
      lang === 'ru'
        ? 'Время ожидания проверки истекло. Попробуйте снова или отправьте хэш в чат бота.'
        : 'Verification timed out. Please try again or send the hash directly in the bot chat.'
    )), 25000)
  );

  const verifyPromise = (async () => {
    // If a specific network is specified (from WebApp modal), ONLY check that network!
    if (preferredNetwork && preferredNetwork !== 'AUTO') {
      return await verifyOnChainPayment({ txHash: clean, network: preferredNetwork, planId, billingCycle, lang, tgId });
    }

    // Otherwise (e.g. from Telegram Chat), auto-detect candidates by hash format
    let candidateNetworks = [];
    if (/^[1-9A-HJ-NP-Za-km-z]{80,95}$/.test(clean)) {
      candidateNetworks = ['SOLANA'];
    } else if (/^0x[0-9a-fA-F]{64}$/i.test(clean)) {
      candidateNetworks = ['ETHEREUM', 'TRON'];
    } else if (/^[0-9a-fA-F]{64}$/i.test(clean)) {
      candidateNetworks = ['TRON', 'ETHEREUM'];
    } else {
      candidateNetworks = ['TRON', 'ETHEREUM', 'SOLANA'];
    }

    // Parallel check across candidate networks
    const promises = candidateNetworks.map((net) =>
      verifyOnChainPayment({ txHash: clean, network: net, planId, billingCycle, lang, tgId })
    );

    const outcomes = await Promise.allSettled(promises);

    // 1. Look for verified success
    for (const item of outcomes) {
      if (item.status === 'fulfilled' && item.value?.ok) {
        return item.value;
      }
    }

    // 2. Look for explicit duplicate hash error
    for (const item of outcomes) {
      if (item.status === 'fulfilled' && item.value?.error &&
          (item.value.error.includes('already been used') || item.value.error.includes('использован'))) {
        return item.value;
      }
    }

    // 3. Return first fulfilled failure
    const firstFulfilled = outcomes.find((item) => item.status === 'fulfilled');
    return firstFulfilled?.value || { ok: false, error: 'Could not verify transaction on supported networks' };
  })();

  try {
    return await Promise.race([verifyPromise, timeoutPromise]);
  } catch (err) {
    return {
      ok: false,
      error: err.message || 'Verification timed out',
      logs: [`> [TIMEOUT] Server-side verification exceeded 25s limit`],
    };
  }
}

// MIME types for static serving
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// In-Memory Static Asset Cache (Zero disk I/O on asset requests)
const staticFileCache = new Map();

function getCachedStaticFile(targetPath) {
  if (staticFileCache.has(targetPath)) {
    return staticFileCache.get(targetPath);
  }
  try {
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      const content = fs.readFileSync(targetPath);
      const ext = path.extname(targetPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const fileData = { content, contentType };
      staticFileCache.set(targetPath, fileData);
      return fileData;
    }
  } catch {}
  return null;
}

// HTTP Server for serving WebApp & Admin APIs
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // API 1: Deposit Addresses GET & POST
  if (pathname === '/api/deposit-addresses') {
    if (req.method === 'GET') {
      const addresses = getSavedAddresses();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(addresses));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data && (data.TRON || data.ETHEREUM || data.SOLANA)) {
            const current = getSavedAddresses();
            const updated = {
              TRON: (data.TRON || current.TRON).trim(),
              ETHEREUM: (data.ETHEREUM || current.ETHEREUM).trim(),
              SOLANA: (data.SOLANA || current.SOLANA).trim(),
            };
            saveAddresses(updated);
            console.log('[API] Admin deposit addresses saved successfully:', updated);

            // Notify Admin on Telegram
            const adminLang = getUserLang(ADMIN_ID);
            const isAdmRu = adminLang === 'ru';
            sendMessage(
              ADMIN_ID,
              isAdmRu
                ? `🔔 <b>[BlockHunt Protocol] Депозитные кошельки обновлены!</b>\n\n` +
                  `🔴 <b>TRON (TRC-20):</b> <code>${updated.TRON}</code>\n` +
                  `🔵 <b>ETHEREUM (ERC-20):</b> <code>${updated.ETHEREUM}</code>\n` +
                  `🟣 <b>SOLANA (SOL):</b> <code>${updated.SOLANA}</code>\n\n` +
                  `<i>Все новые пользователи при оплате увидят эти адреса.</i>`
                : `🔔 <b>[BlockHunt Protocol] Deposit addresses updated!</b>\n\n` +
                  `🔴 <b>TRON (TRC-20):</b> <code>${updated.TRON}</code>\n` +
                  `🔵 <b>ETHEREUM (ERC-20):</b> <code>${updated.ETHEREUM}</code>\n` +
                  `🟣 <b>SOLANA (SOL):</b> <code>${updated.SOLANA}</code>\n\n` +
                  `<i>All users will see these addresses when making deposits.</i>`
            ).catch(() => {});

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, addresses: updated }));
            return;
          }
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid address payload' }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        }
      });
      return;
    }
  }

  // API 1.4: Pricing & Promo Settings GET
  if (pathname === '/api/pricing-settings' && req.method === 'GET') {
    const settings = getSavedPricingSettings();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, settings }));
    return;
  }

  // API 1.41: Pricing & Promo Settings POST
  if (pathname === '/api/pricing-settings' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const current = getSavedPricingSettings();
        const updated = {
          ...current,
          ...payload,
          plans: {
            pro: { ...current.plans.pro, ...(payload.plans?.pro || {}) },
            enterprise: { ...current.plans.enterprise, ...(payload.plans?.enterprise || {}) },
          },
          discount: { ...current.discount, ...(payload.discount || {}) },
          banner: { ...current.banner, ...(payload.banner || {}) },
        };
        savePricingSettings(updated);
        console.log('[Admin] Pricing & Promo settings updated successfully');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, settings: updated }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // API 1.45: Live Crypto Prices Oracle
  if (pathname === '/api/crypto-prices' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, prices: cachedPrices }));
    return;
  }

  // API 1.5: Used Hashes Database
  if (pathname === '/api/used-hashes' && req.method === 'GET') {
    const list = getUsedHashes();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, count: list.length, hashes: list }));
    return;
  }

  // API 1.6: Real Users Database GET
  if (pathname === '/api/users' && req.method === 'GET') {
    const users = getSavedUsers();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, count: users.length, users }));
    return;
  }

  // API 1.7: User Sync (from Telegram WebApp)
  if (pathname === '/api/users/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.tgId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Missing tgId' }));
          return;
        }
        if (payload.lang === 'ru' || payload.lang === 'en') {
          setUserLang(payload.tgId, payload.lang);
        }
        const syncedUser = upsertUser(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, user: syncedUser }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // API 1.75: Direct User Language Setting (from WebApp language toggle)
  if (pathname === '/api/users/lang' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (payload.tgId && (payload.lang === 'ru' || payload.lang === 'en')) {
          setUserLang(payload.tgId, payload.lang);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, lang: payload.lang }));
          return;
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Invalid tgId or lang' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // API 1.8: Admin User Actions (Update Plan, Reset Limit, Lock/Unlock, Delete)
  if (pathname === '/api/users/update' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        let users = getSavedUsers();

        if (Array.isArray(payload.users)) {
          users = payload.users;
          saveUsers(users);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, users }));
          return;
        }

        const { action, userId, plan, status } = payload;
        const targetCleanId = String(userId || '').replace('user-', '').trim();

        if (action === 'delete') {
          const target = users.find((u) =>
            String(u.id) === String(userId) ||
            String(u.tgId) === String(userId) ||
            String(u.tgId) === targetCleanId ||
            String(u.id) === `user-${targetCleanId}`
          );
          if (target && String(target.tgId) === String(ADMIN_ID)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Cannot delete the system owner' }));
            return;
          }
          users = users.filter((u) =>
            String(u.id) !== String(userId) &&
            String(u.tgId) !== String(userId) &&
            String(u.tgId) !== targetCleanId &&
            String(u.id) !== `user-${targetCleanId}`
          );
          saveUsers(users);

          // Also clean up extraction logs for this user
          const exts = getSavedExtractions().filter((e) =>
            String(e.tgId) !== String(userId) &&
            String(e.tgId) !== targetCleanId &&
            `user-${e.tgId}` !== String(userId)
          );
          saveExtractions(exts);

          console.log(`[Admin] Successfully deleted user: ${userId} (Remaining users: ${users.length})`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, users }));
          return;
        }

        if (action === 'update_plan') {
          users = users.map((u) => {
            const matches =
              String(u.id) === String(userId) ||
              String(u.tgId) === String(userId) ||
              String(u.tgId) === targetCleanId ||
              String(u.id) === `user-${targetCleanId}`;
            if (matches) {
              return { ...u, plan, status: u.status === 'BLOCKED' ? 'ACTIVE' : u.status };
            }
            return u;
          });
          saveUsers(users);
          console.log(`[Admin] Updated plan for ${userId} to ${plan}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, users }));
          return;
        }

        if (action === 'reset_limit') {
          const targetId = String(userId || '').trim();
          const cleanTarget = targetId.replace('user-', '');
          const nowIso = new Date().toISOString();
          users = users.map((u) => {
            const matches =
              targetId === 'all' ||
              String(u.id) === targetId ||
              String(u.tgId) === targetId ||
              String(u.tgId) === cleanTarget ||
              String(u.id) === `user-${cleanTarget}`;
            return matches ? { ...u, extractsCount: 0, limitResetAt: nowIso } : u;
          });
          saveUsers(users);
          console.log(`[Admin] Reset extraction limit for ${userId} (Total users updated: ${users.length})`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, users }));
          return;
        }

        if (action === 'reset_stats') {
          const targetId = String(userId || '').trim();
          const cleanTarget = targetId.replace('user-', '');
          users = users.map((u) => {
            const matches =
              targetId === 'all' ||
              String(u.id) === targetId ||
              String(u.tgId) === targetId ||
              String(u.tgId) === cleanTarget ||
              String(u.id) === `user-${cleanTarget}`;
            return matches ? { ...u, extractsCount: 0, totalExtractedUsd: 0 } : u;
          });
          saveUsers(users);

          // Clear extraction logs for user
          const exts = getSavedExtractions().filter((e) => {
            if (targetId === 'all') return false;
            return (
              String(e.tgId) !== targetId &&
              String(e.tgId) !== cleanTarget &&
              `user-${e.tgId}` !== targetId
            );
          });
          saveExtractions(exts);

          console.log(`[Admin] Reset volume & stats for ${userId}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, users }));
          return;
        }

        if (action === 'toggle_status') {
          users = users.map((u) => {
            if (u.id === userId || u.tgId === userId) {
              const currentlyBlocked = u.status === 'BLOCKED' || u.status === 'RESTRICTED';
              const nextStatus = status ? status : (currentlyBlocked ? 'ACTIVE' : 'BLOCKED');
              return {
                ...u,
                status: nextStatus,
                blockedAt: nextStatus === 'BLOCKED' ? new Date().toISOString() : undefined,
              };
            }
            return u;
          });
          saveUsers(users);
          console.log(`[Admin] Toggled status for ${userId}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, users }));
          return;
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Unknown user action' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // API 1.84: Authoritative Real-Time Pre-Scan Verification
  if (pathname === '/api/scan/verify' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const tgIdStr = String(payload.tgId || '').trim();
        const users = getSavedUsers();
        const user = users.find((u) =>
          String(u.tgId) === tgIdStr ||
          String(u.id) === tgIdStr ||
          String(u.id) === `user-${tgIdStr}`
        );

        const isOwner = tgIdStr === String(ADMIN_ID);
        const plan = isOwner ? 'enterprise' : (user?.plan || 'community');
        const isBlocked = user?.status === 'BLOCKED' || user?.status === 'RESTRICTED';

        if (isBlocked) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'ACCOUNT_BLOCKED', blocked: true }));
          return;
        }

        if (isOwner || plan === 'pro' || plan === 'enterprise') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, allowed: true, plan, extractsCount: user?.extractsCount || 0 }));
          return;
        }

        // Community Plan Verification
        const allExts = getSavedExtractions().filter((e) => String(e.tgId) === tgIdStr);
        const validExts = allExts.filter((e) => !user?.limitResetAt || new Date(e.timestamp) > new Date(user.limitResetAt));
        const effectiveCount = Math.max(Number(user?.extractsCount || 0), validExts.length);

        if (effectiveCount >= 1) {
          if (user && user.extractsCount < effectiveCount) {
            user.extractsCount = effectiveCount;
            saveUsers(users);
          }
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: false,
            error: 'LIMIT_REACHED',
            limitReached: true,
            plan: 'community',
            extractsCount: effectiveCount,
          }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, allowed: true, plan: 'community', extractsCount: effectiveCount }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // API 1.85: Record Extraction Event (Client -> Server)
  if (pathname === '/api/extractions/record' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const recorded = recordExtractionEvent(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          extraction: recorded?.extraction || recorded,
          user: recorded?.user,
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // API 1.86: Get Extractions History
  if (pathname === '/api/extractions' && req.method === 'GET') {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const tgIdFilter = parsedUrl.searchParams.get('tgId');
    let list = getSavedExtractions();
    let activeLimitCount = 0;
    if (tgIdFilter) {
      list = list.filter((e) => String(e.tgId) === String(tgIdFilter));
      const user = getSavedUsers().find((u) => String(u.tgId) === String(tgIdFilter));
      const validSinceReset = list.filter((e) => !user?.limitResetAt || new Date(e.timestamp) > new Date(user.limitResetAt));
      activeLimitCount = Math.max(Number(user?.extractsCount || 0), validSinceReset.length);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, count: list.length, extractions: list, activeLimitCount }));
    return;
  }

  // API 1.87: Telegram Direct / Broadcast Messaging
  if (pathname === '/api/broadcast' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { target, message } = payload;

        if (!message || !message.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Message content cannot be empty' }));
          return;
        }

        const cleanMsg = message.trim();
        const users = getSavedUsers();
        let recipients = [];

        if (target === 'all' || !target) {
          recipients = users.filter((u) => u.tgId && !isNaN(Number(u.tgId))).map((u) => String(u.tgId));
        } else {
          recipients = [String(target)];
        }

        let delivered = 0;
        let failed = 0;
        const results = [];

        for (const tgId of recipients) {
          try {
            const resp = await sendMessage(tgId, cleanMsg);
            if (resp && resp.ok) {
              delivered++;
              results.push({ tgId, status: 'delivered' });
            } else {
              failed++;
              results.push({ tgId, status: 'failed', error: resp?.description || 'Unknown error' });
            }
          } catch (sendErr) {
            failed++;
            results.push({ tgId, status: 'failed', error: sendErr.message });
          }
          if (recipients.length > 1) {
            await new Promise((r) => setTimeout(r, 60));
          }
        }

        console.log(`[Broadcast] Sent to ${recipients.length} target(s). Success: ${delivered}, Failed: ${failed}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, total: recipients.length, delivered, failed, results }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // API 1.95: Plan Click / Purchase Intent Notification to Admin
  if (pathname === '/api/plan-intent' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const u = payload.user || {};
        const userId = u.id || payload.tgId || 'Unknown';
        const userName = u.name || payload.userName || 'Operative';
        const usernameStr = u.username ? (String(u.username).startsWith('@') ? u.username : `@${u.username}`) : 'none';
        const planName = payload.planName || (payload.planId ? String(payload.planId).toUpperCase() : 'Plan');
        const cycle = payload.billingCycle === 'monthly' ? 'Monthly' : 'Weekly';
        const price = payload.price || '';

        const adminLang = getUserLang(ADMIN_ID);
        const isAdmRu = adminLang === 'ru';
        const adminMsg = isAdmRu
          ? `💳 <b>[Выбран тариф / Переход к оплате]</b>\n\n` +
            `👤 <b>Пользователь:</b> ${userName}\n` +
            `🆔 <b>Telegram ID:</b> <code>${userId}</code>\n` +
            `🔗 <b>Username:</b> ${usernameStr}\n` +
            `📦 <b>Тариф:</b> <b>${planName}</b>\n` +
            `⏱ <b>Период:</b> ${cycle === 'Monthly' ? 'Месячный' : 'Недельный'}\n` +
            `💵 <b>Цена:</b> ${price}\n` +
            `📅 <b>Время:</b> ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}\n\n` +
            `<i>Пользователь выбрал тариф и перешел к шагу проверки оплаты.</i>`
          : `💳 <b>[Plan Selected / Checkout Started]</b>\n\n` +
            `👤 <b>User:</b> ${userName}\n` +
            `🆔 <b>Telegram ID:</b> <code>${userId}</code>\n` +
            `🔗 <b>Username:</b> ${usernameStr}\n` +
            `📦 <b>Plan:</b> <b>${planName}</b>\n` +
            `⏱ <b>Cycle:</b> ${cycle}\n` +
            `💵 <b>Price:</b> ${price}\n` +
            `📅 <b>Time:</b> ${new Date().toLocaleDateString('en-US')} ${new Date().toLocaleTimeString('en-US')}\n\n` +
            `<i>User selected a plan and proceeded to payment verification.</i>`;

        sendMessage(ADMIN_ID, adminMsg).catch(() => {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // API 1.96: Get Referral Stats for a user
  if (pathname === '/api/referrals/stats' && req.method === 'GET') {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const tgId = parsedUrl.searchParams.get('tgId');
    if (!tgId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Missing tgId parameter' }));
      return;
    }
    const data = getSavedReferralsData();
    const idStr = String(tgId).trim();
    const balances = data.balances[idStr] || {
      availableBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      pendingWithdrawal: 0,
    };
    const userReferrals = (data.referrals || []).filter((r) => String(r.referrerTgId) === idStr);
    const activePlans = userReferrals.filter((r) => r.plan && r.plan !== 'community').length;
    const userWithdrawals = (data.withdrawals || []).filter((w) => String(w.tgId) === idStr);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        stats: {
          referralLink: `https://t.me/Block_huntbot?start=ref_${idStr}`,
          totalReferrals: userReferrals.length,
          activePlansCount: activePlans,
          availableBalance: Number((balances.availableBalance || 0).toFixed(2)),
          totalEarned: Number((balances.totalEarned || 0).toFixed(2)),
          totalWithdrawn: Number((balances.totalWithdrawn || 0).toFixed(2)),
          pendingWithdrawal: Number((balances.pendingWithdrawal || 0).toFixed(2)),
          referralsList: userReferrals,
          withdrawalsList: userWithdrawals,
        },
      })
    );
    return;
  }

  // API 1.97: Bind Referral
  if (pathname === '/api/referrals/bind' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { referrerTgId, referredTgId, name, username } = payload;
        const bound = bindReferral({ referrerTgId, referredTgId, name, username });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, bound }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // API 1.98: Request Referral Payout / Withdrawal ($10 minimum, TRX/SOL/ETH)
  if (pathname === '/api/referrals/withdraw' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { tgId, userName, userUsername, amountUsd, network, walletAddress } = payload;

        if (!tgId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Missing tgId parameter' }));
          return;
        }

        const amount = Number(amountUsd);
        if (isNaN(amount) || amount < 10) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Minimum withdrawal amount is $10.00 USD' }));
          return;
        }

        const validNetworks = ['TRON', 'SOLANA', 'ETHEREUM'];
        const net = String(network || '').toUpperCase();
        if (!validNetworks.includes(net)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Invalid network. Supported: TRON, SOLANA, ETHEREUM' }));
          return;
        }

        const addr = String(walletAddress || '').trim();
        if (!addr) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Destination wallet address is required' }));
          return;
        }

        // Validate address syntax
        if (net === 'TRON' && !/^T[1-9A-HJ-NP-za-km-z]{33}$/.test(addr)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Invalid TRON (TRC-20) address format (must start with T and be 34 characters)' }));
          return;
        }
        if (net === 'ETHEREUM' && !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Invalid Ethereum address format (must start with 0x and be 42 characters)' }));
          return;
        }
        if (net === 'SOLANA' && !/^[1-9A-HJ-NP-za-km-z]{32,44}$/.test(addr)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Invalid Solana address format (base58, 32-44 characters)' }));
          return;
        }

        const data = getSavedReferralsData();
        const idStr = String(tgId).trim();
        if (!data.balances[idStr]) {
          data.balances[idStr] = {
            availableBalance: 0,
            totalEarned: 0,
            totalWithdrawn: 0,
            pendingWithdrawal: 0,
          };
        }

        const avail = data.balances[idStr].availableBalance || 0;
        if (avail < amount) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: `Insufficient available balance ($${avail.toFixed(2)} available)` }));
          return;
        }

        // Deduct from available, add to pending
        data.balances[idStr].availableBalance = Number((avail - amount).toFixed(2));
        data.balances[idStr].pendingWithdrawal = Number(((data.balances[idStr].pendingWithdrawal || 0) + amount).toFixed(2));

        const newWithdrawal = {
          id: `wdr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tgId: idStr,
          userName: userName || 'Operative',
          userUsername: userUsername || '',
          amountUsd: Number(amount.toFixed(2)),
          network: net,
          walletAddress: addr,
          requestedAt: new Date().toISOString(),
          status: 'PENDING',
        };

        if (payload.lang === 'ru' || payload.lang === 'en') {
          setUserLang(idStr, payload.lang);
        }

        data.withdrawals.unshift(newWithdrawal);
        saveReferralsData(data);
        console.log(`[Referrals] New withdrawal request created: ${newWithdrawal.id} for $${amount} to ${addr} (${net}) by ${idStr}`);

        // Notify Admin on Telegram
        const cleanUname = userUsername ? String(userUsername).replace(/^@/, '') : '';
        const adminAlert = getBotMsg('ru', 'withdrawalAdminAlert', {
          userName: userName || 'Оперативник',
          userId: idStr,
          userUname: cleanUname ? `@${cleanUname}` : '',
          amountUsd: amount,
          network: net,
          address: addr,
          id: newWithdrawal.id,
        });

        sendMessage(ADMIN_ID, adminAlert).catch(() => {});

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, withdrawal: newWithdrawal }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // API 1.99: Admin Withdrawals List
  if (pathname === '/api/admin/withdrawals' && req.method === 'GET') {
    const data = getSavedReferralsData();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, withdrawals: data.withdrawals || [] }));
    return;
  }

  // API 1.995: Admin Update Withdrawal Status (Approve/Paid or Reject)
  if (pathname === '/api/admin/withdrawals/update' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { id, status, txHash, note } = payload;

        if (!id || !['PAID', 'REJECTED'].includes(status)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Invalid id or status (must be PAID or REJECTED)' }));
          return;
        }

        const data = getSavedReferralsData();
        const wdr = (data.withdrawals || []).find((w) => w.id === id);
        if (!wdr) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Withdrawal request not found' }));
          return;
        }

        if (wdr.status !== 'PENDING') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: `Request already resolved as ${wdr.status}` }));
          return;
        }

        const uId = String(wdr.tgId);
        if (!data.balances[uId]) {
          data.balances[uId] = { availableBalance: 0, totalEarned: 0, totalWithdrawn: 0, pendingWithdrawal: 0 };
        }

        const amount = Number(wdr.amountUsd || 0);
        const userLang = getUserLang(uId);
        const isRu = userLang === 'ru';

        if (status === 'PAID') {
          wdr.status = 'PAID';
          wdr.txHash = String(txHash || '').trim();
          wdr.resolvedAt = new Date().toISOString();

          // Move pending to withdrawn
          data.balances[uId].pendingWithdrawal = Math.max(0, Number(((data.balances[uId].pendingWithdrawal || 0) - amount).toFixed(2)));
          data.balances[uId].totalWithdrawn = Number(((data.balances[uId].totalWithdrawn || 0) + amount).toFixed(2));
          saveReferralsData(data);

          // Notify User on Telegram
          const paidMsg = getBotMsg(userLang, 'withdrawalApproved', {
            amountUsd: amount,
            network: wdr.network,
            address: wdr.walletAddress,
            txHash: wdr.txHash,
          });

          sendMessage(uId, paidMsg).catch(() => {});
        } else if (status === 'REJECTED') {
          wdr.status = 'REJECTED';
          wdr.note = String(note || '').trim();
          wdr.resolvedAt = new Date().toISOString();

          // Refund pending back to available
          data.balances[uId].pendingWithdrawal = Math.max(0, Number(((data.balances[uId].pendingWithdrawal || 0) - amount).toFixed(2)));
          data.balances[uId].availableBalance = Number(((data.balances[uId].availableBalance || 0) + amount).toFixed(2));
          saveReferralsData(data);

          // Notify User on Telegram
          const rejectMsg = getBotMsg(userLang, 'withdrawalRejected', {
            amountUsd: amount,
            reason: wdr.note,
          });

          sendMessage(uId, rejectMsg).catch(() => {});
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, withdrawal: wdr }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // API 1.996: Admin Broadcast Referral Promotion
  if (pathname === '/api/admin/broadcast-referral' && req.method === 'POST') {
    broadcastReferralPromotion().then((outcome) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(outcome));
    }).catch((err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    });
    return;
  }

  // API 2: Strict On-Chain Payment Verification
  if (pathname === '/api/verify-payment' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        let { txHash, network, planId, billingCycle, lang, tgId } = payload;

        if (!txHash) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Missing required txHash parameter' }));
          return;
        }

        let cleanHash = String(txHash).trim();
        const extracted = extractTxHashFromText(cleanHash);
        if (extracted) {
          cleanHash = extracted.hash;
          if (!network) network = extracted.network;
        }

        console.log(`[API] Verifying on-chain tx: ${cleanHash} on ${network} for plan: ${planId} (${billingCycle})`);
        const result = await autoVerifyOnChainPayment({
          txHash: cleanHash,
          preferredNetwork: network,
          planId,
          billingCycle,
          lang,
          tgId,
        });

        if (result.ok) {
          const activatedPlan = result.planId || planId || 'pro';
          const finalCycle = result.billingCycle || billingCycle || 'weekly';
          if (tgId) {
            upsertUser({ tgId, plan: activatedPlan, status: 'ACTIVE' });
            // Process 50% referral commission
            processReferralCommission({
              buyerTgId: tgId,
              buyerName: payload.userName || '',
              planId: activatedPlan,
              billingCycle: finalCycle,
              amountPaidUsd: result.amountUsd,
            });
          }
          // Notify Admin on Telegram of genuine payment
          const adminLang = getUserLang(ADMIN_ID);
          sendMessage(
            ADMIN_ID,
            getBotMsg(adminLang, 'txAdminAlert', {
              userName: payload.userName || '',
              userId: tgId || 'Unknown',
              userUname: '',
              plan: activatedPlan,
              cycle: finalCycle,
              network: result.network || network,
              amountUsd: result.amountUsd,
              symbol: result.symbol,
              hash: cleanHash,
              source: 'WEBAPP',
            })
          ).catch(() => {});
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Verification server error: ' + err.message }));
      }
    });
    return;
  }

  // Static File Serving (In-Memory Cached)
  let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);

  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let fileData = getCachedStaticFile(filePath);
  if (!fileData) {
    fileData = getCachedStaticFile(path.join(DIST_DIR, 'index.html'));
  }

  if (fileData) {
    const headers = { 'Content-Type': fileData.contentType };
    if (pathname.startsWith('/assets/')) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    }
    res.writeHead(200, headers);
    res.end(fileData.content);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Process callback queries (language toggle)
async function handleCallbackQuery(cb) {
  const cbId = cb.id;
  const data = cb.data;
  const userId = cb.from?.id;
  const chatId = cb.message?.chat?.id;

  if (userId) {
    const fullName = [cb.from?.first_name, cb.from?.last_name].filter(Boolean).join(' ') || 'Operative';
    const uname = cb.from?.username ? `@${cb.from.username}` : '';
    upsertUser({ tgId: userId, name: fullName, username: uname });
  }

  if (data === 'set_lang_en') {
    setUserLang(userId, 'en');
    await api('answerCallbackQuery', {
      callback_query_id: cbId,
      text: getBotMsg('en', 'langSwitched'),
    });

    const isAdm = userId === ADMIN_ID;
    const msg = isAdm ? getBotMsg('en', 'welcomeAdmin') : getBotMsg('en', 'welcomeUser');

    await sendMessage(chatId, msg, {
      inline_keyboard: [
        [
          {
            text: getBotMsg('en', 'btnLaunch', isAdm),
            web_app: { url: `${WEB_APP_URL}?lang=en` },
          },
        ],
        [
          {
            text: getBotMsg('en', 'btnSwitchLang'),
            callback_data: 'set_lang_ru',
          },
        ],
      ],
    });
  } else if (data === 'set_lang_ru') {
    setUserLang(userId, 'ru');
    await api('answerCallbackQuery', {
      callback_query_id: cbId,
      text: getBotMsg('ru', 'langSwitched'),
    });

    const isAdm = userId === ADMIN_ID;
    const msg = isAdm ? getBotMsg('ru', 'welcomeAdmin') : getBotMsg('ru', 'welcomeUser');

    await sendMessage(chatId, msg, {
      inline_keyboard: [
        [
          {
            text: getBotMsg('ru', 'btnLaunch', isAdm),
            web_app: { url: `${WEB_APP_URL}?lang=ru` },
          },
        ],
        [
          {
            text: getBotMsg('ru', 'btnSwitchLangEn'),
            callback_data: 'set_lang_en',
          },
        ],
      ],
    });
  }
}

// Process incoming Telegram update
async function handleUpdate(update) {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

  if (!update.message || !update.message.text) return;

  const msg = update.message;
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const firstName = msg.from?.first_name || '';
  const lastName = msg.from?.last_name || '';
  const userName = [firstName, lastName].filter(Boolean).join(' ') || 'Operative';
  const userUname = msg.from?.username ? `@${msg.from.username}` : '';
  const text = msg.text.trim();
  const isAdmin = userId === ADMIN_ID;

  let isFirstTimeStart = false;
  if (userId) {
    const existingUsers = getSavedUsers();
    const isExisting = existingUsers.some((u) => String(u.tgId) === String(userId));
    if (!isExisting && !isAdmin && text.startsWith('/start')) {
      isFirstTimeStart = true;
    }

    upsertUser({
      tgId: userId,
      name: userName,
      username: userUname,
    });

    // Referral deep linking support: /start ref_123456789 or /start 123456789
    if (text.startsWith('/start')) {
      const startParts = text.split(/\s+/);
      if (startParts.length > 1) {
        const refParam = startParts[1].trim();
        const referrerId = refParam.replace(/^ref_/, '');
        if (referrerId && /^\d+$/.test(referrerId) && referrerId !== String(userId)) {
          bindReferral({
            referrerTgId: referrerId,
            referredTgId: userId,
            name: userName,
            username: userUname,
          });
        }
      }
    }

    if (isFirstTimeStart) {
      const adminLang = getUserLang(ADMIN_ID);
      const alertMsg = getBotMsg(adminLang, 'newUserAlert', { userName, userId, userUname });
      sendMessage(ADMIN_ID, alertMsg).catch(() => {});
    }
  }

  const lang = getUserLang(userId);
  console.log(`[Message] From: ${userName} (ID: ${userId}) | Lang: ${lang} | Text: "${text}" | IsAdmin: ${isAdmin}`);

  // Admin wallet management commands
  if (isAdmin && (text === '/wallets' || text === '/wallet')) {
    const current = getSavedAddresses();
    await sendMessage(chatId, getBotMsg(lang, 'walletsList', current));
    return;
  }

  // Admin trigger referral broadcast
  if (isAdmin && (text === '/promo' || text === '/broadcast_referral')) {
    await sendMessage(chatId, '📢 <i>Запуск рассылки промо-акции реферальной программы всем пользователям...</i>');
    const outcome = await broadcastReferralPromotion();
    await sendMessage(
      chatId,
      `✅ <b>Рассылка реферальной программы завершена!</b>\n\n` +
      `• Всего пользователей: ${outcome.total}\n` +
      `• Успешно отправлено: <b>${outcome.sent}</b>\n` +
      `• Ошибок / Заблокировано: <b>${outcome.failed}</b>`
    );
    return;
  }

  if (isAdmin && text.startsWith('/settron ')) {
    const addr = text.replace('/settron ', '').trim();
    if (addr.length < 25) {
      await sendMessage(chatId, lang === 'ru' ? '❌ Неверный адрес Tron!' : '❌ Invalid Tron address!');
      return;
    }
    const current = getSavedAddresses();
    current.TRON = addr;
    saveAddresses(current);
    await sendMessage(chatId, lang === 'ru' ? `✅ <b>TRON депозитный адрес обновлен:</b>\n<code>${addr}</code>` : `✅ <b>TRON deposit address updated:</b>\n<code>${addr}</code>`);
    return;
  }

  if (isAdmin && text.startsWith('/seteth ')) {
    const addr = text.replace('/seteth ', '').trim();
    if (!addr.startsWith('0x') || addr.length < 35) {
      await sendMessage(chatId, lang === 'ru' ? '❌ Неверный адрес Ethereum!' : '❌ Invalid Ethereum address!');
      return;
    }
    const current = getSavedAddresses();
    current.ETHEREUM = addr;
    saveAddresses(current);
    await sendMessage(chatId, lang === 'ru' ? `✅ <b>ETHEREUM депозитный адрес обновлен:</b>\n<code>${addr}</code>` : `✅ <b>ETHEREUM deposit address updated:</b>\n<code>${addr}</code>`);
    return;
  }

  if (isAdmin && text.startsWith('/setsol ')) {
    const addr = text.replace('/setsol ', '').trim();
    if (addr.length < 32) {
      await sendMessage(chatId, lang === 'ru' ? '❌ Неверный адрес Solana!' : '❌ Invalid Solana address!');
      return;
    }
    const current = getSavedAddresses();
    current.SOLANA = addr;
    saveAddresses(current);
    await sendMessage(chatId, lang === 'ru' ? `✅ <b>SOLANA депозитный адрес обновлен:</b>\n<code>${addr}</code>` : `✅ <b>SOLANA deposit address updated:</b>\n<code>${addr}</code>`);
    return;
  }

  if (isAdmin && (text === '/hashes' || text === '/usedhashes')) {
    const list = getUsedHashes();
    if (list.length === 0) {
      await sendMessage(chatId, lang === 'ru'
        ? `ℹ️ <b>База подтвержденных транзакций (used_hashes.json):</b>\n\nПока нет сохраненных использованных хэшей.`
        : `ℹ️ <b>Confirmed Transactions Database (used_hashes.json):</b>\n\nNo recorded transaction hashes yet.`
      );
      return;
    }
    let msg = lang === 'ru'
      ? `👑 <b>Подтвержденные транзакции (${list.length}):</b>\n\n`
      : `👑 <b>Confirmed Transactions (${list.length}):</b>\n\n`;
    list.slice(-10).forEach((item, idx) => {
      const h = typeof item === 'string' ? item : item.hash;
      const net = item.network || 'NET';
      const plan = (item.planId || 'plan').toUpperCase();
      const amt = item.amountUsd ? `$${Number(item.amountUsd).toFixed(2)}` : '';
      const dateStr = item.date ? new Date(item.date).toLocaleDateString() : '';
      msg += `${idx + 1}. [${net}] <code>${h ? h.slice(0, 16) + '...' : ''}</code>\n   ${lang === 'ru' ? 'Тариф' : 'Plan'}: ${plan} | ${amt} ${dateStr ? '| ' + dateStr : ''}\n`;
    });
    if (list.length > 10) {
      msg += lang === 'ru'
        ? `\n<i>...и еще ${list.length - 10} транзакций (в файле data/used_hashes.json).</i>`
        : `\n<i>...and ${list.length - 10} more transactions (in data/used_hashes.json).</i>`;
    }
    await sendMessage(chatId, msg);
    return;
  }

  if (isAdmin && (text === '/users' || text === '/userlist')) {
    const list = getSavedUsers();
    let msgText = lang === 'ru'
      ? `👥 <b>Список пользователей (Всего: ${list.length}):</b>\n\n`
      : `👥 <b>User Registry (Total: ${list.length}):</b>\n\n`;
    list.forEach((u, i) => {
      const isAdm = String(u.tgId) === String(ADMIN_ID);
      const badge = isAdm ? '👑 OWNER' : `[${(u.plan || 'community').toUpperCase()}]`;
      const statusIcon = u.status === 'RESTRICTED' ? '⛔' : '✅';
      msgText += `${i + 1}. ${statusIcon} <b>${u.name}</b> (${u.username || 'no_user'})\n`;
      msgText += `   TG ID: <code>${u.tgId}</code> | ${badge}\n`;
      msgText += `   ${lang === 'ru' ? 'Экстрактов' : 'Extracts'}: ${u.extractsCount || 0} ($${(u.totalExtractedUsd || 0).toLocaleString()})\n\n`;
    });
    msgText += lang === 'ru'
      ? `<i>Удалить пользователя: <code>/deleteuser &lt;tgId&gt;</code>\nПолное управление доступно в Панели Администратора Mini App.</i>`
      : `<i>Delete user: <code>/deleteuser &lt;tgId&gt;</code>\nFull management available in Mini App Admin Panel.</i>`;
    await sendMessage(chatId, msgText);
    return;
  }

  if (isAdmin && text.startsWith('/deleteuser ')) {
    const targetTgId = text.replace('/deleteuser ', '').trim();
    if (targetTgId === String(ADMIN_ID)) {
      await sendMessage(chatId, lang === 'ru' ? '❌ Нельзя удалить владельца системы (Owner)!' : '❌ Cannot delete system owner!');
      return;
    }
    let users = getSavedUsers();
    const target = users.find(u => String(u.tgId) === targetTgId || u.id === targetTgId);
    if (!target) {
      await sendMessage(chatId, lang === 'ru' ? `❌ Пользователь не найден (ID: ${targetTgId})` : `❌ User not found (ID: ${targetTgId})`);
      return;
    }
    users = users.filter(u => String(u.tgId) !== targetTgId && u.id !== targetTgId);
    saveUsers(users);
    await sendMessage(chatId, lang === 'ru' ? `✅ Пользователь удален: <b>${target.name}</b> (ID: <code>${targetTgId}</code>)` : `✅ User removed: <b>${target.name}</b> (ID: <code>${targetTgId}</code>)`);
    return;
  }

  // Language selection commands
  if (text === '/lang' || text === '/language') {
    if (lang === 'ru') {
      await sendMessage(chatId, '🌐 <b>Выберите язык интерфейса:</b>', {
        inline_keyboard: [
          [
            { text: '🇬🇧 English', callback_data: 'set_lang_en' },
            { text: '🇷🇺 Русский (Текущий)', callback_data: 'set_lang_ru' },
          ],
        ],
      });
    } else {
      await sendMessage(chatId, '🌐 <b>Choose interface language:</b>', {
        inline_keyboard: [
          [
            { text: '🇬🇧 English (Current)', callback_data: 'set_lang_en' },
            { text: '🇷🇺 Русский', callback_data: 'set_lang_ru' },
          ],
        ],
      });
    }
    return;
  }

  if (text === '/en') {
    setUserLang(userId, 'en');
    await sendMessage(chatId, 'Language switched to <b>English</b>.', {
      inline_keyboard: [
        [
          {
            text: '🦈 Launch Shark Extractor',
            web_app: { url: `${WEB_APP_URL}?lang=en` },
          },
        ],
      ],
    });
    return;
  }

  if (text === '/ru') {
    setUserLang(userId, 'ru');
    await sendMessage(chatId, 'Язык переключен на <b>Русский</b>.', {
      inline_keyboard: [
        [
          {
            text: '🦈 Запустить Shark Extractor',
            web_app: { url: `${WEB_APP_URL}?lang=ru` },
          },
        ],
      ],
    });
    return;
  }

  if (text.startsWith('/start')) {
    if (lang === 'ru') {
      if (isAdmin) {
        const adminWelcome = `⚡ <b>Добро пожаловать, Администратор ${userName}!</b> 👑\n\n` +
          `<b>Статус:</b> [ДОСТУП АДМИНИСТРАТОРА // ПОЛНЫЙ]\n` +
          `<b>Telegram ID:</b> <code>${userId}</code>\n\n` +
          `<b>Панель администратора (Кошельки, Тарифы и Пользователи)</b> разблокирована в вашей сессии Mini App.\n\n` +
          `Нажмите кнопку ниже для запуска консоли:`;

        await sendMessage(chatId, adminWelcome, {
          inline_keyboard: [
            [
              {
                text: '⚡ Запустить Protocol (Режим Admin)',
                web_app: { url: `${WEB_APP_URL}?lang=ru` },
              },
            ],
            [
              {
                text: '🇬🇧 Switch to English',
                callback_data: 'set_lang_en',
              },
            ],
          ],
        });
      } else {
        const userWelcome = `⚡ <b>Добро пожаловать в BlockHunt Protocol v3.8</b>\n\n` +
          `⚡ <b>Движок:</b> Аппаратный анализ коллизий SECP256K1 и мемпула.\n` +
          `🌐 <b>Поддерживаемые сети:</b> TRON (TRC-20) | ETHEREUM (ERC-20) | SOLANA (SOL)\n\n` +
          `Нажмите кнопку ниже для запуска:`;

        await sendMessage(chatId, userWelcome, {
          inline_keyboard: [
            [
              {
                text: '⚡ Запустить BlockHunt Protocol',
                web_app: { url: `${WEB_APP_URL}?lang=ru` },
              },
            ],
            [
              {
                text: '🇬🇧 Switch to English',
                callback_data: 'set_lang_en',
              },
            ],
          ],
        });
      }
    } else {
      if (isAdmin) {
        const adminWelcome = `⚡ <b>Welcome, Authorized Administrator ${userName}!</b> 👑\n\n` +
          `<b>Status:</b> [ADMIN AUTHORIZED // FULL ACCESS]\n` +
          `<b>Telegram ID:</b> <code>${userId}</code>\n\n` +
          `The <b>Admin Control Panel (Deposit Wallets, Pricing & Users)</b> is fully active in your Mini App session.\n\n` +
          `Tap the button below to launch the protocol:`;

        await sendMessage(chatId, adminWelcome, {
          inline_keyboard: [
            [
              {
                text: '⚡ Launch Protocol (Admin Mode)',
                web_app: { url: `${WEB_APP_URL}?lang=en` },
              },
            ],
            [
              {
                text: '🇷🇺 Переключить на Русский',
                callback_data: 'set_lang_ru',
              },
            ],
          ],
        });
      } else {
        const userWelcome = `⚡ <b>Welcome to BlockHunt Protocol v3.8</b>\n\n` +
          `⚡ <b>Engine:</b> Hardware-accelerated SECP256K1 collision & mempool analyzer.\n` +
          `🌐 <b>Supported Clusters:</b> TRON (TRC-20) | ETHEREUM (ERC-20) | SOLANA (SOL)\n\n` +
          `Tap the button below to start:`;

        await sendMessage(chatId, userWelcome, {
          inline_keyboard: [
            [
              {
                text: '⚡ Launch BlockHunt Protocol',
                web_app: { url: `${WEB_APP_URL}?lang=en` },
              },
            ],
            [
              {
                text: '🇷🇺 Переключить на Русский',
                callback_data: 'set_lang_ru',
              },
            ],
          ],
        });
      }
    }
  } else if (text === '/admin' || text === '/status') {
    if (isAdmin) {
      const current = getSavedAddresses();
      if (lang === 'ru') {
        await sendMessage(
          chatId,
          `👑 <b>Панель Управления Администратора</b>\n\n` +
          `• <b>Admin ID:</b> <code>${userId}</code>\n` +
          `• <b>Web App:</b> ${WEB_APP_URL}?lang=ru\n` +
          `• <b>TRON Депозит:</b> <code>${current.TRON}</code>\n` +
          `• <b>ETH Депозит:</b> <code>${current.ETHEREUM}</code>\n` +
          `• <b>SOL Депозит:</b> <code>${current.SOLANA}</code>\n\n` +
          `Откройте Mini App и перейдите в <b>Панель Администратора</b> в верхнем меню для изменения настроек или используйте команды /wallets, /hashes и /users.`
        );
      } else {
        await sendMessage(
          chatId,
          `👑 <b>Admin Control Center</b>\n\n` +
          `• <b>Admin ID:</b> <code>${userId}</code>\n` +
          `• <b>Web App:</b> ${WEB_APP_URL}?lang=en\n` +
          `• <b>TRON Deposit:</b> <code>${current.TRON}</code>\n` +
          `• <b>ETH Deposit:</b> <code>${current.ETHEREUM}</code>\n` +
          `• <b>SOL Deposit:</b> <code>${current.SOLANA}</code>\n\n` +
          `Open the Mini App and access the <b>Admin Panel</b> to change settings or use /wallets, /hashes, and /users.`
        );
      }
    } else {
      await sendMessage(chatId, getBotMsg(lang, 'accessDeniedAdmin'));
    }
  } else if (text === '/id') {
    await sendMessage(chatId, getBotMsg(lang, 'yourTgId', userId));
  } else {
    // Check if user sent a transaction hash or explorer link in chat
    const txInfo = !text.startsWith('/') ? extractTxHashFromText(text) : null;
    if (txInfo) {
      const isRu = lang === 'ru';
      console.log(`[Telegram Chat] Detected transaction hash: ${txInfo.hash} (${txInfo.network}) from user ${userId} (${userName})`);

      // 1. Send interim "Verifying on blockchain" notice
      await sendMessage(
        chatId,
        getBotMsg(lang, 'txVerifying', { hash: txInfo.hash, network: txInfo.network })
      );

      try {
        const verifyRes = await autoVerifyOnChainPayment({
          txHash: txInfo.hash,
          preferredNetwork: txInfo.network,
          lang,
          tgId: userId,
        });

        if (verifyRes.ok) {
          const actPlan = verifyRes.planId || 'pro';
          const cycle = verifyRes.billingCycle || 'weekly';
          upsertUser({ tgId: userId, plan: actPlan, status: 'ACTIVE' });
          // Process 50% referral commission
          processReferralCommission({
            buyerTgId: userId,
            buyerName: userName,
            planId: actPlan,
            billingCycle: cycle,
            amountPaidUsd: verifyRes.amountUsd,
          });

          const successMsg = getBotMsg(lang, 'txSuccess', {
            plan: actPlan,
            cycle,
            network: verifyRes.network,
            amountUsd: verifyRes.amountUsd,
            symbol: verifyRes.symbol,
            hash: txInfo.hash,
          });

          await sendMessage(chatId, successMsg, {
            inline_keyboard: [
              [
                {
                  text: getBotMsg(lang, 'btnLaunch', false),
                  web_app: { url: `${WEB_APP_URL}?lang=${lang}` },
                },
              ],
            ],
          });

          // Notify Admin of successful chat payment
          const adminLang = getUserLang(ADMIN_ID);
          const adminAlert = getBotMsg(adminLang, 'txAdminAlert', {
            userName,
            userId,
            userUname,
            plan: actPlan,
            cycle,
            network: verifyRes.network,
            amountUsd: verifyRes.amountUsd,
            symbol: verifyRes.symbol,
            hash: txInfo.hash,
            source: 'CHAT',
          });

          sendMessage(ADMIN_ID, adminAlert).catch(() => {});
          return;
        } else {
          // Verification failed on-chain
          const failMsg = getBotMsg(lang, 'txFailed', { error: verifyRes.error });
          await sendMessage(chatId, failMsg);
          return;
        }
      } catch (err) {
        console.error('[VerifyChat] Error:', err.message);
        await sendMessage(chatId, getBotMsg(lang, 'txRpcError', { error: err.message }));
        return;
      }
    }

    if (lang === 'ru') {
      await sendMessage(chatId, getBotMsg('ru', 'langPrompt'), {
        inline_keyboard: [
          [
            {
              text: getBotMsg('ru', 'btnLaunchMiniApp'),
              web_app: { url: `${WEB_APP_URL}?lang=ru` },
            },
          ],
          [
            {
              text: getBotMsg('ru', 'btnSwitchLangEn'),
              callback_data: 'set_lang_en',
            },
          ],
        ],
      });
    } else {
      await sendMessage(chatId, getBotMsg('en', 'langPrompt'), {
        inline_keyboard: [
          [
            {
              text: getBotMsg('en', 'btnLaunchMiniApp'),
              web_app: { url: `${WEB_APP_URL}?lang=en` },
            },
          ],
          [
            {
              text: getBotMsg('en', 'btnSwitchLang'),
              callback_data: 'set_lang_ru',
            },
          ],
        ],
      });
    }
  }
}

// Long polling loop with high concurrency & non-blocking update processing
let lastUpdateId = 0;
let isPollingActive = false;

async function startPolling() {
  if (isPollingActive) return;
  isPollingActive = true;
  console.log('BlockHunt Protocol Telegram Bot concurrent polling started...');
  await setupMenuButton('en');

  while (true) {
    try {
      const data = await api('getUpdates', {
        offset: lastUpdateId + 1,
        timeout: 25,
      }, 35000);

      if (data && data.ok && Array.isArray(data.result) && data.result.length > 0) {
        // Immediately acknowledge update IDs to Telegram so duplicate replay loops can NEVER occur
        for (const update of data.result) {
          if (update.update_id > lastUpdateId) {
            lastUpdateId = update.update_id;
          }
        }

        // Process updates concurrently without blocking the next polling round
        for (const update of data.result) {
          handleUpdate(update).catch((err) => {
            console.error(`[Update Error] Failed to handle update ${update.update_id}:`, err?.message || err);
          });
        }
      }
    } catch (err) {
      console.error('Polling error:', err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// Start HTTP server & Polling
server.listen(PORT, '0.0.0.0', () => {
  console.log(`BlockHunt Protocol HTTP Server & API running on http://0.0.0.0:${PORT}`);
  startPolling();
});