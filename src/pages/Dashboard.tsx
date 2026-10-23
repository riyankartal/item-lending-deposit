import { useAccount } from 'wagmi';
import { Package, Clock, CheckCircle, Plus, ExternalLink } from 'lucide-react';
import { useLenderLoans, useBorrowerLoans, ARC_TESTNET_CHAIN_ID, USDC_DECIMALS } from '@/hooks/useLendingContract';
import { LoanStatus, Loan, formatDate, getReminderStatus } from '@/lib/lendingTypes';
import { Amount } from '@/onchain-money';
import { useReadContracts } from 'wagmi';
import { CONTRACT_CONFIG } from '@/lib/contractConfig';
import StatusBadge from '@/components/StatusBadge';

interface DashboardProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

function fmt(raw: bigint): string {
  return Amount.fromRaw(raw, USDC_DECIMALS).toFixed(2);
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { address, isConnected } = useAccount();

  const { data: lenderLoanIds, isLoading: lenderLoading } = useLenderLoans(address);
  const { data: borrowerLoanIds, isLoading: borrowerLoading } = useBorrowerLoans(address);

  const allIds = [
    ...new Set([
      ...((lenderLoanIds as bigint[] | undefined) ?? []),
      ...((borrowerLoanIds as bigint[] | undefined) ?? []),
    ].map((id) => id.toString())),
  ].map((id) => BigInt(id));

  const { data: loansData, isLoading: loansLoading } = useReadContracts({
    contracts: allIds.map((id) => ({
      address: CONTRACT_CONFIG.address,
      abi: CONTRACT_CONFIG.abi as unknown as import('viem').Abi,
      functionName: 'getLoan' as const,
      args: [id] as const,
      chainId: ARC_TESTNET_CHAIN_ID,
    })),
    query: { enabled: allIds.length > 0 },
  });

  const loans: Loan[] = (loansData ?? [])
    .filter((r) => r.status === 'success' && r.result)
    .map((r) => r.result as Loan);

  const lenderSet = new Set(((lenderLoanIds as bigint[] | undefined) ?? []).map((id) => id.toString()));

  const activeLoans = loans.filter(
    (l) => l.status === LoanStatus.Active || l.status === LoanStatus.PendingReturn,
  );
  const openLoans = loans.filter((l) => l.status === LoanStatus.Open);
  const completedLoans = loans.filter(
    (l) => l.status === LoanStatus.Completed || l.status === LoanStatus.Cancelled,
  );

  const isLoading = lenderLoading || borrowerLoading || loansLoading;

  if (!isConnected) {
    return (
      <div
        className="rounded-3xl border p-12 text-center"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <Package className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--subtle)' }} />
        <h2 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>
          Connect your wallet
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          Connect to view your lending dashboard and manage your loans.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-2xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
            Dashboard
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Your active loans and lending activity.
          </p>
        </div>
        <button
          onClick={() => onNavigate('create')}
          className="btn-primary flex items-center gap-2 px-4"
        >
          <Plus className="h-4 w-4" />
          New Offer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Active"
          value={activeLoans.length}
          icon={<Clock className="h-4 w-4" />}
          color="#1061a6"
          bg="rgba(16,97,166,0.08)"
        />
        <StatCard
          label="Open"
          value={openLoans.length}
          icon={<Package className="h-4 w-4" />}
          color="var(--success)"
          bg="rgba(26,128,71,0.08)"
        />
        <StatCard
          label="History"
          value={completedLoans.length}
          icon={<CheckCircle className="h-4 w-4" />}
          color="var(--muted)"
          bg="var(--surface-muted)"
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl"
              style={{ background: 'var(--surface-muted)' }}
            />
          ))}
        </div>
      )}

      {/* Active loans */}
      {!isLoading && activeLoans.length > 0 && (
        <Section title="Active Loans" icon={<Clock className="h-4 w-4" />}>
          {activeLoans.map((loan) => (
            <LoanRow
              key={loan.loanId.toString()}
              loan={loan}
              role={lenderSet.has(loan.loanId.toString()) ? 'Lender' : 'Borrower'}
              onClick={() => onNavigate('loan', { id: loan.loanId.toString() })}
            />
          ))}
        </Section>
      )}

      {/* Open offers */}
      {!isLoading && openLoans.length > 0 && (
        <Section title="Open Offers" icon={<Package className="h-4 w-4" />}>
          {openLoans.map((loan) => (
            <LoanRow
              key={loan.loanId.toString()}
              loan={loan}
              role={lenderSet.has(loan.loanId.toString()) ? 'Lender' : 'Borrower'}
              onClick={() => onNavigate('loan', { id: loan.loanId.toString() })}
            />
          ))}
        </Section>
      )}

      {/* History */}
      {!isLoading && completedLoans.length > 0 && (
        <Section title="Lending History" icon={<CheckCircle className="h-4 w-4" />}>
          {completedLoans.map((loan) => (
            <LoanRow
              key={loan.loanId.toString()}
              loan={loan}
              role={lenderSet.has(loan.loanId.toString()) ? 'Lender' : 'Borrower'}
              onClick={() => onNavigate('loan', { id: loan.loanId.toString() })}
            />
          ))}
        </Section>
      )}

      {!isLoading && loans.length === 0 && (
        <div
          className="rounded-3xl border p-10 text-center"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <Package className="mx-auto h-10 w-10 mb-3" style={{ color: 'var(--subtle)' }} />
          <p className="font-semibold" style={{ color: 'var(--ink)' }}>
            No loans yet
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Create your first lending offer or browse available items.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button onClick={() => onNavigate('create')} className="btn-primary px-5">
              Create Offer
            </button>
            <button onClick={() => onNavigate('browse')} className="btn-secondary px-5">
              Browse Items
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="rounded-2xl border p-4 text-center"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div
        className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl"
        style={{ background: bg, color }}
      >
        {icon}
      </div>
      <p className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: 'var(--subtle)' }}>
        {label}
      </p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: 'var(--muted)' }}>{icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          {title}
        </h2>
      </div>
      <div
        className="overflow-hidden rounded-2xl border divide-y"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {children}
      </div>
    </div>
  );
}

function LoanRow({
  loan,
  role,
  onClick,
}: {
  loan: Loan;
  role: 'Lender' | 'Borrower';
  onClick: () => void;
}) {
  const reminder = getReminderStatus(loan.returnDate, loan.status);

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-black/[0.02]"
    >
      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate" style={{ color: 'var(--ink)' }}>
            {loan.itemName}
          </span>
          <StatusBadge status={loan.status} />
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span
            className="text-xs rounded-full px-2 py-0.5 font-medium"
            style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}
          >
            {role}
          </span>
          <span className="text-xs" style={{ color: 'var(--subtle)' }}>
            Return by {formatDate(loan.returnDate)}
          </span>
        </div>
        {reminder && (
          <p className="mt-1 text-xs font-medium" style={{ color: reminder.severity === 'danger' ? 'var(--danger)' : reminder.severity === 'warning' ? '#b47814' : '#1061a6' }}>
            {reminder.label}
          </p>
        )}
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className="tabular-nums font-semibold" style={{ color: 'var(--ink)' }}>
          {fmt(loan.depositAmount)} USDC
        </p>
        <p className="text-xs" style={{ color: 'var(--subtle)' }}>
          deposit
        </p>
      </div>

      <ExternalLink className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--subtle)' }} />
    </button>
  );
}
