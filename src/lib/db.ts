import { createClient, type Client } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

// Singleton client across serverless invocations
declare global {
  var _libsqlClient: Client | undefined;
  var _dbInitialized: Promise<boolean> | undefined;
}

const dbUrl = process.env.DATABASE_URL || 'file:./data/database.sqlite';
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;

export function getDbClient(): Client {
  if (!globalThis._libsqlClient) {
    // If local file path, ensure directory exists
    if (dbUrl.startsWith('file:')) {
      const filePath = dbUrl.replace(/^file:/, '');
      const dir = path.dirname(path.resolve(process.cwd(), filePath));
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch {}
      }
    }

    globalThis._libsqlClient = createClient({
      url: dbUrl,
      authToken: authToken,
    });
  }
  return globalThis._libsqlClient;
}

const DEFAULT_DEPOSIT_ADDRESSES = {
  TRON: 'TLyQkouT6HuS4oKiiG1CMYqsZuiFsBRC8r',
  ETHEREUM: '0x14f1cA866Ecf795cE726043191D8CD011788471A',
  SOLANA: '5qMr4zSikoRdW9uejZCYPE9MoEG8CEBRSyPW86xVB5Mi',
};

const DEFAULT_PRICING_SETTINGS = {
  plans: {
    pro: { weekly: 25, monthly: 79 },
    enterprise: { weekly: 69, monthly: 199 },
  },
  discount: { enabled: false, percent: 50 },
  banner: {
    enabled: false,
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

const ADMIN_ID = process.env.ADMIN_TG_ID || '8515329556';

export async function initDb(): Promise<boolean> {
  if (globalThis._dbInitialized) {
    return globalThis._dbInitialized;
  }

  globalThis._dbInitialized = (async () => {
    const db = getDbClient();

    // 1. Create tables
    await db.batch([
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        tgId TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        username TEXT,
        plan TEXT DEFAULT 'community',
        extractsCount INTEGER DEFAULT 0,
        totalExtractedUsd REAL DEFAULT 0,
        status TEXT DEFAULT 'ACTIVE',
        joinedAt TEXT,
        lastActive TEXT,
        lang TEXT DEFAULT 'en',
        limitResetAt TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS admin_addresses (
        network TEXT PRIMARY KEY,
        address TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS pricing_settings (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS extractions (
        id TEXT PRIMARY KEY,
        tgId TEXT NOT NULL,
        userName TEXT,
        network TEXT NOT NULL,
        walletAddress TEXT NOT NULL,
        balanceCrypto REAL DEFAULT 0,
        balanceUsd REAL DEFAULT 0,
        symbol TEXT,
        timestamp TEXT,
        status TEXT DEFAULT 'COMPLETED',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        referrerTgId TEXT NOT NULL,
        referredTgId TEXT UNIQUE NOT NULL,
        referredName TEXT,
        referredUsername TEXT,
        joinedAt TEXT,
        plan TEXT DEFAULT 'community',
        earnedUsd REAL DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS withdrawals (
        id TEXT PRIMARY KEY,
        tgId TEXT NOT NULL,
        userName TEXT,
        userUsername TEXT,
        amountUsd REAL NOT NULL,
        network TEXT NOT NULL,
        walletAddress TEXT NOT NULL,
        requestedAt TEXT,
        status TEXT DEFAULT 'PENDING',
        txHash TEXT,
        note TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS used_hashes (
        hash TEXT PRIMARY KEY,
        plan TEXT,
        cycle TEXT,
        network TEXT,
        amountUsd REAL,
        timestamp INTEGER,
        date TEXT
      );`,
    ], 'write');

    // 2. Check if we need to seed from legacy json files
    try {
      const userCountRes = await db.execute('SELECT COUNT(*) as count FROM users');
      const userCount = Number(userCountRes.rows[0]?.count || 0);

      if (userCount === 0) {
        console.log('[DB] Seeding initial data from legacy JSON files...');
        const dataDir = path.resolve(process.cwd(), 'data');

        // Seed Admin Addresses
        const addrFile = path.join(dataDir, 'admin_addresses.json');
        let initialAddrs = DEFAULT_DEPOSIT_ADDRESSES;
        if (fs.existsSync(addrFile)) {
          try {
            initialAddrs = { ...DEFAULT_DEPOSIT_ADDRESSES, ...JSON.parse(fs.readFileSync(addrFile, 'utf-8')) };
          } catch {}
        }
        for (const [net, addr] of Object.entries(initialAddrs)) {
          await db.execute({
            sql: `INSERT OR REPLACE INTO admin_addresses (network, address) VALUES (?, ?)`,
            args: [net, addr],
          });
        }

        // Seed Pricing Settings
        const pricingFile = path.join(dataDir, 'pricing_settings.json');
        let initialPricing = DEFAULT_PRICING_SETTINGS;
        if (fs.existsSync(pricingFile)) {
          try {
            initialPricing = { ...DEFAULT_PRICING_SETTINGS, ...JSON.parse(fs.readFileSync(pricingFile, 'utf-8')) };
          } catch {}
        }
        await db.execute({
          sql: `INSERT OR REPLACE INTO pricing_settings (id, data) VALUES ('main', ?)`,
          args: [JSON.stringify(initialPricing)],
        });

        // Seed Users
        const usersFile = path.join(dataDir, 'users.json');
        let initialUsers: any[] = [];
        if (fs.existsSync(usersFile)) {
          try {
            const raw = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
            if (Array.isArray(raw)) initialUsers = raw;
          } catch {}
        }

        // Ensure owner exists
        const hasOwner = initialUsers.some((u) => String(u.tgId) === String(ADMIN_ID));
        if (!hasOwner) {
          initialUsers.unshift({
            id: `user-${ADMIN_ID}`,
            tgId: String(ADMIN_ID),
            name: 'Ahmad',
            username: '',
            plan: 'enterprise',
            extractsCount: 0,
            totalExtractedUsd: 0,
            status: 'ACTIVE',
            joinedAt: 'System Owner',
            lastActive: new Date().toISOString(),
            lang: 'en',
          });
        }

        for (const u of initialUsers) {
          if (!u.tgId) continue;
          await db.execute({
            sql: `INSERT OR REPLACE INTO users (id, tgId, name, username, plan, extractsCount, totalExtractedUsd, status, joinedAt, lastActive, lang, limitResetAt)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              u.id || `user-${u.tgId}`,
              String(u.tgId),
              u.name || 'User',
              u.username || '',
              u.plan || 'community',
              Number(u.extractsCount || 0),
              Number(u.totalExtractedUsd || 0),
              u.status || 'ACTIVE',
              u.joinedAt || new Date().toISOString(),
              u.lastActive || new Date().toISOString(),
              u.lang || 'en',
              u.limitResetAt || null,
            ],
          });
        }

        // Seed Referrals
        const refFile = path.join(dataDir, 'referrals.json');
        if (fs.existsSync(refFile)) {
          try {
            const refData = JSON.parse(fs.readFileSync(refFile, 'utf-8'));
            if (Array.isArray(refData.referrals)) {
              for (const r of refData.referrals) {
                if (!r.referredTgId) continue;
                await db.execute({
                  sql: `INSERT OR REPLACE INTO referrals (id, referrerTgId, referredTgId, referredName, referredUsername, joinedAt, plan, earnedUsd)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  args: [
                    r.id || `ref-${r.referredTgId}`,
                    String(r.referrerTgId),
                    String(r.referredTgId),
                    r.referredName || '',
                    r.referredUsername || '',
                    r.joinedAt || new Date().toISOString(),
                    r.plan || 'community',
                    Number(r.earnedUsd || 0),
                  ],
                });
              }
            }
          } catch {}
        }

        // Seed Used Hashes
        const hashFile = path.join(dataDir, 'used_hashes.json');
        if (fs.existsSync(hashFile)) {
          try {
            const hashes = JSON.parse(fs.readFileSync(hashFile, 'utf-8'));
            if (Array.isArray(hashes)) {
              for (const h of hashes) {
                const hashStr = typeof h === 'string' ? h : h.hash;
                if (!hashStr) continue;
                await db.execute({
                  sql: `INSERT OR IGNORE INTO used_hashes (hash, plan, cycle, network, amountUsd, timestamp, date)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  args: [
                    hashStr.toLowerCase().trim(),
                    h.plan || 'pro',
                    h.cycle || 'weekly',
                    h.network || 'TRON',
                    Number(h.amountUsd || 0),
                    Number(h.timestamp || Date.now()),
                    h.date || new Date().toISOString(),
                  ],
                });
              }
            }
          } catch {}
        }

        console.log('[DB] Seeding completed successfully!');
      }
    } catch (err: any) {
      console.error('[DB] Seeding error:', err?.message || err);
    }

    return true;
  })();

  return globalThis._dbInitialized;
}

// User Helpers
export async function getUser(tgId: string) {
  await initDb();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT * FROM users WHERE tgId = ?',
    args: [String(tgId)],
  });
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    id: String(row.id),
    tgId: String(row.tgId),
    name: String(row.name),
    username: String(row.username || ''),
    plan: String(row.plan || 'community'),
    extractsCount: Number(row.extractsCount || 0),
    totalExtractedUsd: Number(row.totalExtractedUsd || 0),
    status: String(row.status || 'ACTIVE'),
    joinedAt: String(row.joinedAt || ''),
    lastActive: String(row.lastActive || ''),
    lang: String(row.lang || 'en'),
    limitResetAt: row.limitResetAt ? String(row.limitResetAt) : undefined,
  };
}

