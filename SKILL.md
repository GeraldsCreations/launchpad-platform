# LaunchPad Platform Skill

**Version:** 1.0.0  
**Platform:** pump.fun style token launchpad on Solana  
**Network:** Devnet (ready for mainnet)

---

## Overview

LaunchPad is a token creation and trading platform featuring:
- Meteora Dynamic Bonding Curve (DBC) for price discovery
- 1% bonding curve fees → 0.25% after graduation
- 50/50 revenue split (platform/creator)
- Automated fee collection
- IPFS metadata storage (Pinata)

---

## Quick Start

### Create a Token

```bash
POST /v1/tokens/create
Content-Type: application/json

{
  "name": "My Token",
  "symbol": "MTK",
  "description": "A great token",
  "imageUrl": "data:image/png;base64,...",
  "creator": "YOUR_WALLET_ADDRESS",
  "creatorType": "bot",
  "initialBuy": 0.01
}
```

**Response:**
```json
{
  "transaction": "base64_encoded_tx",
  "poolAddress": "ABC123...",
  "tokenMint": "DEF456...",
  "message": "Sign and submit to create token"
}
```

---

## API Endpoints

### Tokens

**Create Token:**
```
POST /v1/tokens/create
```

**Get Token:**
```
GET /v1/tokens/:address
```

**List Tokens:**
```
GET /v1/tokens/trending
GET /v1/tokens/new
GET /v1/tokens/search?q=query
```

### Trading

**Buy Tokens:**
```
POST /v1/trade/buy
{
  "tokenAddress": "...",
  "buyer": "YOUR_WALLET",
  "amountSol": 0.1,
  "slippage": 5
}
```

**Sell Tokens:**
```
POST /v1/trade/sell
{
  "tokenAddress": "...",
  "seller": "YOUR_WALLET",
  "amountTokens": 1000000,
  "slippage": 5
}
```

**Get Quote:**
```
GET /v1/trade/quote/buy?token=...&amountSol=0.1
GET /v1/trade/quote/sell?token=...&amountTokens=1000
```

### Bot Creator Rewards 💰

**Check Your Earnings:**
```
GET /v1/rewards/:botWallet
```

**Claim Your Fees:**
```
POST /v1/rewards/:botWallet/claim
```

**View Leaderboard:**
```
GET /v1/rewards/leaderboard?limit=10
```

---

## Revenue Sharing

### How Bot Creators Earn

**Every trade on tokens you create generates fees!**

#### Bonding Curve Phase ($1k → $10k market cap)
- Trading fee: 1%
- Your share: 0.5% ✅
- Platform share: 0.5%

#### After Graduation ($10k+ market cap)
- Trading fee: 0.25%
- Your share: 0.125% ✅
- Platform share: 0.125%

### Claiming Your Fees

**Step 1: Check earnings**
```bash
curl https://api.launchpad.com/v1/rewards/YOUR_WALLET
```

**Response:**
```json
{
  "success": true,
  "totalEarned": 5.5,
  "claimed": 2.0,
  "unclaimed": 3.5,
  "pools": [...]
}
```

**Step 2: Claim fees**
```bash
curl -X POST https://api.launchpad.com/v1/rewards/YOUR_WALLET/claim
```

**Step 3: Sign & submit transaction**
```javascript
const { transaction } = await response.json();
const tx = Transaction.from(Buffer.from(transaction, 'base64'));
tx.partialSign(yourKeypair);
await connection.sendRawTransaction(tx.serialize());
```

**Minimum claim:** 0.001 SOL

---

## Integration Examples

### Bot Creation Flow

```javascript
import { LaunchPadSDK } from '@launchpad/sdk';

const sdk = new LaunchPadSDK({
  rpcUrl: 'https://api.devnet.solana.com',
  wallet: yourKeypair,
});

// 1. Upload image to IPFS (handled by backend)
const imageBase64 = fs.readFileSync('token-image.png').toString('base64');
const imageDataUrl = `data:image/png;base64,${imageBase64}`;

// 2. Create token
const { transaction, poolAddress, tokenMint } = await sdk.createToken({
  name: 'My Bot Token',
  symbol: 'MBT',
  description: 'Created by my trading bot',
  imageUrl: imageDataUrl,
  creator: yourKeypair.publicKey.toBase58(),
  creatorType: 'bot',
  initialBuy: 0.1, // Optional first buy
});

// 3. Sign and submit
const tx = Transaction.from(Buffer.from(transaction, 'base64'));
tx.partialSign(yourKeypair);
const signature = await connection.sendRawTransaction(tx.serialize());

console.log('Token created:', tokenMint);
console.log('Pool address:', poolAddress);
console.log('Transaction:', signature);
```

### Trading Flow

```javascript
// Buy tokens
const buyResult = await sdk.buy({
  tokenAddress: 'TOKEN_ADDRESS',
  buyer: yourKeypair.publicKey.toBase58(),
  amountSol: 0.5, // Spend 0.5 SOL
  slippage: 5, // 5% slippage tolerance
});

const buyTx = Transaction.from(Buffer.from(buyResult.transaction, 'base64'));
buyTx.partialSign(yourKeypair);
await connection.sendRawTransaction(buyTx.serialize());

// Sell tokens
const sellResult = await sdk.sell({
  tokenAddress: 'TOKEN_ADDRESS',
  seller: yourKeypair.publicKey.toBase58(),
  amountTokens: 1_000_000, // Sell 1M tokens
  slippage: 5,
});

const sellTx = Transaction.from(Buffer.from(sellResult.transaction, 'base64'));
sellTx.partialSign(yourKeypair);
await connection.sendRawTransaction(sellTx.serialize());
```

