# Item Lending Deposit

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** — what Arc Studio remembers about building this app.

---

## What This App Does

Item Lending Deposit is a USDC escrow app on Arc Testnet for item lending. Lenders create offers with a deposit amount and return date. Borrowers lock USDC deposits (1.9% platform fee deducted immediately, 98.1% held in escrow). Lenders confirm return outcomes (on time, late with 2%/day fees, damaged, or not returned). Includes extension requests, return signal timestamps, and a borrower timeout path after 7 days.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry, OpenZeppelin 5.x, via_ir enabled
- Chain: Arc Testnet (Chain ID: 5042002)
- Token: USDC (6 decimals, address: 0x3600000000000000000000000000000000000000)

## Deployed Contracts

### ItemLendingDeposit
- **Address**: `0xe0321f53ca7881159e073490a3db5eb19e0c0302`
- **Chain**: Arc Testnet
- **Explorer**: https://explorer.testnet.arc.io/address/0xe0321f53ca7881159e073490a3db5eb19e0c0302
- **Deploy tx**: `0x71933829f6e16b8aabcaa2229b0562aa6bed04a3acb684d7e372897d8e6a51e7`
- **USDC**: `0x3600000000000000000000000000000000000000`
- **Platform wallet**: `0x7B8f0B8E09ca522Ad3418fb89B9176f1bc74644c`
- **ABI source**: `contracts/out/ItemLendingDeposit.sol/ItemLendingDeposit.json`
- **Frontend config**: `src/lib/contractConfig.ts`

## Key Fee Parameters (on-chain constants)
- Platform fee: 1.9% (190 bps) — sent to platform wallet on deposit lock
- Late fee: 2% per day (200 bps) — deducted from escrow on lender confirmation
- Lender grace period: 7 days after return date — borrower can claim after this
- All fees capped at escrow amount

## Key Design Decisions
- Pull-payment settlement: `confirmReturn` credits `pendingClaims` mapping; funds withdrawn via `claimFunds()`
- `signalReturn()` timestamps borrower's actual return to prevent lender delay exploit
- `claimExpiredEscrow()` gives borrower a fallback if lender ignores for 7+ days
- `via_ir = true` in foundry.toml required due to Loan struct size (stack too deep)

## File Structure
- `src/lib/lendingTypes.ts` — TS types mirroring Loan struct, helper functions
- `src/lib/contractConfig.ts` — contract address + ABI
- `src/hooks/useLendingContract.ts` — wagmi read/write hooks
- `src/pages/Dashboard.tsx` — active loans dashboard
- `src/pages/CreateOffer.tsx` — lender creates offer
- `src/pages/BrowseOffers.tsx` — browse open offers
- `src/pages/LoanDetail.tsx` — full loan management (all actions)
- `src/pages/HowItWorks.tsx` — fees and rules explainer
