/**
 * Builds standard JSON request headers attaching signed Telegram WebApp initData
 * whenever running inside Telegram.
 */
export function getTelegramHeaders(includeContentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  try {
    const tg = (
      window as unknown as {
        Telegram?: { WebApp?: { initData?: string } };
      }
    )?.Telegram?.WebApp;
    if (tg?.initData) {
      headers['x-telegram-init-data'] = tg.initData;
    }
  } catch {}
  return headers;
}
