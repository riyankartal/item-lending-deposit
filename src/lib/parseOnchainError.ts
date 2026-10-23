export function parseOnchainError(error: unknown): string {
  const msg =
    (error as { message?: string })?.message?.toLowerCase() ?? '';

  if (msg.includes('user rejected') || (error as { code?: number })?.code === 4001) {
    return 'Transaction cancelled.';
  }
  if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) {
    return 'Insufficient USDC balance. Please add funds and try again.';
  }
  if (msg.includes('allowance') || msg.includes('approve')) {
    return 'Please approve USDC spending first.';
  }
  if (msg.includes('loan is not open')) {
    return 'This offer is no longer available.';
  }
  if (msg.includes('only lender')) {
    return 'Only the lender can perform this action.';
  }
  if (msg.includes('only borrower')) {
    return 'Only the borrower can perform this action.';
  }
  if (msg.includes('loan not active')) {
    return 'This loan is not currently active.';
  }
  if (msg.includes('reverted')) {
    const reasonMatch = msg.match(/reason="([^"]+)"/);
    return reasonMatch
      ? `Transaction failed: ${reasonMatch[1]}`
      : 'Transaction failed. Please try again.';
  }
  if (msg.includes('network') || msg.includes('timeout')) {
    return 'Network error. Please check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}
