import { useState } from 'react';
import { Search, Package, ArrowRight } from 'lucide-react';
import { useTotalLoanCount, ARC_TESTNET_CHAIN_ID } from '@/hooks/useLendingContract';
import { LoanStatus, Loan, formatDate } from '@/lib/lendingTypes';
import { Amount } from '@/onchain-money';
import { USDC_DECIMALS } from '@/hooks/useLendingContract';
import StatusBadge from '@/components/StatusBadge';
import { useReadContracts } from 'wagmi';
import { CONTRACT_CONFIG } from '@/lib/contractConfig';

interface BrowseOffersProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

function fmt(raw: bigint): string {
  return Amount.fromRaw(raw, USDC_DECIMALS).toFixed(2);
}

export default function BrowseOffers({ onNavigate }: BrowseOffersProps) {
  const { data: totalCount, isLoading: countLoading } = useTotalLoanCount();
  const [searchQuery, setSearchQuery] = useState('');

  const count = totalCount ? Number(totalCount) : 0;

  // Build a list of IDs from 1..count
  const ids = Array.from({ length: Math.min(count, 50) }, (_, i) => BigInt(count - i));

  const { data: loansData, isLoading: loansLoading } = useReadContracts({
    contracts: ids.map((id) => ({
      address: CONTRACT_CONFIG.address,
      abi: CONTRACT_CONFIG.abi as unknown as import('viem').Abi,
      functionName: 'getLoan' as const,
      args: [id] as const,
      chainId: ARC_TESTNET_CHAIN_ID,
    })),
    query: { enabled: ids.length > 0 },
  });

  const loans: Loan[] = (loansData ?? [])
    .filter((r) => r.status === 'success' && r.result)
    .map((r) => r.result as Loan);

  const filtered = loans.filter((loan) => {
    if (loan.status !== LoanStatus.Open) return false;
    if (!searchQuery) return true;
    return (
      loan.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.itemDescription.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const isLoading = countLoading || loansLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="display text-2xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
            Browse Offers
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Find an item to borrow and lock a USDC deposit.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--subtle)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="input-field w-full pl-9 sm:w-64"
          />
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl"
              style={{ background: 'var(--surface-muted)' }}
            />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div
          className="rounded-3xl border p-12 text-center"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <Package className="mx-auto h-10 w-10 mb-3" style={{ color: 'var(--subtle)' }} />
          <p className="font-semibold" style={{ color: 'var(--ink)' }}>
            {searchQuery ? 'No matching offers' : 'No open offers yet'}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {searchQuery
              ? 'Try a different search term.'
              : 'Be the first to create a lending offer!'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => onNavigate('create')}
              className="btn-primary mt-4 px-6"
            >
              Create Offer
            </button>
          )}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((loan) => (
            <LoanCard
              key={loan.loanId.toString()}
              loan={loan}
              onClick={() => onNavigate('loan', { id: loan.loanId.toString() })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LoanCard({ loan, onClick }: { loan: Loan; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group rounded-3xl border p-5 text-left transition-all hover:shadow-md"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold truncate"
            style={{ color: 'var(--ink)' }}
          >
            {loan.itemName}
          </p>
          {loan.itemDescription && (
            <p
              className="mt-1 text-sm line-clamp-2"
              style={{ color: 'var(--muted)' }}
            >
              {loan.itemDescription}
            </p>
          )}
        </div>
        <StatusBadge status={loan.status} className="shrink-0 ml-2" />
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            Deposit required
          </p>
          <p className="display text-xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
            {fmt(loan.depositAmount)}{' '}
            <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
              USDC
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            Return by
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
            {formatDate(loan.returnDate)}
          </p>
        </div>
      </div>

      <div
        className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: 'var(--accent-hover)' }}
      >
        View offer <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
}
