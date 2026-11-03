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

// Pre-generated static candidate pool to eliminate string allocations & GC pauses during scanning
const CANDIDATE_POOL = [
  { addr: '0x71C8...49b2', key: '0x19a2••••7b3f' },
  { addr: 'TY4KP...x5g6', key: '0x49c1••••9e2a' },
  { addr: 'Ru2kT...Cmo4', key: '0x88f2••••11dc' },
  { addr: '0xe913...a430', key: '0x33b4••••cc71' },
  { addr: 'TLyQk...RC8r', key: '0x712a••••ee94' },
  { addr: '5qMr4...5Mi', key: '0x9901••••42fa' },
  { addr: '0x6956...eb5', key: '0x55aa••••0012' },
  { addr: 'TR7NH...99z1', key: '0xaa76••••3981' },
  { addr: '7XqPL...nN3k', key: '0x621c••••77b9' },
  { addr: '0x14f1...471A', key: '0xbb44••••1255' },
  { addr: 'TE2R4...kk42', key: '0xcc19••••88a2' },
  { addr: '3mK9x...wL0p', key: '0xee99••••4411' },
  { addr: '0x882b...99ca', key: '0x2213••••ef88' },
  { addr: 'TJ9xQ...pQ21', key: '0x7765••••3399' },
  { addr: '9pPqw...aZ88', key: '0x1092••••bb34' },
  { addr: '0x32a8...51ff', key: '0x4490••••1177' },
  { addr: 'TV12a...bB00', key: '0x8833••••6622' },
  { addr: '2hHjk...kK99', key: '0x99aa••••5544' },
];

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

  // Free community tier limit: only 1 wallet extraction allowed
  const isCommunityPlan = activePlan === 'community';
  const isLimitReached = isCommunityPlan && communityExtractsCount >= 1;

  // Networks selected: Community starts with 1 network ('TRON'), PRO/Enterprise with all 3
  const [selectedNetworks, setSelectedNetworks] = useState<Network[]>(() =>
    isCommunityPlan ? ['TRON'] : ['TRON', 'ETHEREUM', 'SOLANA']
  );

  // Enforce single network constraint whenever user is on Community tier
  useEffect(() => {
    if (isCommunityPlan && selectedNetworks.length > 1) {
      setSelectedNetworks([selectedNetworks[0] || 'TRON']);
    }
  }, [isCommunityPlan]);


  // Scan state
  const [scanState, setScanState] = useState<ScanState>('IDLE');
  const [recordsScanned, setRecordsScanned] = useState(0);
  const [foundMatch, setFoundMatch] = useState<ExtractedWallet | null>(null);
  const [transferModalWallet, setTransferModalWallet] = useState<ExtractedWallet | null>(null);
  const [limitAlertOpen, setLimitAlertOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Status Cards Display Text
  const [walletFoundDisplay, setWalletFoundDisplay] = useState('N/A');
  const [privateKeyDisplay, setPrivateKeyDisplay] = useState('N/A');

  // Initial terminal logs
  const [logs, setLogs] = useState<TerminalLog[]>(() => {
    const now = new Date();
    const t1 = new Date(now.getTime() - 2000).toLocaleTimeString();
    const t2 = new Date(now.getTime() - 1000).toLocaleTimeString();
    const t3 = now.toLocaleTimeString();
    return [
      {
        id: 'init-1',
        prefix: '[SYSTEM]',
        text: 'BlockHunt Protocol v3.8 initialized',
        statusText: '[ONLINE]',
        statusType: 'system',
        timestamp: t1,
      },
      {
        id: 'init-2',
        prefix: '[NETWORK]',
        text: isCommunityPlan ? 'Single-chain network engine ready [TRON]' : 'Network clusters ready [TRC-20, ERC-20, SOL]',
        statusText: '[READY]',
        statusType: 'success',
        timestamp: t2,
      },
      {
        id: 'init-3',
        prefix: '[STANDBY]',
        text: 'System standby. Tap START PRIVATE KEY EXTRACTION to configure environment & begin extraction.',
        statusText: '[STANDBY]',
        statusType: 'system',
        timestamp: t3,
      },
    ];
  });

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

  // Haptic audio feedback beep using singleton Web Audio API with auto-disconnect
  const playAudioBeep = useCallback((freq: number = 880, duration: number = 0.08) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      const audioCtx = audioCtxRef.current;
      if (!audioCtx || audioCtx.state === 'closed') return;
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

  // Toggle network selection (Community: strictly 1 chain; PRO/Enterprise: multi-chain parallel)
  const handleToggleNetwork = useCallback((network: Network) => {
    if (isScanning) return;

    // Telegram Haptic feedback
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    } catch {}

    if (isCommunityPlan) {
      if (selectedNetworks.includes(network)) {
        playAudioBeep(520, 0.04);
        return;
      }
      // Seamless single-chain radio switch: instant, silent, zero alert popups
      setSelectedNetworks([network]);
      playAudioBeep(740, 0.05);
      return;
    }

    // PRO / Enterprise: multi-chain parallel selection
    playAudioBeep(640, 0.05);
    setSelectedNetworks((prev) => {
      if (prev.includes(network)) {
        return prev.length > 1 ? prev.filter((n) => n !== network) : prev;
      } else {
        return [...prev, network];
      }
    });
  }, [isScanning, isCommunityPlan, selectedNetworks, playAudioBeep]);

  const handleOpenTransferModal = useCallback((wallet: ExtractedWallet) => {
    setTransferModalWallet(wallet);
  }, []);

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

    // Add to global state so it reflects in wallet vault (App.tsx increments communityExtractsCount once here)
    try {
      if (onWalletFound) {
        onWalletFound(matchedWallet);
      }
    } catch (err) {
      console.error('[BlockHunt] onWalletFound error:', err);
    }

    // Persist synchronous free tier usage count to localStorage
    try {
      if (isCommunityPlan) {
        try {
          window.localStorage.setItem('shark_community_extracts', String(Math.max(communityExtractsCount + 1, 1)));
        } catch {}
      }
    } catch (err) {
      console.error('[BlockHunt] community extracts storage error:', err);
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

    // Safety guard: if user switched tabs while verification was in-flight, abort cleanly
    if (!isMountedRef.current) {
      isStartingRef.current = false;
      return;
    }

    setIsVerifying(false);
    isStartingRef.current = false;

    // Stop any stale timers and obtain unique session token
    clearAllTimers();
    const currentSession = sessionTokenRef.current;
    matchTriggeredSessionRef.current = null;

    const safeNetworks =
      isCommunityPlan
        ? ([selectedNetworks[0] || 'TRON'] as Network[])
        : selectedNetworks && selectedNetworks.length > 0
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

    // Master Extractor Timeline Engine
    // Phase 1: Pre-Extract (Environment Setup, Cluster Sockets, Server Pressure)
    //   - Community: 50s to 120s (dynamic randomized in 55s - 105s window)
    //   - PRO / Enterprise: 15s to 25s (VIP priority cluster link)
    let T_PRE_EXTRACT: number;
    let T_ACTIVE_STREAM: number;
    let targetRecords: number;

    if (isCommunityPlan) {
      T_PRE_EXTRACT = Math.floor(55000 + Math.random() * 50000); // 55s - 105s (within 50-120s)
      T_ACTIVE_STREAM = Math.floor(25000 + Math.random() * 15000); // 25s - 40s
      targetRecords = Math.floor(620000 + Math.random() * 320000);
    } else {
      T_PRE_EXTRACT = Math.floor(14000 + Math.random() * 10000); // 14s - 24s
      T_ACTIVE_STREAM = Math.floor(12000 + Math.random() * 6000); // 12s - 18s
      targetRecords = Math.floor(1600000 + Math.random() * 800000);
    }

    const T_MATCH = T_PRE_EXTRACT + T_ACTIVE_STREAM;
    const T_ANALYSIS = T_MATCH - 2800; // Approaching collision analysis (last 2.8s)

    let isAnalysisTriggered = false;
    let preStep1 = false;
    let preStep2 = false;
    let preStep3 = false;
    let preStep4 = false;
    let preStep5 = false;
    let streamCongestionLogged = false;

    const startTime = performance.now();
    let lastBeepTime = 0;
    let lastLogTime = 0;
    let reachedScan = false;
    let candidateIdx = 0;

    // Master Monotonic Ticker (tuned to 220ms: blazingly fast, eliminates layout thrashing & GC churn)
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

        // ========================================================
        // 1. PRE-EXTRACT PHASE (Environment Setup, Cluster Sockets, Server Pressure)
        // Duration: 50 - 120s (Community), 14 - 24s (PRO)
        // ========================================================
        if (elapsed < T_PRE_EXTRACT) {
          const preProgress = elapsed / T_PRE_EXTRACT;

          // Sub-stage 1: Initial Socket & Sandbox (0 - 15%)
          if (preProgress < 0.15 && !preStep1) {
            preStep1 = true;
            setWalletFoundDisplay(t('connecting'));
            setPrivateKeyDisplay(t('handshake'));
          }

          // Sub-stage 2: Severe Server Pressure & Queue (15% - 42%)
          if (preProgress >= 0.15 && preProgress < 0.42 && !preStep2) {
            preStep2 = true;
            setWalletFoundDisplay(t('allServersBusy'));
            setPrivateKeyDisplay('QUEUE WAIT #14');
            playSimulatedBeep(440, 0.16);
            setLogs((prev) => [
              ...prev.slice(-14),
              {
                id: `load-${Date.now()}`,
                text: '> [SERVER OVERLOAD] High mempool cluster load detected (99.4% capacity)!',
                statusText: '[ALL SERVERS BUSY]',
                statusType: 'warning',
                timestamp: new Date().toLocaleTimeString(),
              },
              {
                id: `queue-${Date.now()}`,
                text: '> [QUEUE POSITION #14] Public community slot pending. Priority lanes allocated to PRO tiers.',
                statusText: '[QUEUE WAIT]',
                statusType: 'warning',
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          }

          // Sub-stage 3: Connection Dropped / Lost (42% - 68%)
          if (preProgress >= 0.42 && preProgress < 0.68 && !preStep3) {
            preStep3 = true;
            setWalletFoundDisplay(t('connectionLost'));
            setPrivateKeyDisplay(t('reconnecting'));
            playSimulatedBeep(330, 0.22);
            setLogs((prev) => [
              ...prev.slice(-14),
              {
                id: `lost-${Date.now()}`,
                text: '> [CONNECTION LOST] Socket handshake dropped due to peak server pressure.',
                statusText: '[DROPPED]',
                statusType: 'failed',
                timestamp: new Date().toLocaleTimeString(),
              },
              {
                id: `retry-${Date.now()}`,
                text: '> [RECONNECTING] Dialing fallback cluster node [BlockHunt-Public-03:443]...',
                statusText: '[RE-ESTABLISHING]',
                statusType: 'warning',
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          }

          // Sub-stage 4: Fallback Node Linked & Memory Allocation (68% - 88%)
          if (preProgress >= 0.68 && preProgress < 0.88 && !preStep4) {
            preStep4 = true;
            setWalletFoundDisplay(t('environmentInit') || 'ENVIRONMENT SETUP');
            setPrivateKeyDisplay('BUFFERING HEAP');
            playSimulatedBeep(740, 0.08);
            setLogs((prev) => [
              ...prev.slice(-14),
              {
                id: `restored-${Date.now()}`,
                text: '> [HANDSHAKE RESTORED] Fallback node accepted connection.',
                statusText: '[RESTORED]',
                statusType: 'success',
                timestamp: new Date().toLocaleTimeString(),
              },
              {
                id: `heap-${Date.now()}`,
                text: '> Allocating 512MB RAM extraction buffer for SECP256K1 scalar points...',
                statusType: 'system',
                timestamp: new Date().toLocaleTimeString(),
              },
              {
                id: `mount-${Date.now()}`,
                text: '> Mounting BIP-39 & BIP-44 dictionary permutation seeds...',
                statusType: 'system',
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          }

          // Sub-stage 5: Environment Ready (88% - 100%)
          if (preProgress >= 0.88 && !preStep5) {
            preStep5 = true;
            setWalletFoundDisplay('ENVIRONMENT READY');
            setPrivateKeyDisplay('LAUNCHING...');
            playSimulatedBeep(880, 0.12);
            setLogs((prev) => [
              ...prev.slice(-14),
              {
                id: `ready-${Date.now()}`,
                text: '> [ENVIRONMENT READY] All cluster nodes synchronized. Pre-extract phase complete!',
                statusText: '[READY]',
                statusType: 'success',
                timestamp: new Date().toLocaleTimeString(),
              },
              {
                id: `launch-${Date.now()}`,
                text: `> Commencing ${safeNetworks.length > 1 ? 'multi-core parallel' : 'single-core'} private key extraction on [${safeNetworks.join(', ')}]...`,
                statusType: 'system',
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          }

          return;
        }

        // ========================================================
        // 2. ACTIVE EXTRACTION STREAM PHASE (T_PRE_EXTRACT <= elapsed < T_MATCH)
        // ========================================================
        if (elapsed >= T_PRE_EXTRACT && elapsed < T_MATCH) {
          if (!reachedScan) {
            reachedScan = true;
            setScanState('SCANNING');
            playSimulatedBeep(520, 0.12);

            const firstCand = CANDIDATE_POOL[0];
            setWalletFoundDisplay(firstCand.addr);
            setPrivateKeyDisplay(firstCand.key);
          }

          // Mid-stream temporary congestion bump (at ~45% into active stream)
          const streamElapsed = elapsed - T_PRE_EXTRACT;
          const streamDuration = T_MATCH - T_PRE_EXTRACT;
          const streamProgress = Math.min(1.0, Math.max(0.0, streamElapsed / streamDuration));

          if (streamProgress >= 0.45 && streamProgress < 0.58 && !streamCongestionLogged) {
            streamCongestionLogged = true;
            playSimulatedBeep(480, 0.1);
            setLogs((prev) => [
              ...prev.slice(-14),
              {
                id: `stream-busy-${Date.now()}`,
                text: '> [SERVER PRESSURE] Heavy mempool block density. Temporary pipeline throttling...',
                statusText: '[SERVER LOAD]',
                statusType: 'warning',
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          }

          // SUB-PHASE: APPROACHING MATCH ANALYSIS (FINAL 2.8s)
          if (elapsed >= T_ANALYSIS && !isAnalysisTriggered) {
            isAnalysisTriggered = true;
            setWalletFoundDisplay(t('analyzing'));
            setPrivateKeyDisplay(t('buffering'));
            playSimulatedBeep(960, 0.1);
            setLogs((prev) => [
              ...prev.slice(-14),
              {
                id: `analysis-${Date.now()}`,
                text: '> [POTENTIAL COLLISION] Non-zero balance signature detected in active mempool block! Resolving scalar curve points...',
                statusText: '[ANALYZING]',
                statusType: 'system',
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          }

          // Dynamic records counter (monotonically ascending during active stream)
          const jitter = Math.sin(streamElapsed / 220) * 110;
          const dynamicRecords = Math.min(
            targetRecords,
            Math.max(150, Math.floor(streamProgress * targetRecords + jitter))
          );
          setRecordsScanned(dynamicRecords);

          // Live rotate candidate address and key from pre-allocated pool
          if (!isAnalysisTriggered) {
            const cand = CANDIDATE_POOL[candidateIdx % CANDIDATE_POOL.length];
            candidateIdx++;
            setWalletFoundDisplay(cand.addr);
            setPrivateKeyDisplay(cand.key);
          }

          // Subtle click sound (every ~1.2s)
          if (now - lastBeepTime > 1200) {
            lastBeepTime = now;
            playSimulatedBeep(1100 + Math.floor(Math.random() * 150), 0.03);
          }

          // Throttle candidate log emissions to ~380ms to keep DOM lean
          if (now - lastLogTime >= 380) {
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
    }, 220);

    // Hard fail-safe watchdog timer
    scheduleTimeout(() => {
      if (sessionTokenRef.current === currentSession) {
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
        triggerMatchEvent(currentSession, safeNetworks, targetRecords);
      }
    }, T_MATCH + 500);
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
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearAllTimers();
      onScanningChange?.(false);
      if (audioCtxRef.current) {
        if (audioCtxRef.current.state !== 'closed') {
          try {
            audioCtxRef.current.close().catch(() => {});
          } catch {}
        }
        audioCtxRef.current = null;
      }
    };
  }, [onScanningChange]);

  return (
    <div className="w-full pb-32 animate-fadeIn">
      {/* 1. Wallet Status Cards */}
      <div id="tour-wallet-cards" className="w-full">
        <WalletStatusCards
          walletFoundText={walletFoundDisplay}
          privateKeyText={privateKeyDisplay}
          isMatched={Boolean(foundMatch)}
          isScanning={isScanning}
        />
      </div>

      {/* 2. Hero Terminal Console */}
      <div id="tour-terminal-console" className="w-full">
        <TerminalConsole
          logs={logs}
          scanState={scanState}
          recordsScanned={recordsScanned}
          matchedWallet={foundMatch}
          onTransfer={handleOpenTransferModal}
        />
      </div>

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
      <div id="tour-network-selector" className="w-full">
        <NetworkSelector
          selectedNetworks={selectedNetworks}
          onToggleNetwork={handleToggleNetwork}
          disabled={isScanning}
          activePlan={activePlan}
          onOpenLicensing={onOpenLicensing}
        />
      </div>

      {/* 5. Main Action CTA Buttons */}
      <div id="tour-scan-cta" className="w-full px-4 mb-4 space-y-2.5">
        {isScanning ? (
          <CancelButton onClick={handleCancelScan} />
        ) : foundMatch ? (
          <>
            {/* Direct High-Contrast Action Button when wallet is matched */}
            <button
              onClick={() => setTransferModalWallet(foundMatch)}
              type="button"
              className="w-full py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2.5 relative overflow-hidden font-bold tracking-wider text-xs uppercase bg-[#00E676] hover:bg-[#00C853] text-black shadow-[0_4px_16px_rgba(0,230,118,0.25)] active:scale-98 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>{t('withdrawAssets')}: {foundMatch.balance} {foundMatch.symbol} (${foundMatch.balanceUsd.toLocaleString()})</span>
            </button>

            <button
              onClick={() => {
                const isMatchDispatched = foundMatch.status === 'DISPATCHED' || parseFloat(String(foundMatch.balance || '0').replace(/,/g, '')) === 0;
                if (!isMatchDispatched) {
                  const confirmMsg = language === 'ru' 
                    ? 'У вас есть найденный кошелек с балансом. Начать новое сканирование?' 
                    : 'A target wallet is ready to withdraw. Starting a new scan will archive this session. Continue?';
                  if (!window.confirm(confirmMsg)) {
                    return;
                  }
                }
                handleStartScan();
              }}
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
                  {t('communityCapExceeded')}
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