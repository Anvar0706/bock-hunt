import { createClient, type Client } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

// Singleton client across serverless invocations
declare global {
  var _libsqlClient: Client | undefined;
  var _dbInitialized: Promise<boolean> | undefined;
}

export function getDbClient(): Client {
  if (!globalThis._libsqlClient) {
    const rawUrl =
      process.env.TURSO_DATABASE_URL ||
      process.env.DATABASE_URL ||
      'file:./data/database.sqlite';
    const dbUrl = rawUrl.trim();

    const rawToken =
      process.env.TURSO_AUTH_TOKEN ||
      process.env.DATABASE_AUTH_TOKEN;
    const authToken = rawToken ? rawToken.trim() : undefined;

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

    console.log('[DB] Initializing client with:', dbUrl.startsWith('libsql://') ? 'Turso Cloud' : dbUrl);

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

const ADMIN_ID = process.env.ADMIN_USER_ID || process.env.ADMIN_TG_ID || '8515329556';

export async function initDb(): Promise<boolean> {
  if (globalThis._dbInitialized) {
    return globalThis._dbInitialized;
  }

  // Cloud database cluster is already fully provisioned; resolve immediately to save ~1200ms latency
  globalThis._dbInitialized = Promise.resolve(true);
  return true;
}

export async function runFullSchemaInit(): Promise<boolean> {
  const db = getDbClient();
  try {
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
        `CREATE TABLE IF NOT EXISTS audit_log (
          id TEXT PRIMARY KEY,
          adminTgId TEXT NOT NULL,
          action TEXT NOT NULL,
          targetTgId TEXT,
          details TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS payment_intents (
          id TEXT PRIMARY KEY,
          tgId TEXT NOT NULL,
          plan TEXT NOT NULL,
          cycle TEXT NOT NULL,
          network TEXT NOT NULL,
          depositAddress TEXT NOT NULL,
          baseUsd REAL NOT NULL,
          expectedUsd REAL NOT NULL,
          expectedNative REAL NOT NULL,
          nativeSymbol TEXT NOT NULL,
          stableSymbol TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING',
          txHash TEXT,
          createdAt INTEGER NOT NULL,
          expiresAt INTEGER NOT NULL
        );`,
        `CREATE INDEX IF NOT EXISTS idx_users_tgId ON users(tgId);`,
        `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`,
        `CREATE INDEX IF NOT EXISTS idx_extractions_tgId ON extractions(tgId);`,
        `CREATE INDEX IF NOT EXISTS idx_referrals_referrerTgId ON referrals(referrerTgId);`,
        `CREATE INDEX IF NOT EXISTS idx_referrals_referredTgId ON referrals(referredTgId);`,
        `CREATE INDEX IF NOT EXISTS idx_withdrawals_tgId ON withdrawals(tgId);`,
        `CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);`,
        `CREATE INDEX IF NOT EXISTS idx_audit_log_adminTgId ON audit_log(adminTgId);`,
        `CREATE INDEX IF NOT EXISTS idx_payment_intents_tgId ON payment_intents(tgId);`,
        `CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status, network);`,
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
    } catch (batchErr: any) {
      console.error('[DB] Schema creation error:', batchErr?.message || batchErr);
      throw batchErr;
    }
}

export async function checkDbHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await initDb();
    const db = getDbClient();
    await db.execute('SELECT 1');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    globalThis._dbInitialized = undefined;
    return { ok: false, latencyMs: Date.now() - start, error: err?.message || String(err) };
  }
}

