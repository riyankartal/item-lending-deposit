import { Info } from 'lucide-react';
import { calcPlatformFee, calcEscrowAmount } from '@/lib/lendingTypes';
import { Amount } from '@/onchain-money';
import { USDC_DECIMALS } from '@/hooks/useLendingContract';

interface FeeBreakdownProps {
  depositAmount: bigint;
}

function fmt(raw: bigint): string {
  return Amount.fromRaw(raw, USDC_DECIMALS).toFixed(2);
}

export default function FeeBreakdown({ depositAmount }: FeeBreakdownProps) {
  const platformFee = calcPlatformFee(depositAmount);
  const escrowAmount = calcEscrowAmount(depositAmount);

  return (
    <div
      className="rounded-2xl border p-4 space-y-3"
      style={{ background: 'var(--surface-muted)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Info className="h-4 w-4" style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Fee Breakdown
        </span>
      </div>

      <Row label="Full deposit amount" value={`${fmt(depositAmount)} USDC`} />
      <Row
        label="Platform fee (1.9%)"
        value={`− ${fmt(platformFee)} USDC`}
        valueColor="var(--danger)"
        hint="Charged when you confirm the deposit"
      />
      <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <Row
          label="Held in escrow"
          value={`${fmt(escrowAmount)} USDC`}
          bold
          hint="Returned to you when item is returned in good condition on time"
        />
      </div>
      <div
        className="rounded-xl p-3 text-xs leading-relaxed"
        style={{ background: 'rgba(16,97,166,0.06)', color: 'var(--ink-2)' }}
      >
        <strong>Late fee:</strong> If the item is returned late, 2% of the original deposit (
        {fmt(escrowAmount * 200n / 10000n)} USDC/day) is deducted per day overdue, capped at the
        full escrow amount.
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  bold,
  valueColor,
}: {
  label: string;
  value: string;
  hint?: string;
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <span
          className={`text-sm ${bold ? 'font-semibold' : 'font-medium'}`}
          style={{ color: bold ? 'var(--ink)' : 'var(--ink-2)' }}
        >
          {label}
        </span>
        {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>{hint}</p>}
      </div>
      <span
        className={`text-sm tabular-nums shrink-0 ${bold ? 'font-bold' : 'font-medium'}`}
        style={{ color: valueColor ?? (bold ? 'var(--ink)' : 'var(--ink-2)') }}
      >
        {value}
      </span>
    </div>
  );
}

// Re-export for use with format helper
export { fmt };
