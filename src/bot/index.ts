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
  savePricingSettings,
  updateUser,
  deleteUser,
  resetUserLimit,
  resetAllLimits,
  listWithdrawals,
  updateWithdrawalStatus,
  logAudit,
} from '../lib/db';
import { botMessages, getBotMsg } from './messages';

const BOT_TOKEN = (process.env.BOT_TOKEN || '8882805957:AAH1YKIQqNry-vLmJvJDJ-WG49tf4J5hVdQ').trim();
const ADMIN_ID = (process.env.ADMIN_USER_ID || process.env.ADMIN_TG_ID || '8515329556').trim();
const WEB_APP_URL = (process.env.WEBAPP_URL || 'https://bock-hunt.vercel.app').trim();

export const bot = new Bot(BOT_TOKEN, {
  client: {
    canUseWebhookReply: () => false,
  },
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

  const kb = new InlineKeyboard()
    .webApp(launchText, WEB_APP_URL)
    .row();

  if (isAdmin) {
    kb.text(isRu ? '🛡️ Панель Администратора' : '🛡️ Admin Command Center', 'admin_menu').row();
  }

  kb.text(langText, 'switch_lang');
  return kb;
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

// --- ADMIN DASHBOARD & TELEGRAM IN-BOT MANAGEMENT ---

async function sendAdminDashboard(ctx: any, isEdit = false) {
  try {
    const users = await listUsers();
    const extractions = await listExtractions();
    const withdrawals = await listWithdrawals();

    const paidCount = users.filter((u) => u.plan !== 'community').length;
    const totalVolume = users.reduce((acc, u) => acc + (u.totalExtractedUsd || 0), 0);
    const pendingWdr = withdrawals.filter((w) => w.status === 'PENDING');
    const pendingAmount = pendingWdr.reduce((acc, w) => acc + (w.amountUsd || 0), 0);

    const text =
      `🛡️ <b>BlockHunt Protocol — Admin Command Center</b>\n\n` +
      `👥 <b>Total Operatives:</b> ${users.length} (💎 Paid: ${paidCount})\n` +
      `💰 <b>Aggregated Volume:</b> $${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
      `💸 <b>Pending Payouts:</b> ${pendingWdr.length} ($${pendingAmount.toFixed(2)})\n` +
      `🎯 <b>Total Matches:</b> ${extractions.length}\n\n` +
      `<i>Select an administrative sector to manage:</i>`;

    const kb = new InlineKeyboard()
      .text(`👥 Operatives (${users.length})`, 'admin_users')
      .text(`💸 Payouts (${pendingWdr.length})`, 'admin_withdrawals')
      .row()
      .text('💳 Deposit Wallets', 'admin_wallets')
      .text('🏷️ Pricing & Promos', 'admin_pricing')
      .row()
      .text('📢 Broadcast & DM', 'admin_broadcast_help')
      .text('📊 System Telemetry', 'admin_stats')
      .row()
      .webApp('🦈 Launch WebApp Admin Console', `${WEB_APP_URL}/admin`);

    if (isEdit) {
      try {
        await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
        return;
      } catch {}
    }
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch (err: any) {
    console.error('[Bot] sendAdminDashboard error:', err);
  }
}

// /admin command
bot.command('admin', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied: Administrator privileges required.');
  await sendAdminDashboard(ctx);
});

// Callback: Return to main admin menu
bot.callbackQuery('admin_menu', async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  await ctx.answerCallbackQuery();
  await sendAdminDashboard(ctx, true);
});

// Callback: View Operatives list
bot.callbackQuery('admin_users', async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  await ctx.answerCallbackQuery();

  const users = await listUsers();
  let text = `👥 <b>Operatives Management (${users.length} total)</b>\n\n`;

  const topUsers = users.slice(0, 8);
  for (const u of topUsers) {
    const isOwner = String(u.tgId) === String(ADMIN_ID);
    const badge = isOwner ? '👑' : u.plan === 'enterprise' ? '🚀' : u.plan === 'pro' ? '💎' : '🌱';
    const statusIcon = u.status === 'BLOCKED' ? '⛔ BLOCKED' : '✅ ACTIVE';
    text += `${badge} <b>${u.name}</b> ${u.username ? `(${u.username})` : ''}\n` +
            `   ID: <code>${u.tgId}</code> | Plan: <b>${u.plan.toUpperCase()}</b>\n` +
            `   Status: ${statusIcon} | Extracts: ${u.extractsCount} | Vol: $${u.totalExtractedUsd.toFixed(2)}\n\n`;
  }

  text += `<b>Quick Admin Commands:</b>\n` +
          `• <code>/user &lt;tgId&gt;</code> — View & manage operative\n` +
          `• <code>/resetlimit &lt;tgId&gt;</code> — Reset extraction limit\n` +
          `• <code>/setplan &lt;tgId&gt; &lt;pro|enterprise|community&gt;</code>\n` +
          `• <code>/block &lt;tgId&gt;</code> | <code>/unblock &lt;tgId&gt;</code>\n` +
          `• <code>/dm &lt;tgId&gt; &lt;message&gt;</code> — Send direct message\n`;

  const kb = new InlineKeyboard()
    .text('🔄 Reset All Free Limits', 'admin_reset_all_limits')
    .row()
    .text('🔙 Back to Admin Menu', 'admin_menu');

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
});

// Callback: Reset all free limits
bot.callbackQuery('admin_reset_all_limits', async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  await resetAllLimits();
  await logAudit(tgId, 'reset_all_limits_from_bot');
  await ctx.answerCallbackQuery({ text: '✅ All free user limits reset to 0/1!' });
  await ctx.reply('✅ <b>All free operatives extraction limits have been reset to 0/1!</b>', { parse_mode: 'HTML' });
});

// Callback: View Pending Payouts
bot.callbackQuery('admin_withdrawals', async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  await ctx.answerCallbackQuery();

  const withdrawals = await listWithdrawals();
  const pending = withdrawals.filter((w) => w.status === 'PENDING');

  let text = '';
  const kb = new InlineKeyboard();

  if (pending.length === 0) {
    text = `💸 <b>Withdrawals & Payouts</b>\n\n✅ <i>No pending withdrawal requests. All referral commissions are up to date!</i>`;
  } else {
    text = `💸 <b>Pending Withdrawal Requests (${pending.length})</b>\n\n`;
    for (const w of pending.slice(0, 4)) {
      text += `🔹 <b>ID:</b> <code>${w.id}</code>\n` +
              `👤 <b>Operative:</b> ${w.userName} (<code>${w.tgId}</code>)\n` +
              `💵 <b>Amount:</b> $${w.amountUsd.toFixed(2)} USD\n` +
              `🌐 <b>Network:</b> ${w.network}\n` +
              `📍 <b>Payout Address:</b>\n<code>${w.walletAddress}</code>\n\n`;

      kb.text(`✅ Pay $${w.amountUsd.toFixed(0)} (${w.id.slice(-4)})`, `pay_wdr:${w.id}`)
        .text(`❌ Reject (${w.id.slice(-4)})`, `rej_wdr:${w.id}`)
        .row();
    }

    text += `<b>Commands:</b>\n` +
            `• <code>/approve &lt;id&gt; [txHash]</code>\n` +
            `• <code>/reject &lt;id&gt; [reason]</code>\n`;
  }

  kb.text('🔙 Back to Admin Menu', 'admin_menu');

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
});

// Callback: Pay / Approve withdrawal
bot.callbackQuery(/^pay_wdr:(.+)$/, async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  const wdrId = ctx.match[1];

  const all = await listWithdrawals();
  const item = all.find((w) => w.id === wdrId);
  if (!item) {
    return ctx.answerCallbackQuery({ text: '❌ Withdrawal not found' });
  }

  await updateWithdrawalStatus(wdrId, 'PAID', 'ApprovedViaTelegramBot', 'Processed by Administrator');
  await logAudit(tgId, 'approve_withdrawal_from_bot', item.tgId, { wdrId, amount: item.amountUsd });

  const user = await getUser(item.tgId);
  const userLang = user?.lang || 'en';
  const msg = getBotMsg(userLang, 'withdrawalApproved', {
    amountUsd: item.amountUsd,
    network: item.network,
    address: item.walletAddress,
    txHash: 'Confirmed',
  });
  sendTelegramMessage(item.tgId, msg).catch(() => {});

  await ctx.answerCallbackQuery({ text: `✅ Payout approved for $${item.amountUsd}!` });
  await ctx.reply(`✅ <b>Payout ID <code>${wdrId}</code> marked PAID!</b>\nOperative <code>${item.tgId}</code> has been notified.`, { parse_mode: 'HTML' });
});

// Callback: Reject withdrawal
bot.callbackQuery(/^rej_wdr:(.+)$/, async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  const wdrId = ctx.match[1];

  const all = await listWithdrawals();
  const item = all.find((w) => w.id === wdrId);
  if (!item) {
    return ctx.answerCallbackQuery({ text: '❌ Withdrawal not found' });
  }

  await updateWithdrawalStatus(wdrId, 'REJECTED', undefined, 'Declined by Administrator');
  await logAudit(tgId, 'reject_withdrawal_from_bot', item.tgId, { wdrId, amount: item.amountUsd });

  const user = await getUser(item.tgId);
  const userLang = user?.lang || 'en';
  const msg = getBotMsg(userLang, 'withdrawalRejected', {
    amountUsd: item.amountUsd,
    reason: 'Declined by security compliance check. Funds refunded to referral balance.',
  });
  sendTelegramMessage(item.tgId, msg).catch(() => {});

  await ctx.answerCallbackQuery({ text: `❌ Payout rejected!` });
  await ctx.reply(`❌ <b>Payout ID <code>${wdrId}</code> rejected and refunded to balance.</b>`, { parse_mode: 'HTML' });
});

// Callback: View Deposit Wallets
bot.callbackQuery('admin_wallets', async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  await ctx.answerCallbackQuery();

  const addrs = await getAddresses();
  const text =
    `💳 <b>Configured Deposit Addresses</b>\n\n` +
    `🔴 <b>TRON (USDT TRC-20):</b>\n<code>${addrs.TRON}</code>\n\n` +
    `🔵 <b>ETHEREUM (ETH/ERC-20):</b>\n<code>${addrs.ETHEREUM}</code>\n\n` +
    `🟣 <b>SOLANA (SOL):</b>\n<code>${addrs.SOLANA}</code>\n\n` +
    `<b>Commands to update:</b>\n` +
    `• <code>/settron &lt;address&gt;</code>\n` +
    `• <code>/seteth &lt;address&gt;</code>\n` +
    `• <code>/setsol &lt;address&gt;</code>\n`;

  const kb = new InlineKeyboard().text('🔙 Back to Admin Menu', 'admin_menu');
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
});

// Callback: View Pricing & Promos
bot.callbackQuery('admin_pricing', async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  await ctx.answerCallbackQuery();

  const pricing = await getPricingSettings();
  const text =
    `🏷️ <b>Software Licensing & Pricing Settings</b>\n\n` +
    `💎 <b>PRO TIER:</b> $${pricing.plans.pro.weekly}/week | $${pricing.plans.pro.monthly}/month\n` +
    `🚀 <b>ENTERPRISE:</b> $${pricing.plans.enterprise.weekly}/week | $${pricing.plans.enterprise.monthly}/month\n\n` +
    `🎁 <b>Discount Promo:</b> ${pricing.discount.enabled ? `✅ ACTIVE (${pricing.discount.percent}% OFF)` : '❌ DISABLED'}\n` +
    `📢 <b>Promo Banner:</b> ${pricing.banner.enabled ? '✅ ACTIVE' : '❌ DISABLED'}\n\n` +
    `<b>Update Pricing:</b>\n` +
    `• <code>/setpricing &lt;proWeekly&gt; &lt;proMonthly&gt;</code>\n`;

  const kb = new InlineKeyboard()
    .text(pricing.discount.enabled ? '❌ Disable 50% Promo' : '✅ Enable 50% Promo', 'admin_toggle_discount')
    .row()
    .text(pricing.banner.enabled ? '❌ Hide Banner' : '✅ Show Banner', 'admin_toggle_banner')
    .row()
    .text('🔙 Back to Admin Menu', 'admin_menu');

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
});

// Callback: Toggle Promo Discount
bot.callbackQuery('admin_toggle_discount', async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  const pricing = await getPricingSettings();
  pricing.discount.enabled = !pricing.discount.enabled;
  await savePricingSettings(pricing);
  await ctx.answerCallbackQuery({ text: `Discount is now ${pricing.discount.enabled ? 'ENABLED' : 'DISABLED'}` });
  await sendAdminDashboard(ctx, true);
});

// Callback: Toggle Promo Banner
bot.callbackQuery('admin_toggle_banner', async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  const pricing = await getPricingSettings();
  pricing.banner.enabled = !pricing.banner.enabled;
  await savePricingSettings(pricing);
  await ctx.answerCallbackQuery({ text: `Banner is now ${pricing.banner.enabled ? 'VISIBLE' : 'HIDDEN'}` });
  await sendAdminDashboard(ctx, true);
});

// Callback: Broadcast Help
bot.callbackQuery('admin_broadcast_help', async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  await ctx.answerCallbackQuery();

  const text =
    `📢 <b>Direct Messaging & Broadcast Center</b>\n\n` +
    `<b>1. Global Broadcast (All Operatives):</b>\n` +
    `<code>/broadcast Your HTML announcement here</code>\n\n` +
    `<b>2. Single Direct Message:</b>\n` +
    `<code>/dm &lt;tgId&gt; Your private message here</code>\n\n` +
    `<i>Supports Telegram HTML formatting (bold, italic, code, links).</i>`;

  const kb = new InlineKeyboard().text('🔙 Back to Admin Menu', 'admin_menu');
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
});

// Callback: System Telemetry / Stats
bot.callbackQuery('admin_stats', async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  await ctx.answerCallbackQuery();

  const users = await listUsers();
  const extractions = await listExtractions();
  const withdrawals = await listWithdrawals();

  const paidCount = users.filter((u) => u.plan !== 'community').length;
  const totalVolume = users.reduce((acc, u) => acc + (u.totalExtractedUsd || 0), 0);
  const paidWithdrawals = withdrawals.filter((w) => w.status === 'PAID');
  const paidOutAmount = paidWithdrawals.reduce((acc, w) => acc + (w.amountUsd || 0), 0);

  const text =
    `📊 <b>System Telemetry & Database Analytics</b>\n\n` +
    `👥 <b>Total Operatives:</b> ${users.length}\n` +
    `💎 <b>Paid Subscriptions:</b> ${paidCount} (${((paidCount / Math.max(users.length, 1)) * 100).toFixed(1)}%)\n` +
    `🎯 <b>Total Successful Extractions:</b> ${extractions.length}\n` +
    `💰 <b>Total Volume Extracted:</b> $${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
    `💸 <b>Total Referral Payouts Completed:</b> $${paidOutAmount.toFixed(2)}\n\n` +
    `⚡ <b>Engine:</b> Next.js 14 + Turso Cloud LibSQL\n` +
    `🛡️ <b>Security:</b> In-Memory Sliding Window Rate Limiting Active\n`;

  const kb = new InlineKeyboard().text('🔙 Back to Admin Menu', 'admin_menu');
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
});

// User action callbacks:
bot.callbackQuery(/^act_reset_lim:(.+)$/, async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  const targetId = ctx.match[1];
  await resetUserLimit(targetId);
  await logAudit(tgId, 'reset_limit_from_bot', targetId);
  await ctx.answerCallbackQuery({ text: `✅ Limit reset for ${targetId}!` });
  await ctx.reply(`✅ <b>Free limit reset to 0/1 for operative <code>${targetId}</code>!</b>`, { parse_mode: 'HTML' });
});

bot.callbackQuery(/^act_setplan:(.+):(.+)$/, async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  const targetId = ctx.match[1];
  const newPlan = ctx.match[2];
  await updateUser(targetId, { plan: newPlan });
  await logAudit(tgId, 'set_plan_from_bot', targetId, { plan: newPlan });
  await ctx.answerCallbackQuery({ text: `Plan set to ${newPlan.toUpperCase()}!` });
  await ctx.reply(`✅ <b>Operative <code>${targetId}</code> plan updated to ${newPlan.toUpperCase()}!</b>`, { parse_mode: 'HTML' });
});

bot.callbackQuery(/^act_toggle_status:(.+)$/, async (ctx) => {
  const tgId = String(ctx.from.id);
  if (tgId !== String(ADMIN_ID)) return ctx.answerCallbackQuery('⛔ Access denied');
  const targetId = ctx.match[1];
  const target = await getUser(targetId);
  const nextStatus = target?.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
  await updateUser(targetId, { status: nextStatus });
  await logAudit(tgId, 'toggle_status_from_bot', targetId, { status: nextStatus });
  await ctx.answerCallbackQuery({ text: `Status: ${nextStatus}` });
  await ctx.reply(`Operative <code>${targetId}</code> status changed to <b>${nextStatus}</b>.`, { parse_mode: 'HTML' });
});

// Admin Command: /user <tgId>
bot.command('user', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');

  const targetId = ctx.match?.trim().replace(/^user-/, '').replace(/^@/, '');
  if (!targetId) {
    return ctx.reply('Usage: /user <telegramId>');
  }

  const u = await getUser(targetId);
  if (!u) {
    return ctx.reply(`❌ Operative with Telegram ID <code>${targetId}</code> not found in database.`, { parse_mode: 'HTML' });
  }

  const isBlocked = u.status === 'BLOCKED' || u.status === 'RESTRICTED';
  const text =
    `👤 <b>Operative Profile</b>\n\n` +
    `• <b>Name:</b> ${u.name}\n` +
    `• <b>Username:</b> ${u.username || 'none'}\n` +
    `• <b>Telegram ID:</b> <code>${u.tgId}</code>\n` +
    `• <b>Current Plan:</b> <b>${u.plan.toUpperCase()}</b>\n` +
    `• <b>Extracts Used:</b> ${u.extractsCount}/1 (Community limit)\n` +
    `• <b>Total Extracted:</b> $${u.totalExtractedUsd.toFixed(2)}\n` +
    `• <b>Status:</b> ${isBlocked ? '⛔ BLOCKED' : '✅ ACTIVE'}\n` +
    `• <b>Language:</b> ${u.lang?.toUpperCase() || 'EN'}\n` +
    `• <b>Last Active:</b> ${u.lastActive ? new Date(u.lastActive).toLocaleString() : 'N/A'}\n`;

  const kb = new InlineKeyboard()
    .text('🔄 Reset Limit (0/1)', `act_reset_lim:${u.tgId}`)
    .text(isBlocked ? '✅ Unblock' : '⛔ Block', `act_toggle_status:${u.tgId}`)
    .row()
    .text('💎 Set PRO', `act_setplan:${u.tgId}:pro`)
    .text('🚀 Set ENTERPRISE', `act_setplan:${u.tgId}:enterprise`)
    .row()
    .text('🌱 Set COMMUNITY', `act_setplan:${u.tgId}:community`)
    .row()
    .text('🔙 Back to Operatives', 'admin_users');

  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
});

