import { LoanStatus, getLoanStatusLabel } from '@/lib/lendingTypes';

interface StatusBadgeProps {
  status: LoanStatus;
  className?: string;
}

const statusColors: Record<LoanStatus, { bg: string; text: string }> = {
  [LoanStatus.Open]: { bg: 'rgba(26,128,71,0.1)', text: 'var(--success)' },
  [LoanStatus.Active]: { bg: 'rgba(16,97,166,0.1)', text: '#1061a6' },
  [LoanStatus.PendingReturn]: { bg: 'rgba(180,120,20,0.12)', text: '#b47814' },
  [LoanStatus.Completed]: { bg: 'rgba(100,100,120,0.1)', text: 'var(--muted)' },
  [LoanStatus.Cancelled]: { bg: 'rgba(186,43,76,0.1)', text: 'var(--danger)' },
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colors = statusColors[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
      style={{ background: colors.bg, color: colors.text }}
    >
      {getLoanStatusLabel(status)}
    </span>
  );
}
