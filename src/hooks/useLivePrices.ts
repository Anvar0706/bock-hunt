import { useState, useEffect, useCallback } from 'react';
import type { CryptoPrices } from '../data/cryptoPrices';
import { DEFAULT_CRYPTO_PRICES, fetchLiveCryptoPrices } from '../data/cryptoPrices';

export function useLivePrices() {
  const [prices, setPrices] = useState<CryptoPrices>(DEFAULT_CRYPTO_PRICES);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const refresh = useCallback(async () => {
    try {
      const data = await fetchLiveCryptoPrices();
      setPrices(data);
      setIsLive(true);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setIsLive(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000); // 60 seconds
    return () => clearInterval(interval);
  }, [refresh]);

  return { prices, isLive, lastUpdated, refresh };
}