// Admin Command: /users
bot.command('users', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
  await sendAdminDashboard(ctx);
});

// Admin Command: /resetlimit <tgId>
bot.command('resetlimit', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
  const targetId = ctx.match?.trim().replace(/^user-/, '');
  if (!targetId) return ctx.reply('Usage: /resetlimit <tgId> (or /resetalllimits)');
  await resetUserLimit(targetId);
  await logAudit(tgId, 'reset_limit_cmd', targetId);
  await ctx.reply(`✅ Extraction limit reset to 0/1 for operative <code>${targetId}</code>.`, { parse_mode: 'HTML' });
});

// Admin Command: /resetalllimits
bot.command('resetalllimits', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
  await resetAllLimits();
  await logAudit(tgId, 'reset_all_limits_cmd');
  await ctx.reply(`✅ <b>All free operatives extraction limits reset to 0/1!</b>`, { parse_mode: 'HTML' });
});

// Admin Command: /resetstats <tgId>
bot.command('resetstats', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
  const targetId = ctx.match?.trim().replace(/^user-/, '');
  if (!targetId) return ctx.reply('Usage: /resetstats <tgId>');
  await updateUser(targetId, { extractsCount: 0, totalExtractedUsd: 0 });
  await logAudit(tgId, 'reset_stats_cmd', targetId);
  await ctx.reply(`✅ Extraction stats reset to $0.00 for operative <code>${targetId}</code>.`, { parse_mode: 'HTML' });
});

