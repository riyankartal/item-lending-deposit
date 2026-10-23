import { useState, useMemo } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { toast } from 'sonner';
import { Plus, Calendar, DollarSign, Image } from 'lucide-react';
import { parseAmount } from '@/onchain-money';
import { useContractWrite, ARC_TESTNET_CHAIN_ID } from '@/hooks/useLendingContract';
import { parseOnchainError } from '@/lib/parseOnchainError';
import FeeBreakdown from '@/components/FeeBreakdown';
import { CONTRACT_CONFIG } from '@/lib/contractConfig';

interface CreateOfferProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

// Computed once at module load — stable across renders
const MIN_DATE_STR = new Date(Date.now() + 86400000).toISOString().split('T')[0];

export default function CreateOffer({ onNavigate }: CreateOfferProps) {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync, isPending, isConfirming } = useContractWrite();

  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [depositStr, setDepositStr] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [handoverPhotoUrl, setHandoverPhotoUrl] = useState('');

  const wrongChain = !!address && chainId !== ARC_TESTNET_CHAIN_ID;

  const depositRaw: bigint | null = (() => {
    try {
      if (!depositStr || parseFloat(depositStr) <= 0) return null;
      return parseAmount(ARC_TESTNET_CHAIN_ID, depositStr).raw;
    } catch {
      return null;
    }
  })();

  const returnDateTs: bigint | null = useMemo(() => {
    if (!returnDate) return null;
    const ts = Math.floor(new Date(returnDate).getTime() / 1000);
    // MIN_DATE_STR is a module-level constant so this comparison is stable
    if (returnDate < MIN_DATE_STR) return null;
    return BigInt(ts);
  }, [returnDate]);

  const canSubmit =
    !!address &&
    !wrongChain &&
    itemName.trim().length > 0 &&
    depositRaw !== null &&
    returnDateTs !== null &&
    !isPending &&
    !isConfirming;

  const minDateStr = MIN_DATE_STR;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || depositRaw === null || returnDateTs === null) return;

    try {
      await writeContractAsync({
        address: CONTRACT_CONFIG.address,
        abi: CONTRACT_CONFIG.abi,
        functionName: 'createLoan',
        args: [
          itemName.trim(),
          itemDescription.trim(),
          depositRaw,
          returnDateTs,
          handoverPhotoUrl.trim(),
        ],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      toast.success('Lending offer created!');
      onNavigate('dashboard');
    } catch (err) {
      toast.error(parseOnchainError(err));
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="display text-2xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
          Create Lending Offer
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          List an item for lending. Set the deposit and return date — no funds needed from you.
        </p>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-5">
        {/* Item Name */}
        <Field label="Item Name" required>
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Canon EOS R6 Camera"
            maxLength={80}
            className="input-field"
          />
        </Field>

        {/* Description */}
        <Field label="Description">
          <textarea
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            placeholder="Condition, accessories included, any special instructions..."
            rows={3}
            maxLength={500}
            className="input-field resize-none"
          />
        </Field>

        {/* Deposit Amount */}
        <Field label="Deposit Amount (USDC)" required hint="The borrower will pay this amount to lock the deposit.">
          <div className="relative">
            <DollarSign
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: 'var(--subtle)' }}
            />
            <input
              type="text"
              inputMode="decimal"
              value={depositStr}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, '');
                if (v === '' || /^\d*\.?\d*$/.test(v)) setDepositStr(v);
              }}
              placeholder="50.00"
              className="input-field pl-9"
            />
          </div>
        </Field>

        {/* Fee preview */}
        {depositRaw !== null && depositRaw > 0n && (
          <FeeBreakdown depositAmount={depositRaw} />
        )}

        {/* Return Date */}
        <Field label="Return Date" required hint="The date by which the borrower must return the item.">
          <div className="relative">
            <Calendar
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: 'var(--subtle)' }}
            />
            <input
              type="date"
              value={returnDate}
              min={minDateStr}
              onChange={(e) => setReturnDate(e.target.value)}
              className="input-field pl-9"
            />
          </div>
        </Field>

        {/* Photo URL */}
        <Field label="Handover Photo URL" hint="Optional: link to a photo documenting item condition at handover.">
          <div className="relative">
            <Image
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: 'var(--subtle)' }}
            />
            <input
              type="url"
              value={handoverPhotoUrl}
              onChange={(e) => setHandoverPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="input-field pl-9"
            />
          </div>
        </Field>

        {/* Action */}
        {wrongChain ? (
          <button
            type="button"
            onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
            className="btn-primary w-full"
          >
            Switch to Arc Testnet
          </button>
        ) : !address ? (
          <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
            Connect your wallet to create an offer.
          </p>
        ) : (
          <button type="submit" disabled={!canSubmit} className="btn-primary w-full">
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Confirm in wallet...
              </span>
            ) : isConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Confirming...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                Create Offer
              </span>
            )}
          </button>
        )}
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>
        {label}
        {required && <span className="ml-1" style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-xs" style={{ color: 'var(--subtle)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}
