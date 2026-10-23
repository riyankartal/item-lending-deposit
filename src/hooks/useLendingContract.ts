import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { erc20Abi } from 'viem';
import { getUsdc } from '@/onchain-facts';
import { Loan } from '@/lib/lendingTypes';

// Placeholder ABI and address — replaced after deploy via src/lib/contractConfig.ts
import { CONTRACT_CONFIG } from '@/lib/contractConfig';

const ARC_TESTNET_CHAIN_ID = 5042002;
const usdcFact = getUsdc(ARC_TESTNET_CHAIN_ID);
if (!usdcFact) throw new Error('USDC not found for Arc Testnet');
export const USDC_ADDRESS = usdcFact.address as `0x${string}`;
export const USDC_DECIMALS = usdcFact.decimals;

export { ARC_TESTNET_CHAIN_ID };

/** Read a single loan */
export function useLoan(loanId: bigint | undefined) {
  return useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: CONTRACT_CONFIG.abi,
    functionName: 'getLoan',
    args: loanId !== undefined ? [loanId] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: loanId !== undefined },
  });
}

/** Read lender loans */
export function useLenderLoans(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: CONTRACT_CONFIG.abi,
    functionName: 'getLenderLoans',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address },
  });
}

/** Read borrower loans */
export function useBorrowerLoans(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: CONTRACT_CONFIG.abi,
    functionName: 'getBorrowerLoans',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address },
  });
}

/** Read total loan count */
export function useTotalLoanCount() {
  return useReadContract({
    address: CONTRACT_CONFIG.address,
    abi: CONTRACT_CONFIG.abi,
    functionName: 'getTotalLoanCount',
    chainId: ARC_TESTNET_CHAIN_ID,
  });
}

/** Read USDC allowance */
export function useUsdcAllowance(owner: `0x${string}` | undefined, spender: `0x${string}`) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: owner ? [owner, spender] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!owner },
  });
}

/** Read USDC balance */
export function useUsdcBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address },
  });
}

/** Write hook for contract interactions */
export function useContractWrite() {
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    writeContractAsync,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
    contractConfig: CONTRACT_CONFIG,
  };
}

/** Check if a loan raw data is a valid Loan (not default empty) */
export function isValidLoan(loan: Loan | undefined): boolean {
  return !!loan && loan.loanId > 0n && loan.lender !== '0x0000000000000000000000000000000000000000';
}