// Admin Command: /setplan <tgId> <plan>
bot.command('setplan', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
  const parts = (ctx.match || '').trim().split(/\s+/);
  const targetId = parts[0]?.replace(/^user-/, '');
  const plan = parts[1]?.toLowerCase();
  if (!targetId || !plan || !['community', 'pro', 'enterprise'].includes(plan)) {
    return ctx.reply('Usage: /setplan <tgId> <community|pro|enterprise>');
  }
  await updateUser(targetId, { plan });
  await logAudit(tgId, 'set_plan_cmd', targetId, { plan });
  await ctx.reply(`✅ Plan updated to <b>${plan.toUpperCase()}</b> for operative <code>${targetId}</code>.`, { parse_mode: 'HTML' });
});

// Admin Command: /block <tgId>
bot.command('block', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
  const targetId = ctx.match?.trim().replace(/^user-/, '');
  if (!targetId) return ctx.reply('Usage: /block <tgId>');
  await updateUser(targetId, { status: 'BLOCKED' });
  await logAudit(tgId, 'block_cmd', targetId);
  await ctx.reply(`⛔ Operative <code>${targetId}</code> has been BLOCKED.`, { parse_mode: 'HTML' });
});

// Admin Command: /unblock <tgId>
bot.command('unblock', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
  const targetId = ctx.match?.trim().replace(/^user-/, '');
  if (!targetId) return ctx.reply('Usage: /unblock <tgId>');
  await updateUser(targetId, { status: 'ACTIVE' });
  await logAudit(tgId, 'unblock_cmd', targetId);
  await ctx.reply(`✅ Operative <code>${targetId}</code> has been UNBLOCKED.`, { parse_mode: 'HTML' });
});