export async function upsertUser(user: {
  tgId: string;
  name: string;
  username?: string;
  lang?: string;
}) {
  await initDb();
  const db = getDbClient();
  const tgIdStr = String(user.tgId);
  const existing = await getUser(tgIdStr);

  const isOwner = tgIdStr === String(ADMIN_ID);
  const now = new Date().toISOString();

  if (existing) {
    const newName = user.name || existing.name;
    const newUsername = user.username !== undefined ? user.username : existing.username;
    const newLang = user.lang || existing.lang || 'en';

    await db.execute({
      sql: `UPDATE users SET name = ?, username = ?, lang = ?, lastActive = ? WHERE tgId = ?`,
      args: [newName, newUsername, newLang, now, tgIdStr],
    });

    return { ...existing, name: newName, username: newUsername, lang: newLang, lastActive: now };
  } else {
    const newUser = {
      id: `user-${tgIdStr}`,
      tgId: tgIdStr,
      name: user.name || 'Telegram User',
      username: user.username || '',
      plan: isOwner ? 'enterprise' : 'community',
      extractsCount: 0,
      totalExtractedUsd: 0,
      status: 'ACTIVE',
      joinedAt: now,
      lastActive: now,
      lang: user.lang || 'en',
    };

    await db.execute({
      sql: `INSERT INTO users (id, tgId, name, username, plan, extractsCount, totalExtractedUsd, status, joinedAt, lastActive, lang)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newUser.id,
        newUser.tgId,
        newUser.name,
        newUser.username,
        newUser.plan,
        newUser.extractsCount,
        newUser.totalExtractedUsd,
        newUser.status,
        newUser.joinedAt,
        newUser.lastActive,
        newUser.lang,
      ],
    });

    return newUser;
  }
}

export async function setUserLang(tgId: string, lang: string) {
  await initDb();
  const db = getDbClient();
  const cleanLang = lang === 'ru' ? 'ru' : 'en';
  await db.execute({
    sql: 'UPDATE users SET lang = ? WHERE tgId = ?',
    args: [cleanLang, String(tgId)],
  });
  return cleanLang;
}

export async function updateUser(tgId: string, fields: Record<string, any>) {
  await initDb();
  const db = getDbClient();
  const keys = Object.keys(fields);
  if (keys.length === 0) return;

  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => fields[k]);
  values.push(String(tgId));

  await db.execute({
    sql: `UPDATE users SET ${setClause} WHERE tgId = ?`,
    args: values,
  });
}

export async function listUsers() {
  await initDb();
  const db = getDbClient();
  const res = await db.execute('SELECT * FROM users ORDER BY createdAt DESC');
  return res.rows.map((row) => ({
    id: String(row.id),
    tgId: String(row.tgId),
    name: String(row.name),
    username: String(row.username || ''),
    plan: String(row.plan || 'community'),
    extractsCount: Number(row.extractsCount || 0),
    totalExtractedUsd: Number(row.totalExtractedUsd || 0),
    status: String(row.status || 'ACTIVE'),
    joinedAt: String(row.joinedAt || ''),
    lastActive: String(row.lastActive || ''),
    lang: String(row.lang || 'en'),
    limitResetAt: row.limitResetAt ? String(row.limitResetAt) : undefined,
  }));
}

export async function deleteUser(tgId: string) {
  await initDb();
  const db = getDbClient();
  await db.execute({
    sql: 'DELETE FROM users WHERE tgId = ?',
    args: [String(tgId)],
  });
}

export async function resetUserLimit(tgId: string) {
  await initDb();
  const db = getDbClient();
  const now = new Date().toISOString();
  await db.execute({
    sql: 'UPDATE users SET extractsCount = 0, limitResetAt = ? WHERE tgId = ?',
    args: [now, String(tgId)],
  });
}

export async function resetAllLimits() {
  await initDb();
  const db = getDbClient();
  const now = new Date().toISOString();
  await db.execute({
    sql: 'UPDATE users SET extractsCount = 0, limitResetAt = ?',
    args: [now],
  });
}

// Deposit Addresses
export async function getAddresses() {
  await initDb();
  const db = getDbClient();
  const res = await db.execute('SELECT * FROM admin_addresses');
  const result: Record<string, string> = { ...DEFAULT_DEPOSIT_ADDRESSES };
  for (const row of res.rows) {
    if (row.network && row.address) {
      result[String(row.network)] = String(row.address);
    }
  }
  return result;
}

export async function saveAddresses(addrs: Record<string, string>) {
  await initDb();
  const db = getDbClient();
  for (const [net, addr] of Object.entries(addrs)) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO admin_addresses (network, address) VALUES (?, ?)',
      args: [net, addr],
    });
  }
  return true;
}

// Pricing Settings
export async function getPricingSettings() {
  await initDb();
  const db = getDbClient();
  const res = await db.execute("SELECT data FROM pricing_settings WHERE id = 'main'");
  if (res.rows.length === 0) return DEFAULT_PRICING_SETTINGS;
  try {
    return JSON.parse(String(res.rows[0].data));
  } catch {
    return DEFAULT_PRICING_SETTINGS;
  }
}

export async function savePricingSettings(settings: any) {
  await initDb();
  const db = getDbClient();
  await db.execute({
    sql: "INSERT OR REPLACE INTO pricing_settings (id, data, updatedAt) VALUES ('main', ?, CURRENT_TIMESTAMP)",
    args: [JSON.stringify(settings)],
  });
  return true;
}

// Extractions
export async function addExtraction(ext: {
  tgId: string;
  userName?: string;
  network: string;
  walletAddress: string;
  balanceCrypto: number;
  balanceUsd: number;
  symbol?: string;
  status?: string;
}) {
  await initDb();
  const db = getDbClient();
  const id = `ext-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const timestamp = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO extractions (id, tgId, userName, network, walletAddress, balanceCrypto, balanceUsd, symbol, timestamp, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      String(ext.tgId),
      ext.userName || 'User',
      ext.network,
      ext.walletAddress,
      ext.balanceCrypto || 0,
      ext.balanceUsd || 0,
      ext.symbol || '',
      timestamp,
      ext.status || 'COMPLETED',
    ],
  });

  // Increment user extracts count & volume
  await db.execute({
    sql: `UPDATE users SET extractsCount = extractsCount + 1, totalExtractedUsd = totalExtractedUsd + ?, lastActive = ? WHERE tgId = ?`,
    args: [ext.balanceUsd || 0, timestamp, String(ext.tgId)],
  });

  return { id, timestamp, ...ext };
}

export async function listExtractions(tgId?: string) {
  await initDb();
  const db = getDbClient();
  const query = tgId
    ? { sql: 'SELECT * FROM extractions WHERE tgId = ? ORDER BY createdAt DESC LIMIT 100', args: [String(tgId)] }
    : { sql: 'SELECT * FROM extractions ORDER BY createdAt DESC LIMIT 200', args: [] };
  const res = await db.execute(query);
  return res.rows.map((row) => ({
    id: String(row.id),
    tgId: String(row.tgId),
    userName: String(row.userName || ''),
    network: String(row.network),
    walletAddress: String(row.walletAddress),
    balanceCrypto: Number(row.balanceCrypto || 0),
    balanceUsd: Number(row.balanceUsd || 0),
    symbol: String(row.symbol || ''),
    timestamp: String(row.timestamp || ''),
    status: String(row.status || 'COMPLETED'),
  }));
}

// Payment Hashes
export async function isHashUsed(hash: string): Promise<boolean> {
  await initDb();
  const db = getDbClient();
  const clean = hash.trim().toLowerCase();
  const raw = clean.replace(/^0x/, '');
  const res = await db.execute({
    sql: 'SELECT hash FROM used_hashes WHERE lower(hash) = ? OR lower(hash) = ?',
    args: [clean, raw],
  });
  return res.rows.length > 0;
}

export async function markHashUsed(hash: string, details: {
  plan?: string;
  cycle?: string;
  network?: string;
  amountUsd?: number;
}) {
  await initDb();
  const db = getDbClient();
  const clean = hash.trim().toLowerCase();
  await db.execute({
    sql: `INSERT OR REPLACE INTO used_hashes (hash, plan, cycle, network, amountUsd, timestamp, date)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      clean,
      details.plan || 'pro',
      details.cycle || 'weekly',
      details.network || 'TRON',
      Number(details.amountUsd || 0),
      Date.now(),
      new Date().toISOString(),
    ],
  });
}

// Referrals
export async function bindReferral(data: {
  referrerTgId: string;
  referredTgId: string;
  referredName?: string;
  referredUsername?: string;
}) {
  await initDb();
  const db = getDbClient();
  const refTgId = String(data.referredTgId);
  const referrerTgId = String(data.referrerTgId);

  if (refTgId === referrerTgId) return false;

  const existing = await db.execute({
    sql: 'SELECT id FROM referrals WHERE referredTgId = ?',
    args: [refTgId],
  });
  if (existing.rows.length > 0) return false;

  const id = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await db.execute({
    sql: `INSERT INTO referrals (id, referrerTgId, referredTgId, referredName, referredUsername, joinedAt, plan, earnedUsd)
          VALUES (?, ?, ?, ?, ?, ?, 'community', 0)`,
    args: [
      id,
      referrerTgId,
      refTgId,
      data.referredName || '',
      data.referredUsername || '',
      new Date().toISOString(),
    ],
  });

  return true;
}

export async function creditReferralCommission(referredTgId: string, commissionUsd: number) {
  await initDb();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT referrerTgId, earnedUsd FROM referrals WHERE referredTgId = ?',
    args: [String(referredTgId)],
  });
  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  const referrerTgId = String(row.referrerTgId);

  await db.execute({
    sql: 'UPDATE referrals SET earnedUsd = earnedUsd + ? WHERE referredTgId = ?',
    args: [commissionUsd, String(referredTgId)],
  });

  return { referrerTgId, amountUsd: commissionUsd };
}

export async function getReferralStats(referrerTgId: string) {
  await initDb();
  const db = getDbClient();
  const refTgIdStr = String(referrerTgId);

  const refsRes = await db.execute({
    sql: 'SELECT * FROM referrals WHERE referrerTgId = ? ORDER BY createdAt DESC',
    args: [refTgIdStr],
  });

  const withdrawalsRes = await db.execute({
    sql: 'SELECT * FROM withdrawals WHERE tgId = ? ORDER BY createdAt DESC',
    args: [refTgIdStr],
  });

  const referralsList = refsRes.rows.map((r) => ({
    id: String(r.id),
    referrerTgId: String(r.referrerTgId),
    referredTgId: String(r.referredTgId),
    referredName: String(r.referredName || ''),
    referredUsername: String(r.referredUsername || ''),
    joinedAt: String(r.joinedAt || ''),
    plan: String(r.plan || 'community'),
    earnedUsd: Number(r.earnedUsd || 0),
  }));

  const withdrawalsList = withdrawalsRes.rows.map((w) => ({
    id: String(w.id),
    tgId: String(w.tgId),
    userName: String(w.userName || ''),
    userUsername: String(w.userUsername || ''),
    amountUsd: Number(w.amountUsd || 0),
    network: String(w.network),
    walletAddress: String(w.walletAddress),
    requestedAt: String(w.requestedAt || ''),
    status: String(w.status || 'PENDING'),
    txHash: w.txHash ? String(w.txHash) : undefined,
    note: w.note ? String(w.note) : undefined,
  }));

  const totalEarned = referralsList.reduce((acc, r) => acc + (r.earnedUsd || 0), 0);
  const totalPaidOut = withdrawalsList
    .filter((w) => w.status === 'PAID')
    .reduce((acc, w) => acc + (w.amountUsd || 0), 0);
  const pendingPayouts = withdrawalsList
    .filter((w) => w.status === 'PENDING')
    .reduce((acc, w) => acc + (w.amountUsd || 0), 0);

  const availableBalance = Math.max(0, totalEarned - totalPaidOut - pendingPayouts);

  return {
    totalReferrals: referralsList.length,
    activePlansCount: referralsList.filter((r) => r.plan !== 'community').length,
    availableBalance,
    totalEarned,
    totalWithdrawn: totalPaidOut,
    pendingWithdrawal: pendingPayouts,
    referralsList,
    withdrawalsList,
  };
}

export async function createWithdrawal(req: {
  tgId: string;
  userName?: string;
  userUsername?: string;
  amountUsd: number;
  network: string;
  walletAddress: string;
}) {
  await initDb();
  const db = getDbClient();
  const id = `wd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO withdrawals (id, tgId, userName, userUsername, amountUsd, network, walletAddress, requestedAt, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    args: [
      id,
      String(req.tgId),
      req.userName || 'User',
      req.userUsername || '',
      req.amountUsd,
      req.network,
      req.walletAddress,
      now,
    ],
  });

  return { id, requestedAt: now, status: 'PENDING', ...req };
}

export async function listWithdrawals() {
  await initDb();
  const db = getDbClient();
  const res = await db.execute('SELECT * FROM withdrawals ORDER BY createdAt DESC LIMIT 200');
  return res.rows.map((w) => ({
    id: String(w.id),
    tgId: String(w.tgId),
    userName: String(w.userName || ''),
    userUsername: String(w.userUsername || ''),
    amountUsd: Number(w.amountUsd || 0),
    network: String(w.network),
    walletAddress: String(w.walletAddress),
    requestedAt: String(w.requestedAt || ''),
    status: String(w.status || 'PENDING'),
    txHash: w.txHash ? String(w.txHash) : undefined,
    note: w.note ? String(w.note) : undefined,
  }));
}

export async function updateWithdrawalStatus(id: string, status: 'PAID' | 'REJECTED', txHash?: string, note?: string) {
  await initDb();
  const db = getDbClient();
  await db.execute({
    sql: `UPDATE withdrawals SET status = ?, txHash = ?, note = ? WHERE id = ?`,
    args: [status, txHash || null, note || null, String(id)],
  });
}
