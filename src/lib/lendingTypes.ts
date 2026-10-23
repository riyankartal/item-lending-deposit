// Types mirroring the on-chain Loan struct and related enums

export enum LoanStatus {
  Open = 0,
  Active = 1,
  PendingReturn = 2,
  Completed = 3,
  Cancelled = 4,
}

export enum ReturnType {
  OnTime = 0,
  Late = 1,
  Damaged = 2,
  NotReturned = 3,
}

export interface Loan {
  loanId: bigint;
  lender: string;
  borrower: string;
  itemName: string;
  itemDescription: string;
  depositAmount: bigint;
  escrowAmount: bigint;
  returnDate: bigint;
  status: LoanStatus;
  createdAt: bigint;
  lockedAt: bigint;
  handoverPhotoUrl: string;
  returnPhotoUrl: string;
  extensionRequested: boolean;
  extensionDays: bigint;
  extensionApproved: boolean;
  returnSignaledAt: bigint;
}

export type LoanStatusLabel =
  | 'Open'
  | 'Active'
  | 'Pending Return'
  | 'Completed'
  | 'Cancelled';

export function getLoanStatusLabel(status: LoanStatus): LoanStatusLabel {
  switch (status) {
    case LoanStatus.Open:
      return 'Open';
    case LoanStatus.Active:
      return 'Active';
    case LoanStatus.PendingReturn:
      return 'Pending Return';
    case LoanStatus.Completed:
      return 'Completed';
    case LoanStatus.Cancelled:
      return 'Cancelled';
  }
}

export function getReminderStatus(
  returnDate: bigint,
  status: LoanStatus,
  now: Date = new Date(),
): { label: string; severity: 'info' | 'warning' | 'danger' } | null {
  if (status !== LoanStatus.Active) return null;

  const nowTs = BigInt(Math.floor(now.getTime() / 1000));
  const diffSec = returnDate - nowTs;
  const diffDays = Number(diffSec) / 86400;

  if (diffSec < 0n) {
    const daysOverdue = Math.floor(Math.abs(Number(diffSec)) / 86400);
    return {
      label: `Overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} — 2% daily late fee is being applied`,
      severity: 'danger',
    };
  }
  if (diffDays <= 1) {
    return { label: 'Return is due today', severity: 'danger' };
  }
  if (diffDays <= 2) {
    return { label: 'Return is due tomorrow', severity: 'warning' };
  }
  if (diffDays <= 3) {
    return { label: 'Return date is approaching', severity: 'info' };
  }
  return null;
}

export function formatDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calcPlatformFee(depositAmount: bigint): bigint {
  return (depositAmount * 190n) / 10000n;
}

export function calcEscrowAmount(depositAmount: bigint): bigint {
  return depositAmount - calcPlatformFee(depositAmount);
}

export function calcLateFee(escrowAmount: bigint, daysOverdue: number): bigint {
  const fee = (escrowAmount * BigInt(daysOverdue) * 200n) / 10000n;
  return fee > escrowAmount ? escrowAmount : fee;
}

export function getDaysOverdue(returnDate: bigint, now: Date = new Date()): number {
  const nowTs = BigInt(Math.floor(now.getTime() / 1000));
  if (nowTs <= returnDate) return 0;
  return Math.floor(Number(nowTs - returnDate) / 86400);
}
