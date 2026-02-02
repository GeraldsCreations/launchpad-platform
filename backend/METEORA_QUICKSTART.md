# Meteora Integration - Quick Start Guide

## Installation

The Meteora SDK and dependencies are already installed. If you need to reinstall:

```bash
npm install @meteora-ag/dlmm @solana/spl-token@^0.4.6 bn.js@^5.2.1
```

## Database Setup

### Run Migrations

```bash
# Generate migration for new entities
npm run typeorm migration:generate -- src/database/migrations/AddMeteoraEntities

# Run migrations
npm run migration:run
```

Or use synchronize in development (already enabled in `.env`):
```env
NODE_ENV=development
```

## Quick API Test

### 1. Start the Backend

```bash
cd /root/.openclaw/workspace/launchpad-platform/backend
npm run start:dev
```

### 2. Create a Test Token

```bash
curl -X POST http://localhost:3000/api/v1/tokens/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Token",
    "symbol": "TEST",
    "description": "My test token on devnet",
    "initialPrice": 0.000001,
    "initialLiquidity": 5,
    "binStep": 25,
    "feeBps": 25,
    "creator": "YOUR_WALLET_ADDRESS"
  }'
```

**Response:**
```json
{
  "success": true,
  "poolAddress": "...",
  "tokenAddress": "...",
  "signature": "...",
  "launchFee": 1
}
```

### 3. Buy Tokens

```bash
curl -X POST http://localhost:3000/api/v1/trade/buy \
  -H "Content-Type: application/json" \
  -d '{
    "poolAddress": "POOL_ADDRESS_FROM_STEP_2",
    "solAmount": 0.1,
    "wallet": "YOUR_WALLET_ADDRESS",
    "slippage": 0.05
  }'
```

### 4. Get Pool Info

```bash
curl http://localhost:3000/api/v1/pool/POOL_ADDRESS
```

### 5. Get Trending Tokens

```bash
curl http://localhost:3000/api/v1/tokens/trending?limit=10
```

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/tokens/create` | Create token & pool |
| GET | `/api/v1/tokens/:address` | Get token info |
| GET | `/api/v1/tokens/trending` | Get trending tokens |
| GET | `/api/v1/tokens/new` | Get new tokens |
| POST | `/api/v1/trade/buy` | Buy tokens |
| POST | `/api/v1/trade/sell` | Sell tokens |
| GET | `/api/v1/pool/:address` | Get pool info |
| GET | `/api/v1/pool/:address/stats` | Get pool stats |

## Fee Structure

- **Token Launch**: 1 SOL
- **Trading**: 0.4% platform fee
- **Meteora Pool**: 0.25% (configurable)

## Environment Variables

Required in `.env`:

```env
# Solana Configuration (Devnet)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WSS_URL=wss://api.devnet.solana.com

# Database (already configured)
DATABASE_URL=postgresql://...

# Node Environment
NODE_ENV=development
```

## Testing

### Run E2E Tests

```bash
npm run test:e2e -- meteora-integration.e2e-spec.ts
```

### Manual Testing Checklist

- [ ] Create a test token
- [ ] Buy tokens from the pool
- [ ] Sell tokens back to the pool
- [ ] Check pool information
- [ ] Verify fees are tracked correctly
- [ ] View trending tokens

## Common Issues

### 1. RPC Connection Errors

**Problem**: `Failed to connect to Solana RPC`

**Solution**: 
- Check `SOLANA_RPC_URL` in `.env`
- Try using a different RPC endpoint
- For devnet: https://api.devnet.solana.com

### 2. Insufficient SOL

**Problem**: `Insufficient funds for transaction`

**Solution**:
- Get devnet SOL from faucet: https://faucet.solana.com
- Airdrop command: `solana airdrop 2 YOUR_ADDRESS --url devnet`

### 3. Pool Creation Fails

**Problem**: Pool creation transaction fails

**Solution**:
- Ensure initial liquidity >= 1 SOL
- Check that binStep and feeBps are valid
- Verify wallet has enough SOL for fees

### 4. Price Update Issues

**Problem**: Prices not updating

**Solution**:
- Check that `PriceOracleService` cron is running
- Verify pool addresses are correct
- Check Solana RPC connection

## Swagger Documentation

Access interactive API docs at:
```
http://localhost:3000/api
```

## Monitoring

### Check Database

```sql
-- View all pools
SELECT * FROM meteora_pools;

-- View recent transactions
SELECT * FROM meteora_transactions ORDER BY "createdAt" DESC LIMIT 10;

-- Check fee collection
SELECT 
  SUM("platformFeesCollected") as total_platform_fees,
  SUM("launchFeeCollected") as total_launch_fees
FROM meteora_pools;
```

### View Logs

```bash
# Follow logs
tail -f logs/combined.log

# View errors only
tail -f logs/error.log
```

## Production Deployment

Before deploying to production:

1. **Update RPC URLs** to mainnet endpoints
2. **Implement wallet signature verification**
3. **Add rate limiting** per wallet
4. **Set up monitoring** and alerts
5. **Enable database backups**
6. **Review security checklist** in METEORA_INTEGRATION.md

## Next Steps

1. Integrate wallet adapter for real wallet signatures
2. Add token metadata with Metaplex
3. Implement historical price tracking
4. Add advanced liquidity operations
5. Create frontend integration

## Support Resources

- **Full Documentation**: `METEORA_INTEGRATION.md`
- **Meteora Docs**: https://docs.meteora.ag
- **Meteora SDK**: https://github.com/MeteoraAg/dlmm-sdk
- **Solana Docs**: https://docs.solana.com

## Example Workflow

```typescript
// 1. Create Token
const createResponse = await fetch('/api/v1/tokens/create', {
  method: 'POST',
  body: JSON.stringify({
    name: 'My Token',
    symbol: 'MTK',
    initialPrice: 0.000001,
    initialLiquidity: 10,
    creator: wallet.publicKey.toString()
  })
});

const { poolAddress, tokenAddress } = await createResponse.json();

// 2. Buy Tokens
const buyResponse = await fetch('/api/v1/trade/buy', {
  method: 'POST',
  body: JSON.stringify({
    poolAddress,
    solAmount: 1.0,
    wallet: wallet.publicKey.toString()
  })
});

// 3. Get Pool Info
const poolInfo = await fetch(`/api/v1/pool/${poolAddress}`).then(r => r.json());

console.log('Current Price:', poolInfo.currentPrice);
console.log('Liquidity:', poolInfo.liquidity);
console.log('24h Volume:', poolInfo.volume24h);
```

---

**Ready to launch! 🚀**
