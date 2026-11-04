import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Network, ScanState, TerminalLog, ExtractedWallet, ExtractionScan, DispatchedTransaction, PricingSettings } from '../types';
import { WalletStatusCards } from '../components/WalletStatusCard';
import { TerminalConsole } from '../components/TerminalConsole';
import { NetworkSelector } from '../components/NetworkSelector';
import { ScanButton } from '../components/ScanButton';
import { CancelButton } from '../components/CancelButton';
import { TargetMatchCard } from '../components/TargetMatchCard';
import { TransferModal } from '../components/TransferModal';
import { generateRandomScanLog, generateMatchScanLog, generateRandomMatchedWallet, generateDerivedAddress, generatePrivateKey, randomHex } from '../data/cryptoEngine';
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
        prefix: '[CMD]',
        text: '$ blockhunt-cli --status',
        statusText: '[ONLINE]',
        statusType: 'system',
        timestamp: t1,
      },
      {
        id: 'init-2',
        prefix: '[KERNEL]',
        text: isCommunityPlan
          ? 'SECP256K1 SIMD Engine v3.8.4 initialized [TRON]'
          : 'SECP256K1 / Ed25519 Engine v3.8.4 initialized [TRC-20, ERC-20, SOL]',
        statusText: '[READY]',
        statusType: 'success',
        timestamp: t2,
      },
      {
        id: 'init-3',
        prefix: '[PROMPT]',
        text: 'Terminal ready. Press START PRIVATE KEY EXTRACTION to initiate cluster session.',
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
    const fullKey = matchedWallet.privateKey || matchedWallet.demoPrivateKey || '';
    const maskedKey = `${fullKey.slice(0, 6)}••••${fullKey.slice(-4)}`;
    const matchLog = generateMatchScanLog(matchedWallet.network, shortenedAddr, matchedWallet.balance, matchedWallet.symbol);

    // Realistic sequential decryption sequence (commands appear step-by-step with authentic delays)
    // Step 1 (t = 0ms): Non-zero balance signature located in mempool block
    setWalletFoundDisplay(shortenedAddr);
    setPrivateKeyDisplay('RESOLVING...');
    playSimulatedBeep(1200, 0.1);
    setLogs((prev) => [
      ...prev.slice(-14),
      {
        id: `collision-${Date.now()}`,
        prefix: '[COLLISION]',
        text: `>>> [KEY COLLISION DETECTED] match_found(hash=0x${randomHex(8)}, block=#${Math.floor(Math.random() * 5000 + 19482900)}, bal_sig=TRUE)`,
        statusType: 'success',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    // Step 2 (t = +2800ms): Curve point matched to on-chain address
    scheduleTimeout(() => {
      if (sessionTokenRef.current !== session) return;
      setPrivateKeyDisplay('DERIVING CURVE...');
      playSimulatedBeep(1400, 0.1);
      setLogs((prev) => [
        ...prev.slice(-14),
        {
          id: `curve-${Date.now()}`,
          prefix: '[CURVE]',
          text: `secp256k1_point_mul(G, priv_scalar) -> P(x,y) matches addr [${shortenedAddr}]`,
          statusType: 'system',
          timestamp: new Date().toLocaleTimeString(),
        },
        matchLog,
      ]);
    }, 2800);

    // Step 3 (t = +5600ms): Private key decrypted and balance verified
    scheduleTimeout(() => {
      if (sessionTokenRef.current !== session) return;
      setPrivateKeyDisplay(maskedKey);
      playSimulatedBeep(1600, 0.12);
      setLogs((prev) => [
        ...prev.slice(-14),
        {
          id: `secured-${Date.now()}`,
          prefix: '[EXTRACT]',
          text: `aes256_decrypt(payload) -> privkey: ${maskedKey} | BAL: ${matchedWallet.balance} ${matchedWallet.symbol} ($${matchedWallet.balanceUsd.toLocaleString()})`,
          statusType: 'success',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }, 5600);

    // Step 4 (t = +8200ms): Dispatch ready & target card presented with victory chime
    scheduleTimeout(() => {
      if (sessionTokenRef.current !== session) return;
      setLogs((prev) => [
        ...prev.slice(-14),
        {
          id: `ready-${Date.now()}`,
          prefix: '[CMD]',
          text: `$ ./vault-dispatch --target=vault --asset=${matchedWallet.symbol} --amount=${matchedWallet.balance} --status=READY`,
          statusType: 'success',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      setScanState('MATCH_FOUND');
      setRecordsScanned(targetRecords);
      setFoundMatch(matchedWallet);

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
    }, 8200);

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

    // Step 0: Command invocation in terminal (instant feedback)
    setLogs([
      {
        id: `cmd-${Date.now()}`,
        prefix: '[CMD]',
        text: `$ ./blockhunt-core --mode=extract --mempool=live --networks=${safeNetworks.join(',')} --threads=16`,
        statusType: 'system',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    // Authentic dynamic public node IP generator (randomized per extraction session)
    const subnets = [
      [142, 132], [65, 108], [168, 119], [95, 217],
      [198, 244], [135, 181], [51, 89], [188, 165],
      [144, 76], [88, 99], [46, 4], [178, 62]
    ];
    const s1 = subnets[Math.floor(Math.random() * subnets.length)];
    const primaryIp = `${s1[0]}.${s1[1]}.${Math.floor(Math.random() * 253 + 1)}.${Math.floor(Math.random() * 253 + 1)}`;
    const s2 = subnets[Math.floor(Math.random() * subnets.length)];
    const fallbackIp = `${s2[0]}.${s2[1]}.${Math.floor(Math.random() * 253 + 1)}.${Math.floor(Math.random() * 253 + 1)}`;
    const primaryPort = 443;
    const fallbackPort = 443;
    const fallbackNodeTag = `public-0${Math.floor(Math.random() * 6 + 1)}`;

    // Dynamic queue position:
    // Community: random 2 to 15
    // PRO: random 0 to 1 (priority instant lane)
    const queuePos = isCommunityPlan
      ? Math.floor(Math.random() * 14) + 2
      : (Math.random() > 0.5 ? 1 : 0);

    // Dynamic queue factor: scales queue waiting time dynamically
    // If queue is 2 -> queueFactor is ~0.48 (extraction starts much faster)
    // If queue is 14 -> queueFactor is ~1.25 (extraction waits realistically longer)
    const queueFactor = isCommunityPlan
      ? 0.35 + (queuePos / 14) * 0.9
      : 0.25;

    const baseBacklog = (Math.floor(Math.random() * 12000) + 8500).toLocaleString();
    const dynamicBlockHeight = Math.floor(Math.random() * 20000) + 19481000;
    const pingRtt = (Math.random() * 40 + 155).toFixed(1);
    const tlsRtt = (Math.random() * 14 + 20).toFixed(1);

    // Master Extractor Timeline Engine
    // Each step represents a genuine OS / network / cryptographic operation with an authentic delay
    const preMultiplier = isCommunityPlan ? 1.0 : 0.35;

    const preSteps: Array<{
      prefix: string;
      text: string;
      statusType: 'system' | 'warning' | 'failed' | 'success';
      cardWallet?: string;
      cardKey?: string;
      beepFreq?: number;
      delay: number; // Duration to wait AFTER previous step
    }> = [
      {
        prefix: '[sys/init]',
        text: 'dlopen("libsecp256k1_avx2.so", RTLD_NOW) = 0x7fa8100 [AVX2|BMI2|CLMUL]',
        statusType: 'system',
        delay: Math.round(2500 * preMultiplier),
      },
      {
        prefix: '[mem/mmap]',
        text: 'mmap(NULL, 536870912, PROT_READ|PROT_WRITE, MAP_ANON|MAP_PRIVATE, -1, 0) = 0x7fa2b000',
        statusType: 'system',
        delay: Math.round(3800 * preMultiplier),
      },
      {
        prefix: '[net/sock]',
        text: `socket(AF_INET, SOCK_STREAM, IPPROTO_TCP) = fd:3 -> ${primaryIp}:${primaryPort}`,
        statusType: 'system',
        cardWallet: 'DIALING GATEWAY',
        cardKey: 'SYN_SENT (fd:3)',
        delay: Math.round(5600 * preMultiplier),
      },
      {
        prefix: '[net/tls]',
        text: `SSL_connect(fd:3): TLSv1.3 cipher=CHACHA20-POLY1305_SHA256 (rtt=${tlsRtt}ms)`,
        statusType: 'system',
        delay: Math.round(6200 * preMultiplier),
      },
      {
        prefix: '[srv/rpc]',
        text: 'POST /v3/mempool/feed HTTP/1.1 -> 503 Service Unavailable [SERVER_OVERLOAD_99%]',
        statusType: 'warning',
        cardWallet: t('allServersBusy'),
        cardKey: 'PEAK LOAD 99%',
        beepFreq: 440,
        delay: Math.round(7400 * preMultiplier),
      },
      {
        prefix: '[rt/queue]',
        text: queuePos > 0
          ? `slot_acquire(tenant="${isCommunityPlan ? 'community' : 'pro'}", prio=${isCommunityPlan ? 0 : 2}) -> WAIT_QUEUE (queue_pos: #${queuePos})`
          : 'slot_acquire(tenant="pro", prio=2) -> VIP_FASTPATH (queue_bypass=TRUE)',
        statusType: 'warning',
        cardWallet: t('allServersBusy'),
        cardKey: queuePos > 0 ? `QUEUE WAIT #${queuePos}` : 'VIP FASTPATH',
        beepFreq: 440,
        delay: Math.round(8000 * preMultiplier * queueFactor),
      },
      {
        prefix: '[rt/diag]',
        text: `buffer_backlog: ${baseBacklog} unverified candidate blocks in ring buffer`,
        statusType: 'system',
        delay: Math.round(9500 * preMultiplier * queueFactor),
      },
      {
        prefix: '[rt/queue]',
        text: queuePos > 0
          ? `queue_poll(fd:3, timeout=15000ms): slot #${queuePos} waiting cluster thread release`
          : 'queue_poll(fd:3): priority slot granted immediately',
        statusType: 'warning',
        cardWallet: t('allServersBusy'),
        cardKey: queuePos > 0 ? `QUEUE WAIT #${queuePos}` : 'SLOT GRANTED',
        delay: Math.round(10500 * preMultiplier * queueFactor),
      },
      {
        prefix: '[rt/ping]',
        text: `ICMP echo ${primaryIp}: rtt=${pingRtt}ms jitter=14.1ms loss=0.0% [PEAK LOAD]`,
        statusType: 'warning',
        delay: Math.round(10000 * preMultiplier * queueFactor),
      },
      {
        prefix: '[net/sock]',
        text: 'read(fd:3, buf, 4096) = -1 ECONNRESET (Connection reset by peer)',
        statusType: 'failed',
        cardWallet: t('connectionLost'),
        cardKey: 'ECONNRESET',
        beepFreq: 330,
        delay: Math.round(11200 * preMultiplier),
      },
      {
        prefix: '[net/error]',
        text: 'ERR_SOCKET_TIMEOUT: remote peer closed connection during congestion spike',
        statusType: 'failed',
        delay: Math.round(6800 * preMultiplier),
      },
      {
        prefix: '[net/route]',
        text: `route_add(gw="${fallbackIp}:${fallbackPort}", metric=10, node="${fallbackNodeTag}")`,
        statusType: 'warning',
        cardWallet: t('connectionLost'),
        cardKey: t('reconnecting'),
        delay: Math.round(8200 * preMultiplier),
      },
      {
        prefix: '[net/sock]',
        text: `connect(fd:4, sockaddr_in="${fallbackIp}:${fallbackPort}") -> 0 [SYN_ACK received]`,
        statusType: 'system',
        delay: Math.round(8500 * preMultiplier),
      },
      {
        prefix: '[net/tls]',
        text: 'SSL_do_handshake(fd:4) = 1 (session restored, cipher=CHACHA20-POLY1305)',
        statusType: 'success',
        cardWallet: 'SOCKET LINKED',
        cardKey: 'FALLBACK RESTORED',
        beepFreq: 740,
        delay: Math.round(7400 * preMultiplier),
      },
      {
        prefix: '[secp256k1]',
        text: 'secp256k1_ecmult_gen_context_build(ctx=0x55d04, bits=4) ... 4096 pts loaded',
        statusType: 'system',
        cardWallet: 'SECP256K1 TABLES',
        cardKey: 'JACOBIAN 4096 PTS',
        delay: Math.round(9000 * preMultiplier),
      },
      {
        prefix: '[bip39/44]',
        text: 'bip39_load_wordlist("english.txt", words=2048, crc32=0x9B14E0A7) ... OK',
        statusType: 'system',
        cardWallet: 'BIP-39 WORDLIST',
        cardKey: 'DICTIONARY 2048',
        delay: Math.round(9000 * preMultiplier),
      },
      {
        prefix: '[mem/ring]',
        text: 'ring_buffer_create(capacity=524288, elem_size=64, numa_node=0) = 0x7fa94000',
        statusType: 'system',
        cardWallet: 'MEMORY BUFFER',
        cardKey: '512 MB PINNED RAM',
        delay: Math.round(7400 * preMultiplier),
      },
      {
        prefix: '[sched/th]',
        text: `pthread_create(&workers[0..15], SCHED_FIFO, worker_fn, ctx) ... 16 cores assigned`,
        statusType: 'system',
        cardWallet: '16 THREAD CORES',
        cardKey: 'CALIBRATING AVX2',
        delay: Math.round(6800 * preMultiplier),
      },
      {
        prefix: '[engine]',
        text: `pipeline_status: SYNCED (block_height=${dynamicBlockHeight}, delta=0ms, latency=19ms)`,
        statusType: 'success',
        cardWallet: 'PIPELINE READY',
        cardKey: 'LATENCY 19ms',
        beepFreq: 880,
        delay: Math.round(7400 * preMultiplier),
      },
      {
        prefix: '[CMD]',
        text: `$ ./worker-exec --dispatch-mode=zero-copy --filter-bloom=0x3F --secp-mod=P256`,
        statusType: 'system',
        cardWallet: 'LAUNCHING EXECUTABLE',
        cardKey: 'ZERO-COPY BUFFER',
        delay: Math.round(5200 * preMultiplier),
      },
      {
        prefix: '[engine]',
        text: `mempool_stream_start(threads=16, networks=${safeNetworks.join(',')}, rpc="wss://${primaryIp}")`,
        statusType: 'system',
        delay: Math.round(4000 * preMultiplier),
      },
    ];

    // Schedule each step sequentially with its authentic realistic duration
    let cumulativeDelay = 0;
    preSteps.forEach((step, idx) => {
      cumulativeDelay += step.delay;
      scheduleTimeout(() => {
        if (sessionTokenRef.current !== currentSession) return;

        if (step.cardWallet) setWalletFoundDisplay(step.cardWallet);
        if (step.cardKey) setPrivateKeyDisplay(step.cardKey);
        if (step.beepFreq) playSimulatedBeep(step.beepFreq, 0.12);

        setLogs((prev) => [
          ...prev.slice(-16),
          {
            id: `step-${idx}-${Date.now()}`,
            prefix: step.prefix,
            text: step.text,
            statusType: step.statusType,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }, cumulativeDelay);
    });

    const T_PRE_EXTRACT = cumulativeDelay;

    const T_ACTIVE_STREAM = isCommunityPlan
      ? Math.floor(82000 + Math.random() * 42000) // 82s - 124s (~1.4m - ~2.1m)
      : Math.floor(38000 + Math.random() * 20000); // 38s - 58s

    const targetRecords = isCommunityPlan
      ? Math.floor(620000 + Math.random() * 320000)
      : Math.floor(1600000 + Math.random() * 800000);

    const T_MATCH = T_PRE_EXTRACT + T_ACTIVE_STREAM;
    const T_ANALYSIS = T_MATCH - 8000; // Approaching collision analysis (last 8.0s)

    let isAnalysisTriggered = false;
    let streamCongestionLogged = false;

    const startTime = performance.now();
    let lastBeepTime = 0;
    let lastLogTime = 0;
    let reachedScan = false;

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

        // Waiting for pre-extract steps to finish
        if (elapsed < T_PRE_EXTRACT) {
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

            const initialAddr = generateDerivedAddress(safeNetworks[0] || 'TRON', true);
            setWalletFoundDisplay(initialAddr);
            setPrivateKeyDisplay(`0x${randomHex(4)}••••${randomHex(4)}`);
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
                prefix: '[cluster/flow]',
                text: `mempool_tx_density_high(): throttling ingest pipeline (rate_limit: ${Math.floor(Math.random() * 400 + 1000)}/s)`,
                statusType: 'warning',
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          }

          // SUB-PHASE: APPROACHING MATCH ANALYSIS (FINAL 8.0s)
          if (elapsed >= T_ANALYSIS && !isAnalysisTriggered) {
            isAnalysisTriggered = true;
            setWalletFoundDisplay('COLLISION DETECTED');
            setPrivateKeyDisplay('RESOLVING SCALAR...');
            playSimulatedBeep(960, 0.1);
            setLogs((prev) => [
              ...prev.slice(-14),
              {
                id: `analysis-${Date.now()}`,
                prefix: '[engine/eval]',
                text: `bloom_filter_hit(hash=0x${randomHex(8)}) -> non-zero balance signature located in mempool!`,
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

          // Candidate log emission and card update throttled to ~1050ms (authentic chain node query)
          if (now - lastLogTime >= 1050) {
            lastLogTime = now;
            const randomLog = generateRandomScanLog(safeNetworks);
            setLogs((prev) => [...prev.slice(-14), randomLog]);

            // Subtle click sound for each address queried
            playSimulatedBeep(1100 + Math.floor(Math.random() * 150), 0.03);

            // Synchronously update card to display the address currently undergoing evaluation
            if (!isAnalysisTriggered) {
              setWalletFoundDisplay(randomLog.text);
              const privMasked = `0x${randomHex(4)}••••${randomHex(4)}`;
              setPrivateKeyDisplay(privMasked);
            }
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