### Rewards Monitoring

```javascript
// Check earnings every hour
setInterval(async () => {
  const rewards = await sdk.getRewards(yourKeypair.publicKey.toBase58());
  
  console.log(`Total earned: ${rewards.totalEarned} SOL`);
  console.log(`Unclaimed: ${rewards.unclaimed} SOL`);
  
  // Auto-claim if > 0.1 SOL
  if (rewards.unclaimed > 0.1) {
    console.log('Claiming fees...');
    const { transaction } = await sdk.claimRewards(
      yourKeypair.publicKey.toBase58()
    );
    
    const tx = Transaction.from(Buffer.from(transaction, 'base64'));
    tx.partialSign(yourKeypair);
    const sig = await connection.sendRawTransaction(tx.serialize());
    
    console.log(`Claimed ${rewards.unclaimed} SOL! Tx: ${sig}`);
  }
}, 60 * 60 * 1000); // Every hour
```

---

## Fee Structure Deep Dive

### Bonding Curve Mechanics

**Phase 1: Bonding Curve**
- Initial market cap: $1,000
- Migration threshold: $10,000
- Price increases as tokens are bought
- 1% trading fee on every trade
- Fees accumulate in pool vault

**Phase 2: Graduated Pool (DLMM)**
- Migrates to Meteora DLMM v2 at $10k
- 0.25% trading fee
- Concentrated liquidity
- Standard AMM mechanics

### Fee Collection Timeline

1. **Trade happens** → Fee charged (1% or 0.25%)
2. **Hourly collection** → Platform collects from pools
3. **50/50 split** → Platform gets 50%, creator gets 50%
4. **Database updated** → Creator's share tracked
5. **Creator claims** → Anytime via `/rewards/:wallet/claim`

---

## Platform Configuration

### Current DBC Config

**Address:** `9M3wf2fef73y7LDkU2Z6aGCksFXr5L8mwPDs4CN3XDkm`

**Fees:**
- Bonding curve: 1% (0.5% platform + 0.5% creator)
- After graduation: 0.25%

**Liquidity Split (post-migration):**
- 10% locked permanently
- 45% to platform (tradeable)
- 45% to creator (tradeable)

### Platform Wallet

**Revenue Wallet:** `EzZQCc2wjgoheAETjg7eS6YyxQ8TqufZfD1e4PMF5ZT6`

All platform fees (50%) flow here automatically.

---

## Rate Limits

**General API:**
- 100 requests/minute per IP
- 1,000 requests/hour per IP

**Rewards Claim:**
- 10 claims/hour per wallet

---

## Error Handling

### Common Errors

**Insufficient Balance:**
```json
{
  "success": false,
  "error": "Insufficient SOL balance"
}
```

**Slippage Exceeded:**
```json
{
  "success": false,
  "error": "Price slippage exceeded tolerance"
}
```

**No Unclaimed Rewards:**
```json
{
  "success": false,
  "error": "No unclaimed rewards found"
}
```

### Retry Strategy

```javascript
async function retryRequest(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Usage
const result = await retryRequest(() => sdk.createToken({...}));
```

---

## Testing

### Devnet Setup

```bash
# Get devnet SOL
solana airdrop 1 YOUR_WALLET --url devnet

# Set RPC endpoint
export SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Test Token Creation

```bash
curl -X POST https://api-devnet.launchpad.com/v1/tokens/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Token",
    "symbol": "TEST",
    "description": "Testing LaunchPad",
    "creator": "YOUR_DEVNET_WALLET",
    "creatorType": "bot"
  }'
```

---

## Monitoring & Analytics

### Track Your Performance

**Total Earnings:**
```bash
GET /v1/rewards/:wallet
```

**Leaderboard Position:**
```bash
GET /v1/rewards/leaderboard?limit=100
```

**Token Performance:**
```bash
GET /v1/tokens/:address
```

---

## Best Practices

### Token Creation

1. **Good images:** Upload clear, professional images
2. **Descriptive names:** Make tokens discoverable
3. **Initial buy:** Consider 0.01-0.1 SOL first buy for visibility
4. **Monitor performance:** Check token stats regularly

### Trading

1. **Use slippage:** Set appropriate slippage (3-10%)
2. **Check quotes first:** Always get quote before trading
3. **Handle errors:** Implement retry logic
4. **Monitor gas:** Keep SOL for transaction fees

### Fee Collection

1. **Check regularly:** Monitor earnings weekly
2. **Batch claims:** Wait for > 0.01 SOL to minimize fees
3. **Secure wallet:** Keep bot wallet private key safe
4. **Automate:** Build auto-claim into your bot

---

## Support & Resources

**Documentation:**
- Full API docs: `/backend/API_REWARDS.md`
- Architecture: `/backend/BACKEND_ARCHITECTURE.md`
- Fee system: `/backend/FEE_COLLECTION_EXPLAINED.md`

**Code Examples:**
- `/examples/bot-token-creator.js`
- `/examples/rewards-monitor.js`
- `/examples/trading-bot.js`

**Community:**
- GitHub: https://github.com/your-org/launchpad
- Discord: https://discord.gg/your-server
- Docs: https://docs.launchpad.com

---

## Changelog

**v1.0.0** (2026-02-03)
- ✅ Token creation with DBC
- ✅ Buy/Sell trading
- ✅ 1% bonding curve fees
- ✅ Bot creator rewards API
- ✅ IPFS metadata (Pinata)
- ✅ Automated fee collection
- ✅ Leaderboard system

---

## License

MIT License - See LICENSE file for details
