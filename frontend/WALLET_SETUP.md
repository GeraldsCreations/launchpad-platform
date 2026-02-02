# Solana Wallet Integration Setup

## Overview

The frontend uses **Reown AppKit** (formerly WalletConnect) for Solana wallet connectivity. This allows users to connect popular Solana wallets like:

- Phantom
- Solflare
- Backpack
- Glow
- And more...

## Setup Instructions

### 1. Get Reown Project ID

1. Go to https://cloud.reown.com
2. Sign up / Log in
3. Create a new project
4. Copy the **Project ID**

### 2. Configure Project ID

Edit `src/environments/wallet-config.ts`:

```typescript
export const REOWN_PROJECT_ID = 'YOUR_PROJECT_ID_HERE';
```

### 3. Install Dependencies (Already Done)

```bash
npm install @reown/appkit @reown/appkit-adapter-solana @solana/web3.js
```

### 4. How It Works

#### Services Architecture

```
WalletService (Facade)
    ↓
SolanaWalletService (Reown AppKit Integration)
    ↓
Reown AppKit → User's Wallet (Phantom, Solflare, etc.)
```

#### Key Files

- `src/app/core/services/solana-wallet.service.ts` - Reown AppKit integration
- `src/app/core/services/wallet.service.ts` - Facade for components
- `src/app/shared/components/wallet-button.component.ts` - UI component
- `src/environments/wallet-config.ts` - Configuration

#### Usage in Components

```typescript
import { WalletService } from './core/services/wallet.service';

constructor(private wallet: WalletService) {}

async connect() {
  await this.wallet.connect(); // Opens wallet selection modal
}

async signTransaction(tx: Transaction) {
  const signature = await this.wallet.signAndSendTransaction(tx);
  console.log('Transaction:', signature);
}
```

## Features

### ✅ Implemented

- [x] Wallet connection modal
- [x] Multiple wallet support (Phantom, Solflare, etc.)
- [x] Network switching (mainnet/testnet/devnet)
- [x] Balance display
- [x] Transaction signing
- [x] Message signing
- [x] Disconnect
- [x] Airdrop (devnet/testnet)

### 🔄 Integration with Backend

When users interact with the LaunchPad (create/buy/sell tokens):

1. **Frontend** calls backend API endpoint
2. **Backend** returns unsigned transaction data
3. **Frontend** deserializes transaction
4. **Wallet** signs transaction
5. **Frontend** submits to Solana network
6. **Frontend** updates backend with transaction signature

#### Example: Buy Token Flow

```typescript
async buyToken(tokenAddress: string, amount: number) {
  // 1. Get unsigned transaction from backend
  const response = await this.api.post('/trade/buy', {
    tokenAddress,
    buyer: this.wallet.getAddress(),
    amountSol: amount
  });

  // Backend should return: { transaction: base64EncodedTx, ... }
  
  // 2. Deserialize transaction
  const tx = Transaction.from(
    Buffer.from(response.transaction, 'base64')
  );

  // 3. Sign and send via wallet
  const signature = await this.wallet.signAndSendTransaction(tx);

  // 4. Confirm and update backend
  await this.api.post('/trade/confirm', { signature });

  return signature;
}
```

## Network Configuration

Default network: **Devnet** (for testing)

To change network:
1. User clicks wallet button
2. Opens wallet modal
3. Selects different network from dropdown
4. Frontend automatically switches

## Testing

### Local Testing (Devnet)

1. Install Phantom wallet extension
2. Switch to Devnet in Phantom settings
3. Request airdrop from Phantom or:

```typescript
await this.wallet.requestAirdrop(1); // 1 SOL
```

4. Test creating/buying/selling tokens

## Troubleshooting

### "Wallet not connecting"

- Check if Reown Project ID is set correctly
- Check browser console for errors
- Make sure wallet extension is installed
- Try refreshing the page

### "Transaction failed"

- Check if wallet has enough SOL for gas
- Verify you're on the correct network (devnet/mainnet)
- Check transaction logs in wallet

### "Network mismatch"

- Frontend and wallet must be on same network
- Switch network in wallet app
- Or switch in AppKit modal

## Production Checklist

Before deploying to production:

- [ ] Get production Reown Project ID
- [ ] Update `REOWN_PROJECT_ID` in `wallet-config.ts`
- [ ] Switch default network to `solana` (mainnet)
- [ ] Remove/disable airdrop functionality
- [ ] Add proper error handling
- [ ] Add transaction confirmation UI
- [ ] Test with real SOL on mainnet

## Security Notes

⚠️ **Important:**

- Never store private keys in frontend
- Always let wallet sign transactions
- Validate all transaction data before signing
- Use HTTPS in production
- Don't hardcode sensitive data
- Keep Reown Project ID in environment variables for production

## Support

- Reown Docs: https://docs.reown.com
- Solana Docs: https://docs.solana.com
- AppKit Solana: https://docs.reown.com/appkit/next/core/solana
