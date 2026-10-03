/**
 * Dynamic Localization Dictionary for Telegram Bot
 * Strictly English (en) and Russian (ru) only.
 */

export const botMessages = {
  en: {
    welcomeUser: () =>
      `⚡ <b>Welcome to BlockHunt Protocol v3.8</b>\n\n` +
      `Advanced high-performance cryptographic security scanner for TRON (TRC-20), Ethereum (ERC-20), and Solana.\n\n` +
      `Tap the button below to launch your encrypted terminal:`,
    welcomeAdmin: () =>
      `👑 <b>Administrator Mode Active</b>\n\n` +
      `BlockHunt Protocol Management Console & Security Engine.\n\n` +
      `Tap the button below to launch the admin console:`,
    langSwitched: () => 'Language switched to English!',
    langPrompt: () => 'To open the console, tap the button below:',
    btnLaunch: (isAdmin) => (isAdmin ? '⚡ Launch Protocol (Admin Mode)' : '⚡ Launch BlockHunt Protocol'),
    btnSwitchLang: () => '🇷🇺 Переключить на Русский',
    btnSwitchLangEn: () => '🇬🇧 Switch to English',
    btnLaunchMiniApp: () => '🦈 Open Mini App',
    btnShareTelegram: () => '🚀 Share with Friends',

    walletsList: (addresses) =>
      `👑 <b>Active Deposit Addresses:</b>\n\n` +
      `🔴 <b>TRON (TRC-20):</b>\n<code>${addresses.TRON}</code>\n\n` +
      `🔵 <b>ETHEREUM (ERC-20):</b>\n<code>${addresses.ETHEREUM}</code>\n\n` +
      `🟣 <b>SOLANA (SOL):</b>\n<code>${addresses.SOLANA}</code>\n\n` +
      `<i>To update, use the Mini App Admin Panel or direct commands:</i>\n` +
      `<code>/settron &lt;address&gt;</code>\n` +
      `<code>/seteth &lt;address&gt;</code>\n` +
      `<code>/setsol &lt;address&gt;</code>`,

    yourTgId: (userId) => `Your Telegram ID: <code>${userId}</code>`,
    accessDeniedAdmin: () => `⛔ Access denied: This command is restricted to system administrators.`,

    txVerifying: ({ hash, network }) =>
      `🔍 <b>Verifying transaction on blockchain...</b>\n\n` +
      `• <b>TxID (Hash):</b> <code>${hash}</code>\n` +
      `• <b>Network:</b> ${network}\n\n` +
      `<i>Querying blockchain RPC nodes to audit recipient address and deposit amount. Please wait a moment...</i>`,

    txSuccess: ({ plan, cycle, network, amountUsd, symbol, hash }) =>
      `🎉 <b>PAYMENT CONFIRMED!</b> 👑\n\n` +
      `• <b>Plan:</b> <b>${String(plan).toUpperCase()}</b> (${cycle === 'monthly' ? 'Monthly' : 'Weekly'})\n` +
      `• <b>Network:</b> ${network}\n` +
      `• <b>Amount:</b> $${Number(amountUsd || 0).toFixed(2)} (${symbol})\n` +
      `• <b>TxID:</b> <code>${hash}</code>\n\n` +
      `✅ <i>Your subscription is activated! Tap the button below to launch the console:</i>`,

    txAdminAlert: ({ userName, userId, userUname, plan, cycle, network, amountUsd, symbol, hash, source }) =>
      `👑 <b>[NEW PAYMENT CONFIRMED - ${source || 'WEBAPP'}]</b>\n\n` +
      `👤 <b>User:</b> ${userName}\n` +
      `🆔 <b>Telegram ID:</b> <code>${userId}</code>\n` +
      `🔗 <b>Username:</b> ${userUname || 'none'}\n` +
      `📦 <b>Plan:</b> <b>${String(plan).toUpperCase()}</b> (${cycle === 'monthly' ? 'Monthly' : 'Weekly'})\n` +
      `🌐 <b>Network:</b> ${network}\n` +
      `💵 <b>Amount:</b> $${Number(amountUsd || 0).toFixed(2)} (${symbol})\n` +
      `🔗 <b>TxID:</b> <code>${hash}</code>\n` +
      `📅 <b>Date:</b> ${new Date().toLocaleDateString('en-US')} ${new Date().toLocaleTimeString('en-US')}\n\n` +
      `<i>Transaction verified on-chain and subscription activated!</i>`,

    txFailed: ({ error }) =>
      `❌ <b>Transaction Verification Error</b>\n\n` +
      `<b>Reason:</b> ${error || 'Transaction not confirmed on blockchain'}\n\n` +
      `<b>Deposit Requirements:</b>\n` +
      `1. Funds must be sent strictly to our official deposit address.\n` +
      `2. Transferred amount must meet or exceed the required tier price.\n` +
      `3. Transaction must be confirmed on the blockchain.\n` +
      `4. Reusing a transaction hash is strictly prohibited.\n\n` +
      `<i>If you just submitted the payment, please wait ~1 minute for block confirmation and submit the hash again.</i>`,

    txRpcError: ({ error }) =>
      `⚠️ An error occurred while communicating with blockchain RPC nodes: ${error}. Please try again in a minute.`,

    newUserAlert: ({ userName, userId, userUname }) =>
      `🚀 <b>[New User Registered]</b>\n\n` +
      `👤 <b>Name:</b> ${userName}\n` +
      `🆔 <b>Telegram ID:</b> <code>${userId}</code>\n` +
      `🔗 <b>Username:</b> ${userUname || 'none'}\n` +
      `📅 <b>Date:</b> ${new Date().toLocaleDateString('en-US')} ${new Date().toLocaleTimeString('en-US')}\n\n` +
      `<i>User started the bot for the first time (/start).</i>`,

    referralBonus: ({ buyerName, plan, commissionUsd, balanceUsd }) =>
      `🎁 <b>REFERRAL COMMISSION RECEIVED!</b> 💰\n\n` +
      `Your invited user <b>${buyerName}</b> just upgraded to <b>${String(plan).toUpperCase()}</b>!\n\n` +
      `• <b>Your 50% Commission:</b> <b>+$${Number(commissionUsd).toFixed(2)} USD</b>\n` +
      `• <b>Available Payout Balance:</b> <b>$${Number(balanceUsd).toFixed(2)} USD</b>\n\n` +
      `<i>You can request a withdrawal to TRX, SOL, or ETH once your balance reaches $10.00.</i>`,

    referralBonusAdminAlert: ({ referrerId, buyerName, buyerId, plan, commissionUsd }) =>
      `💰 <b>[REFERRAL COMMISSION CREDITED]</b>\n\n` +
      `• <b>Referrer ID:</b> <code>${referrerId}</code>\n` +
      `• <b>Buyer:</b> ${buyerName} (<code>${buyerId}</code>)\n` +
      `• <b>Plan:</b> ${String(plan).toUpperCase()}\n` +
      `• <b>50% Commission:</b> $${Number(commissionUsd).toFixed(2)} USD`,

    withdrawalAdminAlert: ({ userName, userId, userUname, amountUsd, network, address, id }) =>
      `🚨 <b>[NEW WITHDRAWAL REQUEST]</b>\n\n` +
      `• <b>Request ID:</b> <code>${id}</code>\n` +
      `• <b>User:</b> ${userName} (<code>${userId}</code> | ${userUname || 'none'})\n` +
      `• <b>Amount:</b> <b>$${Number(amountUsd).toFixed(2)} USD</b>\n` +
      `• <b>Network:</b> ${network}\n` +
      `• <b>Destination Address:</b>\n<code>${address}</code>\n\n` +
      `<i>Open Admin Panel to approve payout or mark paid.</i>`,

    withdrawalApproved: ({ amountUsd, network, address, txHash }) =>
      `✅ <b>WITHDRAWAL PAID & DISPATCHED!</b> 🎉\n\n` +
      `Your payout request for <b>$${Number(amountUsd).toFixed(2)} USD</b> has been processed.\n\n` +
      `• <b>Network:</b> ${network}\n` +
      `• <b>Destination Address:</b> <code>${address}</code>\n` +
      (txHash ? `• <b>TxID:</b> <code>${txHash}</code>\n\n` : `\n`) +
      `<i>Thank you for working with BlockHunt Protocol!</i>`,

    withdrawalRejected: ({ amountUsd, reason }) =>
      `❌ <b>WITHDRAWAL REQUEST REJECTED</b>\n\n` +
      `Your payout request for <b>$${Number(amountUsd).toFixed(2)} USD</b> was rejected.\n` +
      (reason ? `• <b>Reason:</b> ${reason}\n\n` : `\n`) +
      `<i>The funds have been returned to your available referral balance. Please verify your destination address and submit again.</i>`,

    walletFound: ({ network, shortenedAddr, balanceCrypto, symbol, balanceUsd }) =>
      `🎯 <b>Wallet Found!</b>\n\n` +
      `🔗 <b>Network:</b> ${network}\n` +
      `📍 <b>Address:</b> <code>${shortenedAddr}</code>\n` +
      `💰 <b>Balance:</b> ${balanceCrypto ?? '—'} ${symbol} (~$${Number(balanceUsd).toLocaleString()})\n\n` +
      `<i>Open the app to view details and transfer funds.</i>`,

    referralPromoBroadcast: ({ refLink }) =>
      `⚡ <b>AFFILIATE REWARDS PROGRAM: EARN 50% COMMISSIONS!</b> 💰\n\n` +
      `Invite other crypto operatives and earn <b>50% instant commission</b> on every license purchased through your unique link!\n\n` +
      `🔗 <b>Your Personal Referral Link:</b>\n<code>${refLink}</code>\n\n` +
      `• Minimum withdrawal: <b>$10.00 USD</b>\n` +
      `• Supported payout networks: <b>TRX (TRON), SOL (Solana), ETH (Ethereum)</b>\n` +
      `• Instant balance credit upon purchase\n\n` +
      `<i>Start sharing today and track your earnings in the Mini App under the REFERRALS tab!</i>`,
  },

  ru: {
    welcomeUser: () =>
      `⚡ <b>Добро пожаловать в BlockHunt Protocol v3.8</b>\n\n` +
      `Высокоскоростной криптографический сканер мемпула для сетей TRON (TRC-20), Ethereum (ERC-20) и Solana.\n\n` +
      `Нажмите кнопку ниже для запуска защищённой консоли:`,
    welcomeAdmin: () =>
      `👑 <b>Режим Администратора Активен</b>\n\n` +
      `Панель управления и криптографический движок BlockHunt Protocol.\n\n` +
      `Нажмите кнопку ниже для запуска админ-консоли:`,
    langSwitched: () => 'Язык переключен на Русский!',
    langPrompt: () => 'Для доступа к консоли нажмите кнопку ниже:',
    btnLaunch: (isAdmin) => (isAdmin ? '⚡ Запустить Protocol (Режим Admin)' : '⚡ Запустить BlockHunt Protocol'),
    btnSwitchLang: () => '🇷🇺 Переключить на Русский',
    btnSwitchLangEn: () => '🇬🇧 Switch to English',
    btnLaunchMiniApp: () => '🦈 Открыть Mini App',
    btnShareTelegram: () => '🚀 Поделиться с друзьями',

    walletsList: (addresses) =>
      `👑 <b>Активные депозитные кошельки:</b>\n\n` +
      `🔴 <b>TRON (TRC-20):</b>\n<code>${addresses.TRON}</code>\n\n` +
      `🔵 <b>ETHEREUM (ERC-20):</b>\n<code>${addresses.ETHEREUM}</code>\n\n` +
      `🟣 <b>SOLANA (SOL):</b>\n<code>${addresses.SOLANA}</code>\n\n` +
      `<i>Для изменения используйте Панель Администратора в Mini App или команды:</i>\n` +
      `<code>/settron &lt;адрес&gt;</code>\n` +
      `<code>/seteth &lt;адрес&gt;</code>\n` +
      `<code>/setsol &lt;адрес&gt;</code>`,

    yourTgId: (userId) => `Ваш Telegram ID: <code>${userId}</code>`,
    accessDeniedAdmin: () => `⛔ Доступ запрещен: эта команда доступна только для администратора системы.`,

    txVerifying: ({ hash, network }) =>
      `🔍 <b>Проверка транзакции в блокчейне...</b>\n\n` +
      `• <b>Хэш:</b> <code>${hash}</code>\n` +
      `• <b>Сеть:</b> ${network}\n\n` +
      `<i>Связываемся с RPC-узлами блокчейна для проверки адреса получателя и суммы депозита. Пожалуйста, подождите...</i>`,

    txSuccess: ({ plan, cycle, network, amountUsd, symbol, hash }) =>
      `🎉 <b>ОПЛАТА УСПЕШНО ПОДТВЕРЖДЕНА!</b> 👑\n\n` +
      `• <b>Тариф:</b> <b>${String(plan).toUpperCase()}</b> (${cycle === 'monthly' ? 'Месячный' : 'Недельный'})\n` +
      `• <b>Сеть:</b> ${network}\n` +
      `• <b>Сумма:</b> $${Number(amountUsd || 0).toFixed(2)} (${symbol})\n` +
      `• <b>TxID:</b> <code>${hash}</code>\n\n` +
      `✅ <i>Ваш тариф активирован! Нажмите кнопку ниже для запуска сканера:</i>`,

    txAdminAlert: ({ userName, userId, userUname, plan, cycle, network, amountUsd, symbol, hash, source }) =>
      `👑 <b>[НОВАЯ ОПЛАТА ПОДТВЕРЖДЕНА - ${source || 'WEBAPP'}]</b>\n\n` +
      `👤 <b>Пользователь:</b> ${userName}\n` +
      `🆔 <b>Telegram ID:</b> <code>${userId}</code>\n` +
      `🔗 <b>Username:</b> ${userUname || 'отсутствует'}\n` +
      `📦 <b>Тариф:</b> <b>${String(plan).toUpperCase()}</b> (${cycle === 'monthly' ? 'Месячный' : 'Недельный'})\n` +
      `🌐 <b>Сеть:</b> ${network}\n` +
      `💵 <b>Сумма:</b> $${Number(amountUsd || 0).toFixed(2)} (${symbol})\n` +
      `🔗 <b>TxID:</b> <code>${hash}</code>\n` +
      `📅 <b>Дата:</b> ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}\n\n` +
      `<i>Транзакция проверена в блокчейне, доступ к тарифу успешно активирован!</i>`,

    txFailed: ({ error }) =>
      `❌ <b>Ошибка проверки транзакции</b>\n\n` +
      `<b>Причина:</b> ${error || 'Транзакция не подтверждена блокчейном'}\n\n` +
      `<b>Требования к депозиту:</b>\n` +
      `1. Адрес получателя должен строго совпадать с адресом депозита системы.\n` +
      `2. Сумма перевода должна быть достаточной для выбранного тарифа.\n` +
      `3. Транзакция должна быть подтверждена в сети блокчейн.\n` +
      `4. Повторное использование хэша строго запрещено.\n\n` +
      `<i>Если вы только что отправили средства, подождите 1 минуту для подтверждения блоком и отправьте хэш снова.</i>`,

    txRpcError: ({ error }) =>
      `⚠️ Произошла ошибка при обращении к блокчейн-нодам: ${error}. Попробуйте снова через минуту.`,

    newUserAlert: ({ userName, userId, userUname }) =>
      `🚀 <b>[Новый пользователь подключился]</b>\n\n` +
      `👤 <b>Имя:</b> ${userName}\n` +
      `🆔 <b>Telegram ID:</b> <code>${userId}</code>\n` +
      `🔗 <b>Username:</b> ${userUname || 'отсутствует'}\n` +
      `📅 <b>Дата:</b> ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}\n\n` +
      `<i>Пользователь впервые запустил бота (/start).</i>`,

    referralBonus: ({ buyerName, plan, commissionUsd, balanceUsd }) =>
      `🎁 <b>РЕФЕРАЛЬНОЕ ВОЗНАГРАЖДЕНИЕ ПОЛУЧЕНО!</b> 💰\n\n` +
      `Приглашенный вами пользователь <b>${buyerName}</b> приобрел тариф <b>${String(plan).toUpperCase()}</b>!\n\n` +
      `• <b>Ваша комиссия 50%:</b> <b>+$${Number(commissionUsd).toFixed(2)} USD</b>\n` +
      `• <b>Доступно к выводу:</b> <b>$${Number(balanceUsd).toFixed(2)} USD</b>\n\n` +
      `<i>Вы можете запросить вывод на TRX, SOL или ETH при балансе от $10.00.</i>`,

    referralBonusAdminAlert: ({ referrerId, buyerName, buyerId, plan, commissionUsd }) =>
      `💰 <b>[НАЧИСЛЕНА РЕФЕРАЛЬНАЯ КОМИССИЯ]</b>\n\n` +
      `• <b>Реферер ID:</b> <code>${referrerId}</code>\n` +
      `• <b>Покупатель:</b> ${buyerName} (<code>${buyerId}</code>)\n` +
      `• <b>Тариф:</b> ${String(plan).toUpperCase()}\n` +
      `• <b>Комиссия 50%:</b> $${Number(commissionUsd).toFixed(2)} USD`,

    withdrawalAdminAlert: ({ userName, userId, userUname, amountUsd, network, address, id }) =>
      `🚨 <b>[НОВЫЙ ЗАПРОС НА ВЫВОД]</b>\n\n` +
      `• <b>ID запроса:</b> <code>${id}</code>\n` +
      `• <b>Пользователь:</b> ${userName} (<code>${userId}</code> | ${userUname || 'нет'})\n` +
      `• <b>Сумма:</b> <b>$${Number(amountUsd).toFixed(2)} USD</b>\n` +
      `• <b>Сеть:</b> ${network}\n` +
      `• <b>Адрес кошелька:</b>\n<code>${address}</code>\n\n` +
      `<i>Откройте Панель Администратора для подтверждения выплаты.</i>`,

    withdrawalApproved: ({ amountUsd, network, address, txHash }) =>
      `✅ <b>ВЫПЛАТА УСПЕШНО ПРОИЗВЕДЕНА!</b> 🎉\n\n` +
      `Ваш запрос на вывод <b>$${Number(amountUsd).toFixed(2)} USD</b> успешно обработан.\n\n` +
      `• <b>Сеть:</b> ${network}\n` +
      `• <b>Адрес получения:</b> <code>${address}</code>\n` +
      (txHash ? `• <b>TxID транзакции:</b> <code>${txHash}</code>\n\n` : `\n`) +
      `<i>Благодарим за сотрудничество с BlockHunt Protocol!</i>`,

    withdrawalRejected: ({ amountUsd, reason }) =>
      `❌ <b>ЗАПРОС НА ВЫВОД ОТКЛОНЕН</b>\n\n` +
      `Ваш запрос на вывод <b>$${Number(amountUsd).toFixed(2)} USD</b> был отклонен администратором.\n` +
      (reason ? `• <b>Причина:</b> ${reason}\n\n` : `\n`) +
      `<i>Средства возвращены на ваш партнерский баланс. Проверьте адрес и повторите попытку.</i>`,

    walletFound: ({ network, shortenedAddr, balanceCrypto, symbol, balanceUsd }) =>
      `🎯 <b>Кошелёк найден!</b>\n\n` +
      `🔗 <b>Сеть:</b> ${network}\n` +
      `📍 <b>Адрес:</b> <code>${shortenedAddr}</code>\n` +
      `💰 <b>Баланс:</b> ${balanceCrypto ?? '—'} ${symbol} (~$${Number(balanceUsd).toLocaleString()})\n\n` +
      `<i>Откройте приложение для просмотра деталей и вывода средств.</i>`,

    referralPromoBroadcast: ({ refLink }) =>
      `⚡ <b>ПАРТНЕРСКАЯ ПРОГРАММА: ЗАРАБАТЫВАЙТЕ 50% КОМИССИИ!</b> 💰\n\n` +
      `Приглашайте новых пользователей и получайте <b>50% моментальной комиссии</b> от каждой покупки тарифа по вашей ссылке!\n\n` +
      `🔗 <b>Ваша уникальная реферальная ссылка:</b>\n<code>${refLink}</code>\n\n` +
      `• Минимальный вывод: <b>$10.00 USD</b>\n` +
      `• Поддерживаемые сети: <b>TRX (TRON), SOL (Solana), ETH (Ethereum)</b>\n` +
      `• Моментальное зачисление средств при покупке\n\n` +
      `<i>Начните делиться ссылкой уже сегодня и отслеживайте доход во вкладке РЕФЕРАЛЫ в Mini App!</i>`,
  },
};

/**
 * Dynamic message resolver helper
 */
export function getBotMsg(lang, key, params = {}) {
  const safeLang = lang === 'ru' ? 'ru' : 'en';
  const dict = botMessages[safeLang] || botMessages.en;
  const fn = dict[key] || botMessages.en[key];
  if (typeof fn === 'function') {
    return fn(params);
  }
  return fn || '';
}