// Admin Command: /deleteuser <tgId>
bot.command('deleteuser', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
  const targetId = ctx.match?.trim().replace(/^user-/, '');
  if (!targetId) return ctx.reply('Usage: /deleteuser <tgId>');
  await deleteUser(targetId);
  await logAudit(tgId, 'delete_user_cmd', targetId);
  await ctx.reply(`🗑️ Operative <code>${targetId}</code> deleted from database.`, { parse_mode: 'HTML' });
});

// Admin Command: /withdrawals or /payouts
bot.command(['withdrawals', 'payouts'], async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
  const withdrawals = await listWithdrawals();
  const pending = withdrawals.filter((w) => w.status === 'PENDING');
  if (pending.length === 0) {
    return ctx.reply('✅ No pending withdrawal requests.', { parse_mode: 'HTML' });
  }
  let text = `💸 <b>Pending Withdrawal Requests (${pending.length})</b>\n\n`;
  for (const w of pending.slice(0, 5)) {
    text += `🔹 <b>ID:</b> <code>${w.id}</code>\n` +
            `👤 <b>User:</b> ${w.userName} (<code>${w.tgId}</code>)\n` +
            `💵 <b>Amount:</b> $${w.amountUsd.toFixed(2)} USD (${w.network})\n` +
            `📍 <b>Address:</b> <code>${w.walletAddress}</code>\n\n`;
  }
  text += `Approve: <code>/approve &lt;id&gt; [txHash]</code>\nReject: <code>/reject &lt;id&gt; [reason]</code>`;
  await ctx.reply(text, { parse_mode: 'HTML' });
});

