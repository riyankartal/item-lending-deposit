import { useState, useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { erc20Abi } from 'viem';
import { toast } from 'sonner';
import {
  ArrowLeft, ExternalLink, Image, AlertCircle, CheckCircle,
  Send, Ban, Timer, DollarSign
} from 'lucide-react';
import { Amount } from '@/onchain-money';
import {
  LoanStatus, Loan, formatDate, formatDateTime,
  calcEscrowAmount, calcLateFee, getDaysOverdue
} from '@/lib/lendingTypes';
import {
  useLoan, useContractWrite, useUsdcAllowance, useUsdcBalance,
  ARC_TESTNET_CHAIN_ID, USDC_ADDRESS, USDC_DECIMALS, isValidLoan
} from '@/hooks/useLendingContract';
import { parseOnchainError } from '@/lib/parseOnchainError';
import FeeBreakdown from '@/components/FeeBreakdown';
import StatusBadge from '@/components/StatusBadge';
import ReminderBanner from '@/components/ReminderBanner';
import { CONTRACT_CONFIG } from '@/lib/contractConfig';


// Stable current timestamp at module load — for day-level comparisons
const MODULE_LOAD_TS = BigInt(Math.floor(Date.now() / 1000));

interface LoanDetailProps {
  loanId: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

function fmt(raw: bigint): string {
  return Amount.fromRaw(raw, USDC_DECIMALS).toFixed(2);
}

export default function LoanDetail({ loanId, onNavigate }: LoanDetailProps) {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const wrongChain = !!address && chainId !== ARC_TESTNET_CHAIN_ID;

  const loanIdBig = BigInt(loanId);
  const { data: loanRaw, isLoading, refetch } = useLoan(loanIdBig);
  const loan = loanRaw as Loan | undefined;

  const isLender = loan && address && loan.lender.toLowerCase() === address.toLowerCase();
  const isBorrower = loan && address && loan.borrower.toLowerCase() === address.toLowerCase();

  // USDC data
  const { data: allowance, refetch: refetchAllowance } = useUsdcAllowance(
    address,
    CONTRACT_CONFIG.address,
  );
  const { data: usdcBalance } = useUsdcBalance(address);

  const {
    writeContractAsync,
    isPending,
    isConfirming,
    isSuccess,
    reset,
  } = useContractWrite();

  // Refetch after confirmed
  useEffect(() => {
    if (isSuccess) {
      void refetch();
      void refetchAllowance();
    }
  }, [isSuccess, refetch, refetchAllowance]);

  // Return confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [returnType, setReturnType] = useState<0 | 1 | 2 | 3>(0);
  const [damageBpsStr, setDamageBpsStr] = useState('');

  // Extension request state
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionDaysStr, setExtensionDaysStr] = useState('');
  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-8 w-32 animate-pulse rounded-xl" style={{ background: 'var(--surface-muted)' }} />
        <div className="h-64 animate-pulse rounded-3xl" style={{ background: 'var(--surface-muted)' }} />
      </div>
    );
  }

  if (!loan || !isValidLoan(loan)) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <AlertCircle className="mx-auto h-10 w-10 mb-3" style={{ color: 'var(--subtle)' }} />
        <p className="font-semibold" style={{ color: 'var(--ink)' }}>Loan not found</p>
        <button onClick={() => onNavigate('dashboard')} className="btn-secondary mt-4">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const needsApproval =
    allowance !== undefined &&
    loan.depositAmount > 0n &&
    allowance < loan.depositAmount;

  const hasEnoughUsdc =
    usdcBalance !== undefined && usdcBalance >= loan.depositAmount;

  const escrowAmount = loan.escrowAmount > 0n ? loan.escrowAmount : calcEscrowAmount(loan.depositAmount);
  const daysOverdue = getDaysOverdue(loan.returnDate);
  const currentLateFee = calcLateFee(escrowAmount, daysOverdue);

  async function handleApprove() {
    if (wrongChain) {
      switchChain({ chainId: ARC_TESTNET_CHAIN_ID });
      return;
    }
    reset();
    try {
      await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACT_CONFIG.address, loan!.depositAmount],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      toast.success('USDC approved!');
    } catch (err) {
      toast.error(parseOnchainError(err));
    }
  }

  async function handleLockDeposit() {
    if (wrongChain) {
      switchChain({ chainId: ARC_TESTNET_CHAIN_ID });
      return;
    }
    reset();
    try {
      await writeContractAsync({
        address: CONTRACT_CONFIG.address,
        abi: CONTRACT_CONFIG.abi,
        functionName: 'lockDeposit',
        args: [loan!.loanId],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      toast.success('Deposit locked! Loan is now active.');
    } catch (err) {
      toast.error(parseOnchainError(err));
    }
  }

  async function handleCancel() {
    reset();
    try {
      await writeContractAsync({
        address: CONTRACT_CONFIG.address,
        abi: CONTRACT_CONFIG.abi,
        functionName: 'cancelLoan',
        args: [loan!.loanId],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      toast.success('Offer cancelled.');
    } catch (err) {
      toast.error(parseOnchainError(err));
    }
  }

  async function handleSignalReturn() {
    reset();
    try {
      await writeContractAsync({
        address: CONTRACT_CONFIG.address,
        abi: CONTRACT_CONFIG.abi,
        functionName: 'signalReturn',
        args: [loan!.loanId, ''],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      toast.success('Return signaled — timestamp recorded on-chain.');
    } catch (err) {
      toast.error(parseOnchainError(err));
    }
  }

  async function handleConfirmReturn() {
    const dmgBps =
      returnType === 2 && damageBpsStr
        ? BigInt(Math.min(Math.round(parseFloat(damageBpsStr) * 100), 10000))
        : 0n;
    reset();
    try {
      await writeContractAsync({
        address: CONTRACT_CONFIG.address,
        abi: CONTRACT_CONFIG.abi,
        functionName: 'confirmReturn',
        args: [loan!.loanId, returnType, dmgBps],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      toast.success('Return confirmed and escrow settled.');
      setShowConfirmModal(false);
    } catch (err) {
      toast.error(parseOnchainError(err));
    }
  }

  async function handleRequestExtension() {
    const days = parseInt(extensionDaysStr);
    if (!days || days <= 0) return;
    reset();
    try {
      await writeContractAsync({
        address: CONTRACT_CONFIG.address,
        abi: CONTRACT_CONFIG.abi,
        functionName: 'requestExtension',
        args: [loan!.loanId, BigInt(days)],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      toast.success(`Extension request sent for ${days} day${days !== 1 ? 's' : ''}.`);
      setShowExtensionModal(false);
      setExtensionDaysStr('');
    } catch (err) {
      toast.error(parseOnchainError(err));
    }
  }

  async function handleApproveExtension() {
    reset();
    try {
      await writeContractAsync({
        address: CONTRACT_CONFIG.address,
        abi: CONTRACT_CONFIG.abi,
        functionName: 'approveExtension',
        args: [loan!.loanId],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      toast.success('Extension approved. Return date updated.');
    } catch (err) {
      toast.error(parseOnchainError(err));
    }
  }

  async function handleRejectExtension() {
    reset();
    try {
      await writeContractAsync({
        address: CONTRACT_CONFIG.address,
        abi: CONTRACT_CONFIG.abi,
        functionName: 'rejectExtension',
        args: [loan!.loanId],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      toast.success('Extension request rejected.');
    } catch (err) {
      toast.error(parseOnchainError(err));
    }
  }

  async function handleClaimExpiredEscrow() {
    reset();
    try {
      await writeContractAsync({
        address: CONTRACT_CONFIG.address,
        abi: CONTRACT_CONFIG.abi,
        functionName: 'claimExpiredEscrow',
        args: [loan!.loanId],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      toast.success('Escrow claimed successfully.');
    } catch (err) {
      toast.error(parseOnchainError(err));
    }
  }

  async function handleClaimFunds() {
    reset();
    try {
      await writeContractAsync({
        address: CONTRACT_CONFIG.address,
        abi: CONTRACT_CONFIG.abi,
        functionName: 'claimFunds',
        args: [],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      toast.success('Funds claimed to your wallet!');
    } catch (err) {
      toast.error(parseOnchainError(err));
    }
  }

  const graceDeadline = loan.returnDate + BigInt(7 * 86400);
  const nowTs = MODULE_LOAD_TS;
  const canClaimExpired =
    isBorrower &&
    loan.status === LoanStatus.Active &&
    nowTs > graceDeadline;

  const dmgBpsNum =
    returnType === 2 && damageBpsStr ? Math.min(parseFloat(damageBpsStr) * 100, 10000) : 0;
  const confirmDmgDeduction =
    returnType === 2
      ? calcLateFee(escrowAmount - currentLateFee, dmgBpsNum / 100)
      : 0n;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Back */}
      <button
        onClick={() => onNavigate('dashboard')}
        className="flex items-center gap-1.5 text-sm"
        style={{ color: 'var(--muted)' }}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </button>

      {/* Header card */}
      <div
        className="rounded-3xl border p-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="display text-2xl font-bold tracking-tight truncate" style={{ color: 'var(--ink)' }}>
              {loan.itemName}
            </h1>
            {loan.itemDescription && (
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                {loan.itemDescription}
              </p>
            )}
          </div>
          <StatusBadge status={loan.status} className="shrink-0" />
        </div>

        {/* Reminder */}
        {loan.status === LoanStatus.Active && (
          <div className="mt-4">
            <ReminderBanner returnDate={loan.returnDate} status={loan.status} />
          </div>
        )}

        {/* Key fields */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoField label="Deposit" value={`${fmt(loan.depositAmount)} USDC`} />
          <InfoField
            label="Escrow amount"
            value={loan.status !== LoanStatus.Open ? `${fmt(escrowAmount)} USDC` : `~${fmt(calcEscrowAmount(loan.depositAmount))} USDC`}
          />
          <InfoField label="Return date" value={formatDate(loan.returnDate)} />
          <InfoField label="Loan ID" value={`#${loan.loanId.toString()}`} mono />
          {loan.lockedAt > 0n && <InfoField label="Locked" value={formatDateTime(loan.lockedAt)} />}
          {loan.returnSignaledAt > 0n && (
            <InfoField label="Return signaled" value={formatDateTime(loan.returnSignaledAt)} />
          )}
        </div>

        {/* Live fee status on active loans */}
        {loan.status === LoanStatus.Active && daysOverdue > 0 && (
          <div
            className="mt-4 rounded-xl border p-3 flex items-start gap-2"
            style={{ background: 'rgba(186,43,76,0.06)', borderColor: 'rgba(186,43,76,0.2)' }}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--danger)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                Late fee accumulating
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
                {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue — current late fee:{' '}
                <strong>{fmt(currentLateFee)} USDC</strong> (2% per day, capped at escrow)
              </p>
            </div>
          </div>
        )}

        {/* Extension pending */}
        {loan.extensionRequested && (
          <div
            className="mt-4 rounded-xl border p-3"
            style={{ background: 'rgba(180,120,20,0.07)', borderColor: 'rgba(180,120,20,0.25)' }}
          >
            <p className="text-sm font-semibold" style={{ color: '#b47814' }}>
              Extension Requested: +{loan.extensionDays.toString()} day{loan.extensionDays !== 1n ? 's' : ''}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
              Awaiting lender decision.
            </p>
            {isLender && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => { void handleApproveExtension(); }}
                  disabled={isPending}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Approve
                </button>
                <button
                  onClick={() => { void handleRejectExtension(); }}
                  disabled={isPending}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Parties */}
      <div
        className="rounded-2xl border p-4 grid grid-cols-2 gap-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--subtle)' }}>
            Lender
          </p>
          <p
            className="mono text-sm truncate"
            style={{ color: 'var(--ink-2)' }}
            title={loan.lender}
          >
            {loan.lender.slice(0, 6)}...{loan.lender.slice(-4)}
          </p>
          {isLender && (
            <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
              You
            </span>
          )}
        </div>
        {loan.borrower !== '0x0000000000000000000000000000000000000000' && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--subtle)' }}>
              Borrower
            </p>
            <p
              className="mono text-sm truncate"
              style={{ color: 'var(--ink-2)' }}
              title={loan.borrower}
            >
              {loan.borrower.slice(0, 6)}...{loan.borrower.slice(-4)}
            </p>
            {isBorrower && (
              <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
                You
              </span>
            )}
          </div>
        )}
      </div>

      {/* Photos */}
      {(loan.handoverPhotoUrl || loan.returnPhotoUrl) && (
        <div
          className="rounded-2xl border p-4 space-y-3"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Photos</p>
          <div className="flex flex-col gap-2">
            {loan.handoverPhotoUrl && (
              <a
                href={loan.handoverPhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm"
                style={{ color: '#1061a6' }}
              >
                <Image className="h-4 w-4 shrink-0" /> Handover photo
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {loan.returnPhotoUrl && (
              <a
                href={loan.returnPhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm"
                style={{ color: '#1061a6' }}
              >
                <Image className="h-4 w-4 shrink-0" /> Return photo
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Fee breakdown for Open loans (borrower preview) */}
      {loan.status === LoanStatus.Open && !isLender && (
        <div>
          <p className="mb-2 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Before you confirm
          </p>
          <FeeBreakdown depositAmount={loan.depositAmount} />
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {/* --- Borrower: Lock deposit (Open) --- */}
        {loan.status === LoanStatus.Open && !isLender && address && (
          <div className="space-y-3">
            {!hasEnoughUsdc && (
              <div
                className="rounded-xl border p-3 flex items-start gap-2"
                style={{ background: 'rgba(186,43,76,0.06)', borderColor: 'rgba(186,43,76,0.2)' }}
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} />
                <p className="text-sm" style={{ color: 'var(--danger)' }}>
                  Insufficient USDC balance. Need {fmt(loan.depositAmount)} USDC — use "Get test USDC" in the sidebar.
                </p>
              </div>
            )}

            {wrongChain ? (
              <button
                onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
                className="btn-primary w-full"
              >
                Switch to Arc Testnet
              </button>
            ) : needsApproval ? (
              <button
                onClick={() => { void handleApprove(); }}
                disabled={isPending || isConfirming || !hasEnoughUsdc}
                className="btn-primary w-full"
              >
                <TxLabel pending={isPending} confirming={isConfirming} label="Approve USDC Spending" />
              </button>
            ) : (
              <button
                onClick={() => { void handleLockDeposit(); }}
                disabled={isPending || isConfirming || !hasEnoughUsdc}
                className="btn-primary w-full"
              >
                <TxLabel pending={isPending} confirming={isConfirming} label={`Lock Deposit — ${fmt(loan.depositAmount)} USDC`} />
              </button>
            )}
          </div>
        )}

        {/* --- Lender: Cancel (Open) --- */}
        {loan.status === LoanStatus.Open && isLender && (
          <button
            onClick={() => { void handleCancel(); }}
            disabled={isPending || isConfirming}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Ban className="h-4 w-4" />
            <TxLabel pending={isPending} confirming={isConfirming} label="Cancel Offer" />
          </button>
        )}

        {/* --- Active: Borrower actions --- */}
        {loan.status === LoanStatus.Active && isBorrower && (
          <div className="space-y-3">
            {loan.returnSignaledAt === 0n && (
              <button
                onClick={() => { void handleSignalReturn(); }}
                disabled={isPending || isConfirming}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                <TxLabel pending={isPending} confirming={isConfirming} label="Signal Return (lock timestamp)" />
              </button>
            )}
            {loan.returnSignaledAt > 0n && (
              <div
                className="rounded-xl border p-3 flex items-center gap-2"
                style={{ background: 'rgba(26,128,71,0.07)', borderColor: 'rgba(26,128,71,0.2)' }}
              >
                <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--success)' }} />
                <p className="text-sm" style={{ color: 'var(--success)' }}>
                  Return signaled at {formatDateTime(loan.returnSignaledAt)}. Late fees locked in at that moment.
                </p>
              </div>
            )}
            {!loan.extensionRequested && (
              <button
                onClick={() => setShowExtensionModal(true)}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Timer className="h-4 w-4" /> Request Extension
              </button>
            )}
            {canClaimExpired && (
              <button
                onClick={() => { void handleClaimExpiredEscrow(); }}
                disabled={isPending || isConfirming}
                className="btn-primary w-full"
              >
                <TxLabel pending={isPending} confirming={isConfirming} label="Claim Escrow (lender timeout)" />
              </button>
            )}
          </div>
        )}

        {/* --- Active: Lender confirm return --- */}
        {loan.status === LoanStatus.Active && isLender && (
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={isPending || isConfirming}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <CheckCircle className="h-4 w-4" /> Confirm Return
          </button>
        )}

        {/* --- Claim settled funds --- */}
        {(loan.status === LoanStatus.Completed || canClaimExpired) && address && (
          <button
            onClick={() => { void handleClaimFunds(); }}
            disabled={isPending || isConfirming}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <DollarSign className="h-4 w-4" />
            <TxLabel pending={isPending} confirming={isConfirming} label="Claim Your Funds" />
          </button>
        )}
      </div>

      {/* Confirm Return Modal */}
      {showConfirmModal && (
        <Modal onClose={() => setShowConfirmModal(false)}>
          <h3 className="display text-lg font-bold mb-4" style={{ color: 'var(--ink)' }}>
            Confirm Return
          </h3>

          <div className="space-y-3 mb-5">
            {[
              { value: 0, label: 'Returned on time, good condition', desc: `Full escrow refunded to borrower (${fmt(escrowAmount)} USDC)` },
              { value: 1, label: 'Returned late', desc: `Late fees deducted (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue = ${fmt(currentLateFee)} USDC)` },
              { value: 2, label: 'Returned damaged', desc: 'Specify damage % + any late fees go to you' },
              { value: 3, label: 'Not returned', desc: `Full escrow sent to you (${fmt(escrowAmount)} USDC)` },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setReturnType(opt.value as 0 | 1 | 2 | 3)}
                className="w-full rounded-xl border p-3 text-left transition-all"
                style={{
                  background: returnType === opt.value ? 'rgba(18,45,69,0.06)' : 'var(--surface-muted)',
                  borderColor: returnType === opt.value ? 'var(--accent)' : 'var(--border)',
                }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  {opt.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>

          {returnType === 2 && (
            <div className="mb-5 space-y-2">
              <label className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                Damage percentage (0–100%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={damageBpsStr}
                onChange={(e) => setDamageBpsStr(e.target.value)}
                placeholder="e.g. 50"
                className="input-field"
              />
              {damageBpsStr && (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Damage deduction: {fmt(confirmDmgDeduction)} USDC
                  {daysOverdue > 0 && ` + late fees: ${fmt(currentLateFee)} USDC`}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={() => { void handleConfirmReturn(); }}
              disabled={isPending || isConfirming || (returnType === 2 && !damageBpsStr)}
              className="btn-primary flex-1"
            >
              <TxLabel pending={isPending} confirming={isConfirming} label="Confirm & Settle" />
            </button>
          </div>
        </Modal>
      )}

      {/* Extension Modal */}
      {showExtensionModal && (
        <Modal onClose={() => setShowExtensionModal(false)}>
          <h3 className="display text-lg font-bold mb-4" style={{ color: 'var(--ink)' }}>
            Request Extension
          </h3>
          <div className="mb-5 space-y-2">
            <label className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Additional days needed
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={extensionDaysStr}
              onChange={(e) => setExtensionDaysStr(e.target.value)}
              placeholder="e.g. 3"
              className="input-field"
            />
            {extensionDaysStr && parseInt(extensionDaysStr) > 0 && (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                New return date would be:{' '}
                {formatDate(
                  loan.returnDate + BigInt(parseInt(extensionDaysStr) * 86400),
                )}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowExtensionModal(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={() => { void handleRequestExtension(); }}
              disabled={isPending || isConfirming || !extensionDaysStr || parseInt(extensionDaysStr) <= 0}
              className="btn-primary flex-1"
            >
              <TxLabel pending={isPending} confirming={isConfirming} label="Send Request" />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--subtle)' }}>
        {label}
      </p>
      <p
        className={`text-sm font-medium ${mono ? 'mono' : ''}`}
        style={{ color: 'var(--ink-2)' }}
      >
        {value}
      </p>
    </div>
  );
}

function TxLabel({
  pending,
  confirming,
  label,
}: {
  pending: boolean;
  confirming: boolean;
  label: string;
}) {
  if (pending)
    return (
      <span className="flex items-center justify-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        Confirm in wallet...
      </span>
    );
  if (confirming)
    return (
      <span className="flex items-center justify-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        Confirming...
      </span>
    );
  return <span>{label}</span>;
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-3xl p-6"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(40px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
