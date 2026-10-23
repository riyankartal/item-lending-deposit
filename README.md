# Item Lending Deposit

A USDC escrow app for item lending on Arc Testnet. Lenders create offers; borrowers lock deposits; escrow is settled on-chain based on return outcomes.

Built with [Arc Studio](https://studio.arc.io)

## Tech Stack

- React 18 + Vite + TypeScript + Tailwind CSS
- wagmi v2 + viem v2 + ConnectKit
- Solidity 0.8.28 + Foundry + OpenZeppelin 5.x
- Arc Testnet (Chain ID 5042002), USDC escrow

## Features

- Lenders create offers with item name, description, deposit amount, and return date
- 1.9% platform fee deducted when borrower locks deposit; 98.1% held in escrow
- 2% daily late fee, capped at the full escrow amount
- Return outcomes: on time, late, damaged, not returned
- Extension requests: borrower requests extra days; lender approves or rejects
- Borrower can signal return to lock in a timestamp (prevents lender delay exploit)
- Borrower timeout: claim escrow back after 7 days if lender is unresponsive
- Pull-payment settlement: funds credited to account, claimed via one transaction
- Reminder banners: approaching, due today, due tomorrow, overdue
- Dashboard, Browse Offers, and Lending History views
- How It Works page with full fee table

## Development

### Prerequisites

- [Bun](https://bun.sh) runtime
- [Foundry](https://book.getfoundry.sh) (forge, cast)

### Install

```bash
bun install
```

### Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect Project ID | Optional (for QR wallet connect) |
| `RPC_PROXY_BASE_URL` | Arc Studio RPC proxy base URL | Optional outside Arc Studio |
| `RPC_PROXY_TOKEN` | Arc Studio RPC proxy token | Optional outside Arc Studio |
| `RPC_PROXY_CHAINS` | Comma-separated chains for RPC proxy | Optional outside Arc Studio |

### Run

```bash
bun run dev
```

### Build

```bash
bun run build
```

### Contract Build

```bash
forge build
```

## Deployed Contract

- **ItemLendingDeposit**: `0xe0321f53ca7881159e073490a3db5eb19e0c0302` on Arc Testnet
- Explorer: https://explorer.testnet.arc.io/address/0xe0321f53ca7881159e073490a3db5eb19e0c0302

## Testnet Funds

Use the "Get test USDC" button in the Arc Studio sidebar to fund your wallet with testnet USDC for testing.
