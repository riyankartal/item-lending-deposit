import { AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { getReminderStatus, LoanStatus } from '@/lib/lendingTypes';

interface ReminderBannerProps {
  returnDate: bigint;
  status: LoanStatus;
}

export default function ReminderBanner({ returnDate, status }: ReminderBannerProps) {
  const reminder = getReminderStatus(returnDate, status);
  if (!reminder) return null;

  const config = {
    info: {
      bg: 'rgba(16,97,166,0.07)',
      border: 'rgba(16,97,166,0.2)',
      text: '#1061a6',
      Icon: Clock,
    },
    warning: {
      bg: 'rgba(180,120,20,0.08)',
      border: 'rgba(180,120,20,0.25)',
      text: '#b47814',
      Icon: AlertTriangle,
    },
    danger: {
      bg: 'rgba(186,43,76,0.08)',
      border: 'rgba(186,43,76,0.25)',
      text: 'var(--danger)',
      Icon: AlertCircle,
    },
  }[reminder.severity];

  const { Icon } = config;

  return (
    <div
      className="flex items-start gap-2.5 rounded-xl border px-4 py-3"
      style={{ background: config.bg, borderColor: config.border }}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: config.text }} />
      <p className="text-sm font-medium" style={{ color: config.text }}>
        {reminder.label}
      </p>
    </div>
  );
}
