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
    btnLaunch: (isAdmin?: boolean) => (isAdmin ? '⚡ Launch Protocol (Admin Mode)' : '⚡ Launch BlockHunt Protocol'),
    btnSwitchLang: () => '🇷🇺 Переключить на Русский',
    btnSwitchLangEn: () => '🇬🇧 Switch to English',
    btnLaunchMiniApp: () => '🦈 Open Mini App',
    btnShareTelegram: () => '🚀 Share with Friends',

    walletsList: (addresses: Record<string, string>) =>
      `👑 <b>Active Deposit Addresses:</b>\n\n` +
      `🔴 <b>TRON (TRC-20):</b>\n<code>${addresses.TRON}</code>\n\n` +
      `🔵 <b>ETHEREUM (ERC-20):</b>\n<code>${addresses.ETHEREUM}</code>\n\n` +
      `🟣 <b>SOLANA (SOL):</b>\n<code>${addresses.SOLANA}</code>\n\n` +
      `<i>To update, use the Mini App Admin Panel or direct commands:</i>\n` +
      `<code>/settron &lt;address&gt;</code>\n` +
      `<code>/seteth &lt;address&gt;</code>\n` +
      `<code>/setsol &lt;address&gt;</code>`,

    yourTgId: (userId: string) => `Your Telegram ID: <code>${userId}</code>`,
    accessDeniedAdmin: () => `⛔ Access denied: This command is restricted to system administrators.`,

    txVerifying: ({ hash, network }: { hash: string; network: string }) =>
      `🔍 <b>Verifying transaction on blockchain...</b>\n\n` +
      `• <b>TxID (Hash):</b> <code>${hash}</code>\n` +
      `• <b>Network:</b> ${network}\n\n` +
      `<i>Querying blockchain RPC nodes to audit recipient address and deposit amount. Please wait a moment...</i>`,

    txSuccess: ({ plan, cycle, network, amountUsd, symbol, hash }: any) =>
      `🎉 <b>PAYMENT CONFIRMED!</b> 👑\n\n` +
      `• <b>Plan:</b> <b>${String(plan).toUpperCase()}</b> (${cycle === 'monthly' ? 'Monthly' : 'Weekly'})\n` +
      `• <b>Network:</b> ${network}\n` +
      `• <b>Amount:</b> $${Number(amountUsd || 0).toFixed(2)} (${symbol})\n` +
      `• <b>TxID:</b> <code>${hash}</code>\n\n` +
      `✅ <i>Your subscription is activated! Tap the button below to launch the console:</i>`,

    txAdminAlert: ({ userName, userId, userUname, plan, cycle, network, amountUsd, symbol, hash, source }: any) =>
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

    txFailed: ({ error }: { error?: string }) =>
      `❌ <b>Transaction Verification Error</b>\n\n` +
      `<b>Reason:</b> ${error || 'Transaction not confirmed on blockchain'}\n\n` +
      `<b>Deposit Requirements:</b>\n` +
      `1. Funds must be sent strictly to our official deposit address.\n` +
      `2. Transferred amount must meet or exceed the required tier price.\n` +
      `3. Transaction must be confirmed on the blockchain.\n` +
      `4. Reusing a transaction hash is strictly prohibited.\n\n` +
      `<i>If you just submitted the payment, please wait ~1 minute for block confirmation and submit the hash again.</i>`,

    newUserAlert: ({ userName, userId, userUname }: any) =>
      `🚀 <b>[New User Registered]</b>\n\n` +
      `👤 <b>Name:</b> ${userName}\n` +
      `🆔 <b>Telegram ID:</b> <code>${userId}</code>\n` +
      `🔗 <b>Username:</b> ${userUname || 'none'}\n` +
      `📅 <b>Date:</b> ${new Date().toLocaleDateString('en-US')} ${new Date().toLocaleTimeString('en-US')}\n\n` +
      `<i>User started the bot for the first time (/start).</i>`,

    referralBonus: ({ buyerName, plan, commissionUsd, balanceUsd }: any) =>
      `🎁 <b>REFERRAL COMMISSION RECEIVED!</b> 💰\n\n` +
      `Your invited user <b>${buyerName}</b> just upgraded to <b>${String(plan).toUpperCase()}</b>!\n\n` +
      `• <b>Your 50% Commission:</b> <b>+$${Number(commissionUsd).toFixed(2)} USD</b>\n` +
      `• <b>Available Payout Balance:</b> <b>$${Number(balanceUsd).toFixed(2)} USD</b>\n\n` +
      `<i>You can request a withdrawal to TRX, SOL, or ETH once your balance reaches $10.00.</i>`,

    withdrawalAdminAlert: ({ userName, userId, userUname, amountUsd, network, address, id }: any) =>
      `🚨 <b>[NEW WITHDRAWAL REQUEST]</b>\n\n` +
      `• <b>Request ID:</b> <code>${id}</code>\n` +
      `• <b>User:</b> ${userName} (<code>${userId}</code> | ${userUname || 'none'})\n` +
      `• <b>Amount:</b> <b>$${Number(amountUsd).toFixed(2)} USD</b>\n` +
      `• <b>Network:</b> ${network}\n` +
      `• <b>Destination Address:</b>\n<code>${address}</code>\n\n` +
      `<i>Open Admin Panel to approve payout or mark paid.</i>`,

    withdrawalApproved: ({ amountUsd, network, address, txHash }: any) =>
      `✅ <b>WITHDRAWAL PAID & DISPATCHED!</b> 🎉\n\n` +
      `Your payout request for <b>$${Number(amountUsd).toFixed(2)} USD</b> has been processed.\n\n` +
      `• <b>Network:</b> ${network}\n` +
      `• <b>Destination Address:</b> <code>${address}</code>\n` +
      (txHash ? `• <b>TxID:</b> <code>${txHash}</code>\n\n` : `\n`) +
      `<i>Thank you for working with BlockHunt Protocol!</i>`,

    withdrawalRejected: ({ amountUsd, reason }: any) =>
      `❌ <b>WITHDRAWAL REQUEST REJECTED</b>\n\n` +
      `Your payout request for <b>$${Number(amountUsd).toFixed(2)} USD</b> was rejected.\n` +
      (reason ? `• <b>Reason:</b> ${reason}\n\n` : `\n`) +
      `<i>The funds have been returned to your available referral balance.</i>`,

    walletFound: ({ network, shortenedAddr, balanceCrypto, symbol, balanceUsd }: any) =>
      `🎯 <b>Wallet Found!</b>\n\n` +
      `🔗 <b>Network:</b> ${network}\n` +
      `📍 <b>Address:</b> <code>${shortenedAddr}</code>\n` +
      `💰 <b>Balance:</b> ${balanceCrypto ?? '—'} ${symbol} (~$${Number(balanceUsd).toLocaleString()})\n\n` +
      `<i>Open the app to view details and transfer funds.</i>`,
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
    btnLaunch: (isAdmin?: boolean) => (isAdmin ? '⚡ Запустить Protocol (Режим Admin)' : '⚡ Запустить BlockHunt Protocol'),
    btnSwitchLang: () => '🇷🇺 Переключить на Русский',
    btnSwitchLangEn: () => '🇬🇧 Switch to English',
    btnLaunchMiniApp: () => '🦈 Открыть Mini App',
    btnShareTelegram: () => '🚀 Поделиться с друзьями',

    walletsList: (addresses: Record<string, string>) =>
      `👑 <b>Активные депозитные кошельки:</b>\n\n` +
      `🔴 <b>TRON (TRC-20):</b>\n<code>${addresses.TRON}</code>\n\n` +
      `🔵 <b>ETHEREUM (ERC-20):</b>\n<code>${addresses.ETHEREUM}</code>\n\n` +
      `🟣 <b>SOLANA (SOL):</b>\n<code>${addresses.SOLANA}</code>\n\n` +
      `<i>Для изменения используйте Панель Администратора в Mini App или команды:</i>\n` +
      `<code>/settron &lt;адрес&gt;</code>\n` +
      `<code>/seteth &lt;адрес&gt;</code>\n` +
      `<code>/setsol &lt;адрес&gt;</code>`,

    yourTgId: (userId: string) => `Ваш Telegram ID: <code>${userId}</code>`,
    accessDeniedAdmin: () => `⛔ Доступ запрещен: эта команда доступна только для администратора системы.`,

    txVerifying: ({ hash, network }: { hash: string; network: string }) =>
      `🔍 <b>Проверка транзакции в блокчейне...</b>\n\n` +
      `• <b>Хэш:</b> <code>${hash}</code>\n` +
      `• <b>Сеть:</b> ${network}\n\n` +
      `<i>Связываемся с RPC-узлами блокчейна для проверки адреса получателя и суммы депозита. Пожалуйста, подождите...</i>`,

    txSuccess: ({ plan, cycle, network, amountUsd, symbol, hash }: any) =>
      `🎉 <b>ОПЛАТА УСПЕШНО ПОДТВЕРЖДЕНА!</b> 👑\n\n` +
      `• <b>Тариф:</b> <b>${String(plan).toUpperCase()}</b> (${cycle === 'monthly' ? 'Месячный' : 'Недельный'})\n` +
      `• <b>Сеть:</b> ${network}\n` +
      `• <b>Сумма:</b> $${Number(amountUsd || 0).toFixed(2)} (${symbol})\n` +
      `• <b>TxID:</b> <code>${hash}</code>\n\n` +
      `✅ <i>Ваш тариф активирован! Нажмите кнопку ниже для запуска сканера:</i>`,

    txAdminAlert: ({ userName, userId, userUname, plan, cycle, network, amountUsd, symbol, hash, source }: any) =>
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

    txFailed: ({ error }: { error?: string }) =>
      `❌ <b>Ошибка проверки транзакции</b>\n\n` +
      `<b>Причина:</b> ${error || 'Транзакция не подтверждена блокчейном'}\n\n` +
      `<b>Требования к депозиту:</b>\n` +
      `1. Адрес получателя должен строго совпадать с адресом депозита системы.\n` +
      `2. Сумма перевода должна быть достаточной для выбранного тарифа.\n` +
      `3. Транзакция должна быть подтверждена в сети блокчейн.\n` +
      `4. Повторное использование хэша строго запрещено.\n\n` +
      `<i>Если вы только что отправили средства, подождите 1 минуту для подтверждения блоком и отправьте хэш снова.</i>`,

    newUserAlert: ({ userName, userId, userUname }: any) =>
      `🚀 <b>[Новый пользователь подключился]</b>\n\n` +
      `👤 <b>Имя:</b> ${userName}\n` +
      `🆔 <b>Telegram ID:</b> <code>${userId}</code>\n` +
      `🔗 <b>Username:</b> ${userUname || 'отсутствует'}\n` +
      `📅 <b>Дата:</b> ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}\n\n` +
      `<i>Пользователь впервые запустил бота (/start).</i>`,

    referralBonus: ({ buyerName, plan, commissionUsd, balanceUsd }: any) =>
      `🎁 <b>РЕФЕРАЛЬНОЕ ВОЗНАГРАЖДЕНИЕ ПОЛУЧЕНО!</b> 💰\n\n` +
      `Приглашенный вами пользователь <b>${buyerName}</b> приобрел тариф <b>${String(plan).toUpperCase()}</b>!\n\n` +
      `• <b>Ваша комиссия 50%:</b> <b>+$${Number(commissionUsd).toFixed(2)} USD</b>\n` +
      `• <b>Доступно к выводу:</b> <b>$${Number(balanceUsd).toFixed(2)} USD</b>\n\n` +
      `<i>Вы можете запросить вывод на TRX, SOL или ETH при балансе от $10.00.</i>`,

    withdrawalAdminAlert: ({ userName, userId, userUname, amountUsd, network, address, id }: any) =>
      `🚨 <b>[НОВАЯ ЗАЯВКА НА ВЫВОД СРЕДСТВ]</b>\n\n` +
      `• <b>ID Заявки:</b> <code>${id}</code>\n` +
      `• <b>Пользователь:</b> ${userName} (<code>${userId}</code> | ${userUname || 'отсутствует'})\n` +
      `• <b>Сумма:</b> <b>$${Number(amountUsd).toFixed(2)} USD</b>\n` +
      `• <b>Сеть:</b> ${network}\n` +
      `• <b>Адрес кошелька:</b>\n<code>${address}</code>\n\n` +
      `<i>Откройте Панель Администратора для подтверждения или отмены выплаты.</i>`,

    withdrawalApproved: ({ amountUsd, network, address, txHash }: any) =>
      `✅ <b>ВЫПЛАТА УСПЕШНО ОТПРАВЛЕНА!</b> 🎉\n\n` +
      `Ваша заявка на вывод <b>$${Number(amountUsd).toFixed(2)} USD</b> была обработана администратором.\n\n` +
      `• <b>Сеть:</b> ${network}\n` +
      `• <b>Адрес:</b> <code>${address}</code>\n` +
      (txHash ? `• <b>TxID:</b> <code>${txHash}</code>\n\n` : `\n`) +
      `<i>Спасибо за работу с BlockHunt Protocol!</i>`,

    withdrawalRejected: ({ amountUsd, reason }: any) =>
      `❌ <b>ЗАЯВКА НА ВЫВОД ОТКЛОНЕНА</b>\n\n` +
      `Ваша заявка на вывод <b>$${Number(amountUsd).toFixed(2)} USD</b> была отклонена администратором.\n` +
      (reason ? `• <b>Причина:</b> ${reason}\n\n` : `\n`) +
      `<i>Средства возвращены на ваш баланс.</i>`,

    walletFound: ({ network, shortenedAddr, balanceCrypto, symbol, balanceUsd }: any) =>
      `🎯 <b>Кошелек обнаружен!</b>\n\n` +
      `🔗 <b>Сеть:</b> ${network}\n` +
      `📍 <b>Адрес:</b> <code>${shortenedAddr}</code>\n` +
      `💰 <b>Баланс:</b> ${balanceCrypto ?? '—'} ${symbol} (~$${Number(balanceUsd).toLocaleString()})\n\n` +
      `<i>Откройте приложение, чтобы увидеть подробности и вывести средства.</i>`,
  },
};

export function getBotMsg(lang: string, key: string, params?: any): string {
  const selectedLang = lang === 'ru' ? 'ru' : 'en';
  const group = (botMessages as any)[selectedLang] || botMessages.en;
  const fn = group[key] || botMessages.en[key as keyof typeof botMessages.en];
  if (typeof fn === 'function') {
    return fn(params);
  }
  return '';
}
