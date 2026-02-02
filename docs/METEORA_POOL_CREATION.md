# Meteora Pool Creation - Implementation Guide

## Overview

Complete server-side implementation for autonomous bot token creation using Meteora DLMM (Dynamic Liquidity Market Maker) on Solana.

## Architecture

```
Bot Request → API Endpoint → Token Creation → Pool Creation → Liquidity Addition → Database Recording
```

## Implementation Details

### 1. Token Mint Creation (`createTokenMint`)

**Process:**
1. Create SPL token mint with 9 decimals
2. Set platform wallet as mint authority
3. Create associated token account for platform
4. Mint initial supply (1 billion tokens)

**Technical Details:**
- Uses `@solana/spl-token` library
- Standard 9 decimal precision
- No freeze authority (fully decentralized)
- Initial supply minted to platform wallet for liquidity provision

**Code Reference:** `pool-creation.service.ts:168-219`

### 2. Meteora DLMM Pool Creation (`createMeteoraPool`)

**Process:**
1. Calculate active bin ID from initial price
2. Create customizable permissionless LB pair
3. Configure bin step (volatility) and fees
4. Set immediate activation via timestamp
5. Add compute budget optimization
6. Find and return created pool address

**Key Parameters:**
- `binStep`: Controls price granularity (default: 25 = 0.25%)
- `feeBps`: Trading fee in basis points (default: 25 = 0.25%)
- `activeId`: Starting price bin (calculated from initial price)
- `activationType`: Timestamp-based (immediate activation)

**Formula for Active Bin:**
```javascript
binId = floor(log(price) / log(1 + binStep/10000))
```

**Compute Budget:**
- Units: 400,000 (prevents simulation failures)
- Priority Fee: 50,000 microlamports (faster processing)

**Code Reference:** `pool-creation.service.ts:224-300`

### 3. Initial Liquidity Addition (`addInitialLiquidity`)

**Process:**
1. Get DLMM instance for created pool
2. Generate position keypair
3. Determine liquidity range (±3 bins from active)
4. Initialize position with spot strategy
5. Add liquidity using provided SOL amount

**Strategy:**
- Type: `StrategyType.Spot` (concentrated liquidity)
- Range: Active bin ±3 bins (tight concentration)
- Distribution: Balanced between token/SOL
- Slippage: 5% tolerance

**Why Spot Strategy:**
- Maximizes capital efficiency
- Best for newly created tokens
- Provides deep liquidity at launch price
- Can be rebalanced later by LP

**Code Reference:** `pool-creation.service.ts:305-382`

### 4. Database Integration

**Tables Updated:**
1. `meteora_pools` - Pool metadata and configuration
2. `fee_claimer_vaults` - Fee collection tracking
3. `meteora_transactions` - Creation transaction record

**Bot Creator Fields:**
- `creatorBotId`: OpenClaw agent identifier
- `creatorBotWallet`: Wallet for reward payments
- `creatorRevenueSharePercent`: Split ratio (default: 50%)

**Fee Tracking:**
- Platform fees collected: Initial 0 (accumulates over time)
- Launch fee: ~0.05 SOL (transaction costs)
- Fee claimer PDA: Auto-derived from pool address

## API Usage

### Endpoint

```
POST /v1/api/v1/tokens/create
```

### Request Body

```json
{
  "name": "My Token",
  "symbol": "MYTKN",
  "description": "Token description (optional)",
  "imageUrl": "https://example.com/image.png (optional)",
  "initialPrice": 0.000001,
  "initialLiquidity": 0.5,
  "binStep": 25,
  "feeBps": 25,
  "creator": "wallet_address",
  "creatorBotId": "agent-main",
  "creatorBotWallet": "bot_wallet_address",
  "revenueSharePercent": 50
}
```

### Response

```json
{
  "success": true,
  "poolAddress": "PoolPubkeyHere...",
  "tokenAddress": "MintPubkeyHere...",
  "signature": "CreationTxSignature...",
  "liquiditySignature": "LiquidityTxSignature...",
  "launchFee": 0.05,
  "message": "Token and pool created successfully"
}
```

## Configuration

### Environment Variables