// User Helpers
export async function getUser(tgId: string) {
  await initDb();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT id, tgId, name, username, plan, extractsCount, totalExtractedUsd, status, joinedAt, lastActive, lang, limitResetAt FROM users WHERE tgId = ?',
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
  const isOwner = tgIdStr === String(ADMIN_ID);
  const now = new Date().toISOString();
  const defaultPlan = isOwner ? 'enterprise' : 'community';

  const res = await db.execute({
    sql: `INSERT INTO users (id, tgId, name, username, plan, extractsCount, totalExtractedUsd, status, joinedAt, lastActive, lang)
          VALUES (?, ?, ?, ?, ?, 0, 0, 'ACTIVE', ?, ?, ?)
          ON CONFLICT(tgId) DO UPDATE SET
            name = CASE WHEN excluded.name != '' THEN excluded.name ELSE users.name END,
            username = CASE WHEN excluded.username != '' THEN excluded.username ELSE users.username END,
            lang = COALESCE(excluded.lang, users.lang),
            lastActive = excluded.lastActive
          RETURNING id, tgId, name, username, plan, extractsCount, totalExtractedUsd, status, joinedAt, lastActive, lang, limitResetAt;`,
    args: [
      `user-${tgIdStr}`,
      tgIdStr,
      user.name || 'User',
      user.username || '',
      defaultPlan,
      now,
      now,
      user.lang || 'en',
    ],
  });

  const row = res.rows[0];
  return {
    id: String(row.id),
    tgId: String(row.tgId),
    name: String(row.name),
    username: String(row.username || ''),
    plan: String(row.plan || defaultPlan),
    extractsCount: Number(row.extractsCount || 0),
    totalExtractedUsd: Number(row.totalExtractedUsd || 0),
    status: String(row.status || 'ACTIVE'),
    joinedAt: String(row.joinedAt || now),
    lastActive: String(row.lastActive || now),
    lang: String(row.lang || 'en'),
    limitResetAt: row.limitResetAt ? String(row.limitResetAt) : undefined,
  };
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

const ALLOWED_USER_UPDATE_FIELDS = new Set([
  'name',
  'username',
  'plan',
  'extractsCount',
  'totalExtractedUsd',
  'status',
  'lang',
  'limitResetAt',
]);

export async function updateUser(tgId: string, fields: Record<string, any>) {
  await initDb();
  const db = getDbClient();
  const keys = Object.keys(fields).filter((k) => ALLOWED_USER_UPDATE_FIELDS.has(k));
  if (keys.length === 0) return;

  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => fields[k]);
  values.push(String(tgId));

  await db.execute({
    sql: `UPDATE users SET ${setClause} WHERE tgId = ?`,
    args: values,
  });

  if (fields.plan) {
    await db.execute({
      sql: 'UPDATE referrals SET plan = ? WHERE referredTgId = ?',
      args: [String(fields.plan), String(tgId)],
    }).catch(() => {});
  }
}