// Admin Command: /approve <id> [txHash]
bot.command('approve', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
  const parts = (ctx.match || '').trim().split(/\s+/);
  const id = parts[0];
  const txHash = parts[1] || 'Processed';
  if (!id) return ctx.reply('Usage: /approve <withdrawalId> [txHash]');

  const all = await listWithdrawals();
  const item = all.find((w) => w.id === id);
  if (!item) return ctx.reply(`❌ Withdrawal ID <code>${id}</code> not found.`);

  await updateWithdrawalStatus(id, 'PAID', txHash, 'Approved by Administrator');
  await logAudit(tgId, 'approve_payout_cmd', item.tgId, { id, txHash });

  const user = await getUser(item.tgId);
  const userLang = user?.lang || 'en';
  const msg = getBotMsg(userLang, 'withdrawalApproved', {
    amountUsd: item.amountUsd,
    network: item.network,
    address: item.walletAddress,
    txHash,
  });
  sendTelegramMessage(item.tgId, msg).catch(() => {});

  await ctx.reply(`✅ <b>Withdrawal <code>${id}</code> marked PAID!</b> Operative notified.`, { parse_mode: 'HTML' });
});

// Admin Command: /reject <id> [reason]
bot.command('reject', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
  const parts = (ctx.match || '').trim().split(/\s+/);
  const id = parts[0];
  const reason = parts.slice(1).join(' ') || 'Rejected by Administrator';
  if (!id) return ctx.reply('Usage: /reject <withdrawalId> [reason]');

  const all = await listWithdrawals();
  const item = all.find((w) => w.id === id);
  if (!item) return ctx.reply(`❌ Withdrawal ID <code>${id}</code> not found.`);

  await updateWithdrawalStatus(id, 'REJECTED', undefined, reason);
  await logAudit(tgId, 'reject_payout_cmd', item.tgId, { id, reason });

  const user = await getUser(item.tgId);
  const userLang = user?.lang || 'en';
  const msg = getBotMsg(userLang, 'withdrawalRejected', {
    amountUsd: item.amountUsd,
    reason,
  });
  sendTelegramMessage(item.tgId, msg).catch(() => {});

  await ctx.reply(`❌ <b>Withdrawal <code>${id}</code> REJECTED and refunded.</b> Operative notified.`, { parse_mode: 'HTML' });
});

