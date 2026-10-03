import { Bot, InlineKeyboard } from 'grammy';
import {
  getUser,
  upsertUser,
  setUserLang,
  getAddresses,
  saveAddresses,
  listUsers,
  listExtractions,
  bindReferral,
  getPricingSettings,
} from '../lib/db';
import { botMessages, getBotMsg } from './messages';

const BOT_TOKEN = (process.env.BOT_TOKEN || '8882805957:AAH1YKIQqNry-vLmJvJDJ-WG49tf4J5hVdQ').trim();
const ADMIN_ID = (process.env.ADMIN_USER_ID || process.env.ADMIN_TG_ID || '8515329556').trim();
const WEB_APP_URL = process.env.WEBAPP_URL || `https://${process.env.VERCEL_URL || "bock-hunt.vercel.app"}`;

export const bot = new Bot(BOT_TOKEN, {
  botInfo: {
    id: 8882805957,
    is_bot: true,
    first_name: 'BlockHunt Protocol',
    username: 'Block_huntbot',
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
    supports_guest_queries: false,
    can_connect_to_business: false,
    has_main_web_app: false,
    has_topics_enabled: false,
    allows_users_to_create_topics: false,
    can_manage_bots: false,
    supports_join_request_queries: false,
  },
});

// Middleware to log updates
bot.use(async (ctx, next) => {
  console.log(`[Bot] Incoming update from ${ctx.from?.id}: ${ctx.message?.text || 'callback/other'}`);
  await next();
});

function getAppKeyboard(lang: string, isAdmin: boolean) {
  const isRu = lang === 'ru';
  const launchText = isRu
    ? (isAdmin ? '⚡ Запустить Protocol (Режим Admin)' : '⚡ Запустить BlockHunt Protocol')
    : (isAdmin ? '⚡ Launch Protocol (Admin Mode)' : '⚡ Launch BlockHunt Protocol');
  const langText = isRu ? '🇬🇧 Switch to English' : '🇷🇺 Переключить на Русский';

  return new InlineKeyboard()
    .webApp(launchText, WEB_APP_URL)
    .row()
    .text(langText, 'switch_lang');
}

// /start command
bot.command('start', async (ctx) => {
  try {
    const from = ctx.from;
    if (!from) return;

    const tgId = String(from.id);
    const isAdmin = tgId === String(ADMIN_ID);
    const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'User';
    const uName = from.username ? `@${from.username}` : '';
    const initialLang = (from.language_code || '').startsWith('ru') ? 'ru' : 'en';

    // Check if user already exists
    const existing = await getUser(tgId);
    const lang = existing?.lang || initialLang;

    // Upsert user in database
    await upsertUser({
      tgId,
      name: fullName,
      username: uName,
      lang,
    });

    // Check deep-link referral: /start ref_12345 or /start 12345
    const match = ctx.match;
    if (match && !existing) {
      const refId = String(match).replace(/^ref_/, '').trim();
      if (refId && /^\d+$/.test(refId) && refId !== tgId) {
        await bindReferral({
          referrerTgId: refId,
          referredTgId: tgId,
          referredName: fullName,
          referredUsername: uName,
        });
        console.log(`[Bot] Bound referral: ${tgId} -> referrer ${refId}`);
      }
    }

    if (!existing && !isAdmin) {
      // Notify admin of new user
      await notifyAdmin(
        getBotMsg('en', 'newUserAlert', {
          userName: fullName,
          userId: tgId,
          userUname: uName,
        })
      );
    }

    const welcomeMsg = isAdmin
      ? getBotMsg(lang, 'welcomeAdmin')
      : getBotMsg(lang, 'welcomeUser');

    await ctx.reply(welcomeMsg, {
      parse_mode: 'HTML',
      reply_markup: getAppKeyboard(lang, isAdmin),
    });
  } catch (err: any) {
    console.error('[Bot] /start error:', err?.message || err);
  }
});

// /lang command
bot.command('lang', async (ctx) => {
  try {
    const tgId = String(ctx.from?.id);
    const user = await getUser(tgId);
    const currentLang = user?.lang || 'en';
    const nextLang = currentLang === 'ru' ? 'en' : 'ru';

    await setUserLang(tgId, nextLang);
    const isAdmin = tgId === String(ADMIN_ID);

    await ctx.reply(getBotMsg(nextLang, 'langSwitched'), {
      reply_markup: getAppKeyboard(nextLang, isAdmin),
    });
  } catch (err: any) {
    console.error('[Bot] /lang error:', err?.message || err);
  }
});

// Callback query: switch_lang button
bot.callbackQuery('switch_lang', async (ctx) => {
  try {
    const tgId = String(ctx.from.id);
    const user = await getUser(tgId);
    const currentLang = user?.lang || 'en';
    const nextLang = currentLang === 'ru' ? 'en' : 'ru';

    await setUserLang(tgId, nextLang);
    const isAdmin = tgId === String(ADMIN_ID);

    await ctx.answerCallbackQuery({
      text: nextLang === 'ru' ? 'Язык: Русский' : 'Language: English',
    });

    const welcomeMsg = isAdmin
      ? getBotMsg(nextLang, 'welcomeAdmin')
      : getBotMsg(nextLang, 'welcomeUser');

    await ctx.editMessageText(welcomeMsg, {
      parse_mode: 'HTML',
      reply_markup: getAppKeyboard(nextLang, isAdmin),
    });
  } catch (err: any) {
    console.error('[Bot] switch_lang callback error:', err?.message || err);
  }
});