export async function listUsers() {
  await initDb();
  const db = getDbClient();
  const res = await db.execute('SELECT id, tgId, name, username, plan, extractsCount, totalExtractedUsd, status, joinedAt, lastActive, lang, limitResetAt FROM users ORDER BY createdAt DESC');
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

export async function logAudit(adminTgId: string, action: string, targetTgId?: string, details?: any) {
  try {
    await initDb();
    const db = getDbClient();
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;
    await db.execute({
      sql: `INSERT INTO audit_log (id, adminTgId, action, targetTgId, details) VALUES (?, ?, ?, ?, ?)`,
      args: [String(id), String(adminTgId), String(action), targetTgId ? String(targetTgId) : null, detailsStr],
    });
  } catch (err) {
    console.error('[DB] logAudit error:', err);
  }
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
  const isOwner = String(ext.tgId) === String(ADMIN_ID).trim();

  // Atomically enforce non-blocked status and Community 1/1 limit before recording extraction
  const claimRes = await db.execute({
    sql: `UPDATE users
          SET extractsCount = extractsCount + 1,
              totalExtractedUsd = totalExtractedUsd + ?,
              lastActive = ?
          WHERE tgId = ?
            AND status NOT IN ('BLOCKED', 'RESTRICTED')
            AND (? = 1 OR plan != 'community' OR extractsCount < 1)
          RETURNING extractsCount, plan`,
    args: [ext.balanceUsd || 0, timestamp, String(ext.tgId), isOwner ? 1 : 0],
  });

  if (claimRes.rows.length === 0) {
    return null;
  }

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
}): Promise<boolean> {
  await initDb();
  const db = getDbClient();
  const clean = hash.trim().toLowerCase();
  try {
    await db.execute({
      sql: `INSERT INTO used_hashes (hash, plan, cycle, network, amountUsd, timestamp, date)
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
    return true;
  } catch (err) {
    console.warn('[DB] Duplicate hash redemption prevented:', hash, err);
    return false;
  }
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
  const refTgIdStr = String(referrerTgId).trim();

  // Remove ORDER BY to prevent LibSQL remote index scan dropping rows
  const refsRes = await db.execute({
    sql: 'SELECT * FROM referrals WHERE referrerTgId = ?',
    args: [refTgIdStr],
  });

  const withdrawalsRes = await db.execute({
    sql: 'SELECT * FROM withdrawals WHERE tgId = ?',
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
  })).sort((a, b) => new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime());

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
  })).sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());

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

export interface PaymentIntentRecord {
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
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED';
  txHash?: string;
  createdAt: number;
  expiresAt: number;
}

let paymentIntentsReadyPromise: Promise<void> | null = null;

export async function ensurePaymentIntentsTable(): Promise<void> {
  if (!paymentIntentsReadyPromise) {
    paymentIntentsReadyPromise = (async () => {
      const db = getDbClient();
      await db.batch([
        `CREATE TABLE IF NOT EXISTS payment_intents (
          id TEXT PRIMARY KEY,
          tgId TEXT NOT NULL,
          plan TEXT NOT NULL,
          cycle TEXT NOT NULL,
          network TEXT NOT NULL,
          depositAddress TEXT NOT NULL,
          baseUsd REAL NOT NULL,
          expectedUsd REAL NOT NULL,
          expectedNative REAL NOT NULL,
          nativeSymbol TEXT NOT NULL,
          stableSymbol TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING',
          txHash TEXT,
          createdAt INTEGER NOT NULL,
          expiresAt INTEGER NOT NULL
        );`,
        `CREATE INDEX IF NOT EXISTS idx_payment_intents_tgId ON payment_intents(tgId);`,
        `CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status, network);`,
      ], 'write').catch(() => {});
    })();
  }
  await paymentIntentsReadyPromise;
}

function mapIntentRow(r: any): PaymentIntentRecord {
  return {
    id: String(r.id),
    tgId: String(r.tgId),
    plan: String(r.plan),
    cycle: String(r.cycle),
    network: String(r.network),
    depositAddress: String(r.depositAddress),
    baseUsd: Number(r.baseUsd),
    expectedUsd: Number(r.expectedUsd),
    expectedNative: Number(r.expectedNative),
    nativeSymbol: String(r.nativeSymbol),
    stableSymbol: String(r.stableSymbol),
    status: (String(r.status || 'PENDING') as PaymentIntentRecord['status']),
    txHash: r.txHash ? String(r.txHash) : undefined,
    createdAt: Number(r.createdAt),
    expiresAt: Number(r.expiresAt),
  };
}

export async function getPaymentIntentById(id: string): Promise<PaymentIntentRecord | null> {
  await ensurePaymentIntentsTable();
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT * FROM payment_intents WHERE id = ?',
    args: [String(id)],
  });
  return res.rows.length > 0 ? mapIntentRow(res.rows[0]) : null;
}

export async function listActivePendingIntents(network?: string): Promise<PaymentIntentRecord[]> {
  await ensurePaymentIntentsTable();
  const db = getDbClient();
  const now = Date.now();
  const res = network
    ? await db.execute({
        sql: "SELECT * FROM payment_intents WHERE status = 'PENDING' AND network = ? AND expiresAt > ? ORDER BY createdAt DESC",
        args: [String(network), now],
      })
    : await db.execute({
        sql: "SELECT * FROM payment_intents WHERE status = 'PENDING' AND expiresAt > ? ORDER BY createdAt DESC",
        args: [now],
      });
  return res.rows.map(mapIntentRow);
}

export async function createOrReusePaymentIntent(params: {
  tgId: string;
  plan: string;
  cycle: string;
  network: string;
  depositAddress: string;
  baseUsd: number;
  nativePriceUsd: number;
  nativeSymbol: string;
  stableSymbol: string;
}): Promise<PaymentIntentRecord> {
  await ensurePaymentIntentsTable();
  const db = getDbClient();
  const now = Date.now();
  const INTENT_TTL_MS = 45 * 60 * 1000;

  // Expire stale pending intents in background
  await db.execute({
    sql: "UPDATE payment_intents SET status = 'EXPIRED' WHERE status = 'PENDING' AND expiresAt <= ?",
    args: [now],
  }).catch(() => {});

  // Reuse an active pending intent for the same user + config if still fresh (>5 min remaining)
  const existingRes = await db.execute({
    sql: `SELECT * FROM payment_intents
          WHERE tgId = ? AND plan = ? AND cycle = ? AND network = ? AND depositAddress = ? AND baseUsd = ? AND status = 'PENDING' AND expiresAt > ?
          ORDER BY createdAt DESC LIMIT 1`,
    args: [
      String(params.tgId),
      params.plan,
      params.cycle,
      params.network,
      params.depositAddress,
      params.baseUsd,
      now + 5 * 60 * 1000,
    ],
  });

  if (existingRes.rows.length > 0) {
    return mapIntentRow(existingRes.rows[0]);
  }

  // Pick a unique micro-cent offset not colliding with other active pending intents on this network
  const activeOnNet = await listActivePendingIntents(params.network);
  const decimals = params.network === 'ETHEREUM' ? 5 : params.network === 'SOLANA' ? 4 : 2;
  const price = params.nativePriceUsd > 0 ? params.nativePriceUsd : 1;

  // Generate randomized unique cent candidates (0.04 to 0.96, then 1.04 to 2.96 if busy)
  const pool: number[] = [];
  for (let c = 4; c <= 96; c += 2) pool.push(c / 100);
  // Shuffle pool slightly for unpredictability
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let c = 104; c <= 296; c += 3) pool.push(c / 100);

  let chosenUsd = Number((params.baseUsd + 0.07).toFixed(2));
  let chosenNative = Number((chosenUsd / price).toFixed(decimals));

  for (const offset of pool) {
    const candUsd = Number((params.baseUsd + offset).toFixed(2));
    const candNative = Number((candUsd / price).toFixed(decimals));
    const collision = activeOnNet.some(
      (i) =>
        Math.abs(i.expectedUsd - candUsd) < 0.06 ||
        (candNative > 0 && Math.abs(i.expectedNative - candNative) / candNative < 0.006)
    );
    if (!collision) {
      chosenUsd = candUsd;
      chosenNative = candNative;
      break;
    }
  }

  const intent: PaymentIntentRecord = {
    id: `inv-${now}-${Math.random().toString(36).slice(2, 7)}`,
    tgId: String(params.tgId),
    plan: params.plan,
    cycle: params.cycle,
    network: params.network,
    depositAddress: params.depositAddress,
    baseUsd: params.baseUsd,
    expectedUsd: chosenUsd,
    expectedNative: chosenNative,
    nativeSymbol: params.nativeSymbol,
    stableSymbol: params.stableSymbol,
    status: 'PENDING',
    createdAt: now,
    expiresAt: now + INTENT_TTL_MS,
  };

  await db.execute({
    sql: `INSERT INTO payment_intents
          (id, tgId, plan, cycle, network, depositAddress, baseUsd, expectedUsd, expectedNative, nativeSymbol, stableSymbol, status, createdAt, expiresAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
    args: [
      intent.id,
      intent.tgId,
      intent.plan,
      intent.cycle,
      intent.network,
      intent.depositAddress,
      intent.baseUsd,
      intent.expectedUsd,
      intent.expectedNative,
      intent.nativeSymbol,
      intent.stableSymbol,
      intent.createdAt,
      intent.expiresAt,
    ],
  });

  return intent;
}

export async function completePaymentIntent(id: string, txHash: string): Promise<PaymentIntentRecord | null> {
  await ensurePaymentIntentsTable();
  const db = getDbClient();
  const res = await db.execute({
    sql: `UPDATE payment_intents
          SET status = 'COMPLETED', txHash = ?
          WHERE id = ? AND status = 'PENDING'
          RETURNING *`,
    args: [String(txHash), String(id)],
  });
  return res.rows.length > 0 ? mapIntentRow(res.rows[0]) : null;
}

export async function freshRestartNonAdminData(adminTgId = '8515329556') {
  await initDb();
  await ensurePaymentIntentsTable();
  const db = getDbClient();
  try {
    await db.batch([
      'DELETE FROM extractions;',
      'DELETE FROM referrals;',
      'DELETE FROM withdrawals;',
      'DELETE FROM used_hashes;',
      'DELETE FROM payment_intents;',
      'DELETE FROM audit_log;',
      {
        sql: 'DELETE FROM users WHERE tgId != ?;',
        args: [String(adminTgId)],
      },
      {
        sql: 'UPDATE users SET extractsCount = 0, totalExtractedUsd = 0 WHERE tgId = ?;',
        args: [String(adminTgId)],
      },
    ], 'write');
  } catch (err) {
    console.error('[DB] freshRestart batch error:', err);
  }

  try {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (fs.existsSync(dataDir)) {
      fs.writeFileSync(path.join(dataDir, 'extractions.json'), '[]\n', 'utf-8');
      fs.writeFileSync(path.join(dataDir, 'used_hashes.json'), '[]\n', 'utf-8');
      fs.writeFileSync(
        path.join(dataDir, 'referrals.json'),
        JSON.stringify({ referrals: [], balances: {}, withdrawals: [] }, null, 2) + '\n',
        'utf-8'
      );
    }
  } catch {}

  return { ok: true, message: 'All non-admin user data wiped. Admin settings preserved.' };
}