// Admin Command: /wallets
bot.command('wallets', async (ctx) => {
  try {
    const tgId = String(ctx.from?.id);
    if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
    const addrs = await getAddresses();
    await ctx.reply(getBotMsg('en', 'walletsList', addrs), { parse_mode: 'HTML' });
  } catch (err: any) {
    console.error('[Bot] /wallets error:', err?.message || err);
  }
});

// Admin Command: /settron
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

// Admin Command: /seteth
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

// Admin Command: /setsol
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

// Admin Command: /stats
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

// Admin Command: /broadcast
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
    await logAudit(tgId, 'broadcast_from_bot', undefined, { sent, total: users.length });
    await ctx.reply(`📢 Broadcast sent to ${sent}/${users.length} users.`);
  } catch (err: any) {
    console.error('[Bot] /broadcast error:', err?.message || err);
  }
});

// Admin Command: /dm <tgId> <message>
bot.command('dm', async (ctx) => {
  try {
    const tgId = String(ctx.from?.id);
    if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
    const parts = (ctx.match || '').trim().split(/\s+/);
    const targetId = parts[0]?.replace(/^user-/, '');
    const message = parts.slice(1).join(' ');
    if (!targetId || !message) {
      return ctx.reply('Usage: /dm <tgId> <message>');
    }

    const sent = await sendTelegramMessage(targetId, message);
    await logAudit(tgId, 'dm_from_bot', targetId, { length: message.length });
    if (sent) {
      await ctx.reply(`✉️ Message sent to operative <code>${targetId}</code>.`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`❌ Failed to send message to operative <code>${targetId}</code>.`, { parse_mode: 'HTML' });
    }
  } catch (err: any) {
    console.error('[Bot] /dm error:', err?.message || err);
  }
});