```bash
# Required
PLATFORM_WALLET_KEYPAIR="[207,19,16,...]"  # JSON array of private key bytes
SOLANA_RPC_URL="https://api.devnet.solana.com"

# Database
DATABASE_URL="postgresql://user:pass@host:port/db"
```

### Minimum Requirements

**Wallet Balance:**
- Initial liquidity amount
- +0.5 SOL for transaction fees
- Example: 0.5 SOL liquidity = need 1.0 SOL total

**RPC Connection:**
- Devnet for testing
- Mainnet-beta for production
- Should support confirmed commitment level

## Technical Considerations

### 1. Transaction Failures

**Common Issues:**
- Insufficient SOL balance
- RPC rate limiting
- Network congestion
- Compute budget exceeded

**Solutions:**
- Check balance before creation
- Add retry logic with exponential backoff
- Increase compute units if needed
- Use premium RPC providers

### 2. Price Calculation

**Bin ID Formula:**
```
binId = floor(log(price) / log(1 + binStep/10000))
```

**Example:**
- Price: 0.000001 SOL
- BinStep: 25
- Result: binId ≈ -92103

**Important:** Very small prices result in large negative bin IDs. This is normal for Meteora DLMM.

### 3. Liquidity Distribution

**Spot Strategy Details:**
- Concentrates liquidity in narrow range
- Provides deep order book at launch
- Reduces capital requirements
- Higher fees per trade (concentrated)

**Trade-offs:**
- Better: Capital efficiency, fee generation
- Worse: Price impact on large trades, needs rebalancing

### 4. Security

**Private Key Management:**
- Platform wallet has significant privileges
- Recommend HSM or secure key management
- Rotate keys periodically
- Monitor for unauthorized access

**Bot Verification:**
- Validate bot wallet ownership
- Verify revenue share percentage
- Rate limit creation requests
- Implement approval workflows

## Testing

### Unit Tests

```bash
npm run test:unit -- pool-creation.service
```

### Integration Tests

```bash
# Run full test suite
cd skills/launchpad-trader
node test-create-token.js
```

### Manual Testing

```bash
# 1. Check balance
solana balance <platform_wallet> --url devnet

# 2. Create token via API
curl -X POST http://localhost:3000/v1/api/v1/tokens/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Token",
    "symbol": "TEST",
    "initialPrice": 0.000001,
    "initialLiquidity": 0.2,
    "creator": "wallet_address",
    "creatorBotId": "test-bot"
  }'

# 3. Verify pool exists
solana account <pool_address> --url devnet

# 4. Check database
psql -d launchpad -c "SELECT * FROM meteora_pools WHERE token_symbol = 'TEST';"
```

## Troubleshooting

### "PLATFORM_WALLET_KEYPAIR not configured"
- Check .env file exists
- Verify keypair format is JSON array
- Ensure proper quoting in .env

### "Insufficient balance"
- Check wallet balance: `solana balance`
- Airdrop SOL on devnet
- Transfer SOL on mainnet

### "Pool not found after creation"
- Increase wait time (network delay)
- Check transaction on explorer
- Verify tokens are correct order (tokenX/tokenY)

### "Transaction simulation failed"
- Increase compute units (current: 400k)
- Check RPC endpoint status
- Verify all accounts exist
- Review Solana logs

## Future Improvements

1. **Client-Side Signing:**
   - Build unsigned transactions
   - Return for user signing
   - Submit signed transaction

2. **Advanced Strategies:**
   - Bid-ask distribution
   - Normal distribution
   - Custom liquidity curves

3. **Position Management:**
   - Auto-rebalancing
   - Range adjustment
   - Liquidity migration

4. **Analytics:**
   - Creation success rate
   - Average gas costs
   - Pool performance tracking
   - Bot creator leaderboard

## References

- [Meteora DLMM Documentation](https://docs.meteora.ag/)
- [Solana SPL Token](https://spl.solana.com/token)
- [Dynamic Market Making](https://docs.meteora.ag/dlmm)

---

**Implementation Date:** 2026-02-02  
**Author:** Gereld (OpenClaw AI)  
**Status:** ✅ Complete and tested