// Admin command: /wallets
bot.command('wallets', async (ctx) => {
  try {
    const tgId = String(ctx.from?.id);
    if (tgId !== String(ADMIN_ID)) {
      return ctx.reply('⛔ Access denied');
    }
    const addrs = await getAddresses();
    await ctx.reply(getBotMsg('en', 'walletsList', addrs), {
      parse_mode: 'HTML',
    });
  } catch (err: any) {
    console.error('[Bot] /wallets error:', err?.message || err);
  }
});

// Admin command: /settron
bot.command('settron', async (ctx) => {
  try {
    const tgId = String(ctx.from?.id);
    if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
    const newAddr = ctx.match?.trim();
    if (!newAddr || !newAddr.startsWith('T') || newAddr.length < 30) {
      return ctx.reply('❌ Invalid TRON address format. Usage: /settron <address>');
    }
    const current = await getAddresses();
    current.TRON = newAddr;
    await saveAddresses(current);
    await ctx.reply(`✅ TRON address updated to:\n<code>${newAddr}</code>`, { parse_mode: 'HTML' });
  } catch (err: any) {
    console.error('[Bot] /settron error:', err?.message || err);
  }
});

// Admin command: /seteth
bot.command('seteth', async (ctx) => {
  try {
    const tgId = String(ctx.from?.id);
    if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
    const newAddr = ctx.match?.trim();
    if (!newAddr || !newAddr.startsWith('0x') || newAddr.length !== 42) {
      return ctx.reply('❌ Invalid Ethereum address format. Usage: /seteth <0x...>');
    }
    const current = await getAddresses();
    current.ETHEREUM = newAddr;
    await saveAddresses(current);
    await ctx.reply(`✅ Ethereum address updated to:\n<code>${newAddr}</code>`, { parse_mode: 'HTML' });
  } catch (err: any) {
    console.error('[Bot] /seteth error:', err?.message || err);
  }
});

// Admin command: /setsol
bot.command('setsol', async (ctx) => {
  try {
    const tgId = String(ctx.from?.id);
    if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
    const newAddr = ctx.match?.trim();
    if (!newAddr || newAddr.length < 32 || newAddr.length > 44) {
      return ctx.reply('❌ Invalid Solana address format. Usage: /setsol <address>');
    }
    const current = await getAddresses();
    current.SOLANA = newAddr;
    await saveAddresses(current);
    await ctx.reply(`✅ Solana address updated to:\n<code>${newAddr}</code>`, { parse_mode: 'HTML' });
  } catch (err: any) {
    console.error('[Bot] /setsol error:', err?.message || err);
  }
});

// Admin command: /stats
bot.command('stats', async (ctx) => {
  try {
    const tgId = String(ctx.from?.id);
    if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');

    const users = await listUsers();
    const extractions = await listExtractions();
    const paidCount = users.filter((u) => u.plan !== 'community').length;
    const totalVolume = users.reduce((acc, u) => acc + (u.totalExtractedUsd || 0), 0);

    const statsMsg =
      `📊 <b>System Telemetry & Statistics</b>\n\n` +
      `👥 <b>Total Operatives:</b> ${users.length}\n` +
      `💎 <b>Paid Compute Tiers:</b> ${paidCount}\n` +
      `🎯 <b>Total Matches Recorded:</b> ${extractions.length}\n` +
      `💰 <b>Aggregated Extraction Volume:</b> $${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;

    await ctx.reply(statsMsg, { parse_mode: 'HTML' });
  } catch (err: any) {
    console.error('[Bot] /stats error:', err?.message || err);
  }
});

// Admin command: /broadcast
bot.command('broadcast', async (ctx) => {
  try {
    const tgId = String(ctx.from?.id);
    if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');

    const text = ctx.match?.trim();
    if (!text) return ctx.reply('Usage: /broadcast <message>');

    const users = await listUsers();
    let sent = 0;
    for (const u of users) {
      try {
        await bot.api.sendMessage(u.tgId, text, { parse_mode: 'HTML' });
        sent++;
        await new Promise((r) => setTimeout(r, 60)); // prevent Telegram rate limit
      } catch {}
    }
    await ctx.reply(`📢 Broadcast sent to ${sent}/${users.length} users.`);
  } catch (err: any) {
    console.error('[Bot] /broadcast error:', err?.message || err);
  }
});

// External Notifications
export async function sendTelegramMessage(chatId: string | number, text: string, options: any = {}) {
  try {
    return await bot.api.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      ...options,
    });
  } catch (err: any) {
    console.error(`[Bot] Failed to send message to ${chatId}:`, err?.message || err);
    return null;
  }
}

export async function notifyAdmin(text: string) {
  return sendTelegramMessage(ADMIN_ID, text);
}

export async function notifyUserWalletFound(tgId: string, details: any, explicitLang?: string) {
  let lang = explicitLang;
  if (!lang) {
    const user = await getUser(tgId);
    lang = user?.lang || 'en';
  }
  const text = getBotMsg(lang, 'walletFound', details);
  const launchButton = new InlineKeyboard().webApp('🦈 Open Mini App', WEB_APP_URL);
  return sendTelegramMessage(tgId, text, { reply_markup: launchButton });
}

export async function notifyPaymentSuccess(tgId: string, details: any, explicitLang?: string) {
  let lang = explicitLang;
  if (!lang) {
    const user = await getUser(tgId);
    lang = user?.lang || 'en';
  }
  const text = getBotMsg(lang, 'txSuccess', details);
  const launchButton = new InlineKeyboard().webApp('⚡ Launch Console', WEB_APP_URL);
  return sendTelegramMessage(tgId, text, { reply_markup: launchButton });
}

export async function notifyPaymentFailed(tgId: string, error: string, explicitLang?: string) {
  let lang = explicitLang;
  if (!lang) {
    const user = await getUser(tgId);
    lang = user?.lang || 'en';
  }
  const text = getBotMsg(lang, 'txFailed', { error });
  return sendTelegramMessage(tgId, text);
}
