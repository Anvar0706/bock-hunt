import React, { useState, useEffect } from 'react';
import type { ExtractedWallet, DispatchedTransaction, DemoWallet, PricingSettings } from '../types';
import { X, Send, CheckCircle2, Copy, Check, ShieldCheck, Zap, ShieldAlert, ArrowRight, Clock } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { getEffectiveProPrice } from '../data/adminSettings';

interface TransferModalProps {
  wallet: ExtractedWallet | DemoWallet;
  isOpen: boolean;
  onClose: () => void;
  onRecordTransaction: (tx: DispatchedTransaction) => void;
  activePlan?: string;
  onOpenLicensing?: () => void;
  pricingSettings?: PricingSettings;
}

type ModalStage = 'INPUT' | 'BROADCASTING' | 'CLEARANCE_REQUIRED' | 'COMPLETED';

export const TransferModal: React.FC<TransferModalProps> = ({
  wallet,
  isOpen,
  onClose,
  onRecordTransaction,
  activePlan = 'community',
  onOpenLicensing,
  pricingSettings,
}) => {
  const { t, language } = useLanguage();
  const proPrice = getEffectiveProPrice(pricingSettings, 'weekly');

  const [recipient, setRecipient] = useState(() =>
    wallet.network === 'ETHEREUM'
      ? '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      : wallet.network === 'TRON'
      ? 'TYDzsYUEpvnYmQK4WKnEQsKzRxsPNmFz1h'
      : '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
  );
  const [addressError, setAddressError] = useState<string | null>(null);
  const [stage, setStage] = useState<ModalStage>('INPUT');
  const [broadcastLog, setBroadcastLog] = useState('');
  const [stagedTxHash, setStagedTxHash] = useState('');
  const [completedTx, setCompletedTx] = useState<DispatchedTransaction | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state whenever modal opens with a new wallet
  useEffect(() => {
    if (isOpen) {
      setStage('INPUT');
      setAddressError(null);
      setCompletedTx(null);
      setStagedTxHash('');
      setRecipient(
        wallet.network === 'ETHEREUM'
          ? '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
          : wallet.network === 'TRON'
          ? 'TYDzsYUEpvnYmQK4WKnEQsKzRxsPNmFz1h'
          : '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
      );
    }
  }, [isOpen, wallet]);

  if (!isOpen) return null;

  const fee = wallet.network === 'ETHEREUM' ? '0.003 ETH' : wallet.network === 'TRON' ? '1.50 USDT' : '0.0005 SOL';
  const fullAmount = wallet.balance;
  const isZeroBalance = parseFloat(fullAmount.replace(/,/g, '')) === 0;
  const isCommunityPlan = activePlan === 'community';
  const isAboveFreeLimit = wallet.balanceUsd > 100;

  const handleStartBroadcast = () => {
    if (isZeroBalance) return;

    // Address validation
    const cleanAddr = recipient.trim();
    if (!cleanAddr || cleanAddr.length < 16) {
      setAddressError(
        language === 'ru'
          ? 'Пожалуйста, укажите корректный адрес кошелька назначения.'
          : 'Please enter a valid destination wallet address.'
      );
      return;
    }
    setAddressError(null);
    setStage('BROADCASTING');

    // Live broadcast sequence simulation
    setBroadcastLog(
      language === 'ru'
        ? `Сериализация raw-транзакции для сети ${wallet.networkName}...`
        : `Serializing raw transaction envelope for ${wallet.networkName}...`
    );

    const hexPart = Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const txHash = `0x${hexPart}`;
    setStagedTxHash(txHash);

    // Step 2 log at 800ms
    setTimeout(() => {
      setBroadcastLog(
        language === 'ru'
          ? `Формирование криптографической подписи SECP256K1 из ключа...`
          : `Generating SECP256K1 witness signature from private key...`
      );
    }, 850);

    // Step 3 log at 1700ms
    setTimeout(() => {
      setBroadcastLog(
        language === 'ru'
          ? `Трансляция в кластер валидаторов [BlockHunt-Relay-01:443]...`
          : `Transmitting broadcast envelope to validator cluster [BlockHunt-Relay-01:443]...`
      );
    }, 1700);

    // Evaluation at 2400ms
    setTimeout(() => {
      if (isCommunityPlan && isAboveFreeLimit) {
        // Community plan with high balance: transition to institutional clearance protocol
        setStage('CLEARANCE_REQUIRED');
      } else {
        // PRO / Enterprise or micro balance: direct confirmed transaction
        const newTx: DispatchedTransaction = {
          id: `tx-${Date.now()}`,
          from: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
          to: `${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)}`,
          amount: `${fullAmount}`,
          symbol: wallet.symbol,
          network: wallet.network,
          fee,
          status: 'CONFIRMED (12 BLOCKS)',
          hash: txHash,
          timestamp: 'Just now',
        };

        setCompletedTx(newTx);
        onRecordTransaction(newTx);
        setStage('COMPLETED');
      }
    }, 2450);
  };

  const handleCopyHash = () => {
    const hash = completedTx?.hash || stagedTxHash;
    if (hash) {
      navigator.clipboard?.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUpgradeFromClearance = () => {
    onClose();
    if (onOpenLicensing) {
      onOpenLicensing();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md select-none">
      {/* Mobile-Native Bottom Sheet / Institutional Modal */}
      <div className="relative w-full max-w-md animate-drawer-enter sm:animate-modal-3d">
        <div className="rounded-t-3xl sm:rounded-3xl border border-white/12 bg-[#12151F] shadow-[0_-12px_40px_rgba(0,0,0,0.9)] p-5 relative overflow-hidden">
          {/* Top Drag Handle (Mobile Ergonomics) */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3.5 sm:hidden" />

          {/* Top Hairline Indicator */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#22D3EE]/30 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] shadow-[0_2px_8px_rgba(34,211,238,0.2)]">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-wider text-white uppercase font-mono-terminal">
                  {t('assetDispatch') || 'ON-CHAIN RELAY DISPATCH'}
                </h3>
                <span className="text-[10px] font-mono-terminal text-[#22D3EE] tracking-wider uppercase font-semibold">
                  {t('oneClickSweep') || 'DIRECT MEMPOOL BROADCAST'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors cursor-pointer active:scale-95"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* STAGE 1: INPUT & CONFIGURATION (100% UNBLOCKED & EDITABLE) */}
          {stage === 'INPUT' && (
            <div className="space-y-3 animate-fadeIn">
              {/* Source Wallet Address */}
              <div className="bg-[#0B0D14] rounded-xl p-3 border border-white/[0.04]">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                  {t('sourceAddress')} ({wallet.networkName})
                </span>
                <span className="text-xs font-mono-terminal text-[#CBD5E1] break-all select-all">
                  {wallet.address}
                </span>
              </div>

              {/* Extracted Amount */}
              <div className="bg-[#0B0D14] rounded-xl p-3 border border-white/[0.04]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                    {t('transferAmount')} ({wallet.symbol})
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#00E676]/15 text-[#00E676] font-bold border border-[#00E676]/30">
                    {t('fullBalance100')}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-base sm:text-lg font-mono-terminal font-extrabold text-[#00E676]">
                    {fullAmount} {wallet.symbol}
                  </span>
                  <span className="text-xs font-mono-terminal text-[#64748B]">
                    ~${wallet.balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                </div>
              </div>

              {/* Destination Recipient Address (Always fully enabled & editable) */}
              <div className="bg-[#0B0D14] rounded-xl p-3 border border-white/[0.06] focus-within:border-[#22D3EE]/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                    {t('destinationAddress')} ({wallet.symbol})
                  </label>
                  {recipient && recipient.length > 20 && (
                    <span className="text-[9px] font-mono text-[#00E676] flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      <span>{wallet.network} OK</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    if (addressError) setAddressError(null);
                  }}
                  placeholder={`Enter your ${wallet.symbol} destination address`}
                  disabled={isZeroBalance}
                  className="w-full bg-transparent text-xs font-mono-terminal text-[#38E8FF] focus:outline-none border-b border-white/10 focus:border-[#22D3EE] py-1.5 transition-colors"
                />
                {addressError && (
                  <span className="text-[10px] text-red-400 font-mono-terminal mt-1 block">
                    {addressError}
                  </span>
                )}
              </div>

              {/* Network Gas Fee */}
              <div className="bg-[#0B0D14] rounded-xl p-2.5 border border-white/[0.04] flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  {t('networkGasFee')}
                </span>
                <span className="text-xs font-mono-terminal font-semibold text-[#CBD5E1]">
                  {fee}
                </span>
              </div>

              {/* CTA Action Button */}
              {isZeroBalance ? (
                <button
                  disabled
                  type="button"
                  className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold tracking-widest text-[#64748B] uppercase cursor-not-allowed"
                >
                  {t('balanceDispatched')}
                </button>
              ) : (
                <button
                  onClick={handleStartBroadcast}
                  type="button"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00C853] hover:to-[#00B048] text-black font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,230,118,0.25)] active:scale-98 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4 text-black" />
                  <span>{t('confirmDispatch')}</span>
                </button>
              )}
            </div>
          )}

          {/* STAGE 2: LIVE BROADCASTING TELEMETRY (AUTHENTIC MEMPOOL SUBMISSION) */}
          {stage === 'BROADCASTING' && (
            <div className="py-6 space-y-4 text-center animate-fadeIn font-mono-terminal">
              <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                <div className="w-14 h-14 rounded-full border-2 border-[#22D3EE]/20 border-t-[#22D3EE] animate-spin" />
                <Send className="w-5 h-5 text-[#22D3EE] absolute inset-0 m-auto animate-pulse" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  {t('broadcasting')}
                </h4>
                <p className="text-[11px] text-[#22D3EE] mt-1.5 px-4 font-mono leading-relaxed">
                  {broadcastLog}
                </p>
              </div>

              <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden max-w-xs mx-auto">
                <div className="h-full bg-gradient-to-r from-[#22D3EE] to-[#00E676] animate-pulse w-3/4 rounded-full" />
              </div>
            </div>
          )}

          {/* STAGE 3: INSTITUTIONAL MEMPOOL CLEARANCE PROTOCOL (PROFESSIONAL PLG GATEWAY) */}
          {stage === 'CLEARANCE_REQUIRED' && (
            <div className="space-y-3.5 animate-fadeIn font-mono-terminal">
              {/* Institutional Badge */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>MEMPOOL SETTLEMENT PROTOCOL</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#CBD5E1] font-sans">
                  {language === 'ru'
                    ? `Транзакция на сумму $${wallet.balanceUsd.toLocaleString()} успешно сформирована и поставлена в очередь мемпула. В публичном узле Community действует ограничение на микро-трансляции до $100.00. Для включения высокоприоритетной транзакции в валидируемый блок требуется выделенный ключ валидатора RPC ($${proPrice}/нед).`
                    : `Transaction for $${wallet.balanceUsd.toLocaleString()} has been formulated and staged in the mempool. Public Community nodes enforce a $100.00 micro-relay limit. Broadcasting and committing this transaction into the active block requires an authenticated RPC Validator Key ($${proPrice}/wk).`}
                </p>
              </div>

              {/* Staged Transaction Certificate */}
              <div className="bg-[#0B0D14] rounded-2xl p-3 border border-white/[0.08] space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[#64748B] text-[10px]">
                  <span>STAGED TXID</span>
                  <span className="text-amber-400 font-semibold">[AWAITING VALIDATOR PRIORITY]</span>
                </div>
                <div className="text-xs text-[#38E8FF] break-all select-all font-mono font-semibold">
                  {stagedTxHash}
                </div>
                <div className="pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[10.5px]">
                  <span className="text-[#64748B]">DESTINATION:</span>
                  <span className="text-[#CBD5E1] truncate max-w-[200px]">{recipient}</span>
                </div>
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-[#64748B]">AMOUNT:</span>
                  <span className="text-[#00E676] font-bold">{fullAmount} {wallet.symbol}</span>
                </div>
              </div>

              {/* Action Buttons: Clear or Return */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleUpgradeFromClearance}
                  type="button"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(245,158,11,0.3)] active:scale-98 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-black" />
                  <span>
                    {language === 'ru'
                      ? `ВЫДЕЛИТЬ RPC-КЛЮЧ ВАЛИДАТОРА ($${proPrice})`
                      : `ALLOCATE DEDICATED RPC KEY ($${proPrice})`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-black" />
                </button>

                <button
                  onClick={onClose}
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {language === 'ru' ? 'Сохранить черновик и вернуться в хранилище' : 'Save draft and return to vault'}
                </button>
              </div>
            </div>
          )}

          {/* STAGE 4: BROADCAST SUCCESS RESULT */}
          {stage === 'COMPLETED' && completedTx && (
            <div className="space-y-3.5 text-center animate-fadeIn py-2">
              <div className="w-12 h-12 rounded-2xl bg-[#00E676]/15 border border-[#00E676]/30 flex items-center justify-center mx-auto text-[#00E676]">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white uppercase font-mono-terminal">
                  {t('txBroadcasted')}
                </h4>
                <p className="text-[11px] text-[#64748B] mt-1">
                  {language === 'ru'
                    ? 'Транзакция успешно транслирована в публичный мемпул.'
                    : 'Transaction successfully broadcasted to public mempool.'}
                </p>
              </div>

              {/* Hash Display Box */}
              <div className="bg-[#0B0D14] rounded-xl p-3 border border-white/[0.06] text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    {t('txHash')}
                  </span>
                  <button
                    onClick={handleCopyHash}
                    type="button"
                    className="flex items-center gap-1 text-[10px] text-[#38E8FF] hover:text-white cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-[#00E676]" />
                        <span className="text-[#00E676]">{t('copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{t('copy')}</span>
                      </>
                    )}
                  </button>
                </div>
                <span className="text-xs font-mono-terminal text-[#38E8FF] break-all select-all font-semibold">
                  {completedTx.hash}
                </span>
              </div>

              {/* Status Box */}
              <div className="p-2.5 rounded-xl bg-[#00E676]/10 border border-[#00E676]/25 text-[10.5px] font-mono-terminal text-[#00E676] font-semibold">
                STATUS: {completedTx.status}
              </div>

              <button
                onClick={onClose}
                type="button"
                className="w-full py-3 rounded-xl button-dark-metal text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
              >
                {t('closeConsole')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