// Admin Command: /pricing
bot.command('pricing', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
  const pricing = await getPricingSettings();
  await ctx.reply(
    `🏷️ <b>Pricing Settings:</b>\n` +
    `• Pro: $${pricing.plans.pro.weekly}/wk, $${pricing.plans.pro.monthly}/mo\n` +
    `• Enterprise: $${pricing.plans.enterprise.weekly}/wk, $${pricing.plans.enterprise.monthly}/mo\n` +
    `• 50% Promo: ${pricing.discount.enabled ? 'ACTIVE' : 'OFF'}\n\n` +
    `Change: <code>/setpricing &lt;proWeekly&gt; &lt;proMonthly&gt;</code>`,
    { parse_mode: 'HTML' }
  );
});

// Admin Command: /setpricing <proWeekly> <proMonthly>
bot.command('setpricing', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
  const parts = (ctx.match || '').trim().split(/\s+/);
  const weekly = Number(parts[0]);
  const monthly = Number(parts[1]);
  if (isNaN(weekly) || isNaN(monthly) || weekly <= 0 || monthly <= 0) {
    return ctx.reply('Usage: /setpricing <proWeekly> <proMonthly> (e.g. /setpricing 25 79)');
  }
  const pricing = await getPricingSettings();
  pricing.plans.pro.weekly = weekly;
  pricing.plans.pro.monthly = monthly;
  await savePricingSettings(pricing);
  await logAudit(tgId, 'set_pricing_cmd', undefined, { weekly, monthly });
  await ctx.reply(`✅ Pro pricing updated to $${weekly}/wk, $${monthly}/mo!`, { parse_mode: 'HTML' });
});

// Admin Command: /togglepromo
bot.command('togglepromo', async (ctx) => {
  const tgId = String(ctx.from?.id);
  if (tgId !== String(ADMIN_ID)) return ctx.reply('⛔ Access denied');
  const pricing = await getPricingSettings();
  pricing.discount.enabled = !pricing.discount.enabled;
  await savePricingSettings(pricing);
  await ctx.reply(`🎁 50% Promo discount is now <b>${pricing.discount.enabled ? 'ACTIVE' : 'OFF'}</b>.`, { parse_mode: 'HTML' });
});

// External Notifications
export async function sendTelegramMessage(chatId: string | number, text: string, options: any = {}) {
  try {
    return await bot.api.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      ...options,
    });
  } catch (htmlErr: any) {
    // If HTML entity parsing fails, retry without parse_mode
    try {
      return await bot.api.sendMessage(chatId, text, {
        ...options,
        parse_mode: undefined,
      });
    } catch (err: any) {
      console.error(`[Bot] Failed to send message to ${chatId}:`, err?.message || err);
      return null;
    }
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
