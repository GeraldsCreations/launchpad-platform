# Meteora Dynamic Pools Integration

## Overview

This document describes the Meteora Dynamic Pools integration for the LaunchPad platform. The integration provides complete token launch and trading capabilities using Meteora's DLMM (Dynamic Liquidity Market Maker) pools.

## Architecture

### Components

1. **Entities**
   - `MeteoraPool` - Tracks Meteora pool information
   - `MeteoraTransaction` - Records all trading transactions

2. **Services**
   - `MeteoraService` - Core Meteora SDK integration
   - `PoolCreationService` - Handles token and pool creation
   - `TradingService` - Manages buy/sell operations
   - `PriceOracleService` - Fetches and updates prices

3. **Controllers**
   - `TokensController` - Token creation and information endpoints
   - `TradingController` - Buy/sell trading endpoints
   - `PoolsController` - Pool information and statistics

## API Endpoints

### Token Creation

#### POST `/api/v1/tokens/create`

Creates a new token and Meteora DLMM pool.

**Request Body:**
```json
{
  "name": "My Token",
  "symbol": "MTK",
  "description": "Token description",
  "imageUrl": "https://example.com/image.png",
  "initialPrice": 0.000001,
  "initialLiquidity": 5,
  "binStep": 25,
  "feeBps": 25,
  "creator": "wallet_address"
}
```

**Response:**
```json
{
  "success": true,
  "poolAddress": "pool_address",
  "tokenAddress": "token_address",
  "signature": "tx_signature",
  "launchFee": 1,
  "message": "Token and pool created successfully"
}
```

**Fees:**
- Launch Fee: 1 SOL (one-time)
- Initial Liquidity: Specified in request (minimum 1 SOL)

---

### Trading

#### POST `/api/v1/trade/buy`

Buy tokens through a Meteora pool.

**Request Body:**
```json
{
  "poolAddress": "pool_address",
  "solAmount": 0.1,
  "wallet": "buyer_wallet_address",
  "slippage": 0.05
}
```

**Response:**
```json
{
  "success": true,
  "signature": "tx_signature",
  "tokenAmount": 100000,
  "solAmount": 0.1,
  "price": 0.000001,
  "platformFee": 0.0004,
  "message": "Tokens purchased successfully"
}
```

**Fees:**
- Platform Fee: 0.4% of transaction amount

---

#### POST `/api/v1/trade/sell`

Sell tokens through a Meteora pool.

**Request Body:**
```json
{
  "poolAddress": "pool_address",
  "tokenAmount": 100000,
  "wallet": "seller_wallet_address",
  "slippage": 0.05
}
```

**Response:**
```json
{
  "success": true,
  "signature": "tx_signature",
  "tokenAmount": 100000,
  "solAmount": 0.0996,
  "price": 0.000001,
  "platformFee": 0.0004,
  "message": "Tokens sold successfully"
}
```

**Fees:**
- Platform Fee: 0.4% of transaction amount

---

### Pool Information

#### GET `/api/v1/pool/:address`

Get detailed pool information.

**Response:**
```json
{
  "poolAddress": "pool_address",
  "tokenAddress": "token_address",
  "tokenName": "My Token",
  "tokenSymbol": "MTK",
  "baseTokenAddress": "sol_address",
  "currentPrice": 0.000001,
  "liquidity": 5.5,
  "tvl": 10000,
  "volume24h": 50,
  "feeRate": 25,
  "binStep": 25,
  "activeId": 12345,
  "creator": "creator_wallet",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### GET `/api/v1/pool/:address/stats`

Get pool statistics.

**Response:**
```json
{
  "poolAddress": "pool_address",
  "totalTrades": 150,
  "totalVolume": 500,
  "platformFeesCollected": 2.0,
  "launchFeeCollected": 1.0,
  "volume24h": 50,
  "liquidity": 5.5,
  "tvl": 10000
}
```

---

### Token Information

#### GET `/api/v1/tokens/:address`

Get token information.

**Response:**
```json
{
  "address": "token_address",
  "name": "My Token",
  "symbol": "MTK",
  "poolAddress": "pool_address",
  "currentPrice": 0.000001,
  "volume24h": 50,
  "liquidity": 5.5,
  "priceChange24h": 5.5,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### GET `/api/v1/tokens/trending`

Get trending tokens sorted by 24h volume.

**Query Parameters:**
- `limit` (optional, default: 10) - Number of tokens to return

**Response:**
```json
{
  "tokens": [
    {
      "address": "token_address",
      "name": "Token 1",
      "symbol": "TK1",
      "poolAddress": "pool_address",
      "currentPrice": 0.000001,
      "volume24h": 100,
      "liquidity": 10,
      "priceChange24h": 10.5,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 10
}
```

---

#### GET `/api/v1/tokens/new`

Get newly created tokens.

**Query Parameters:**
- `limit` (optional, default: 10) - Number of tokens to return

**Response:** Same as `/trending`

---

## Fee Structure

### Launch Fees
- **Token Creation:** 1 SOL (one-time)
- **Initial Liquidity:** User-specified (minimum 1 SOL recommended)

### Trading Fees
- **Platform Fee:** 0.4% of transaction amount
- **Meteora Pool Fee:** Configurable (default 0.25% / 25 basis points)

### Fee Distribution
All platform fees are tracked in the database and can be withdrawn by platform administrators.

---

## Database Schema

### MeteoraPool
```typescript
{
  poolAddress: string (PK)
  tokenAddress: string
  baseTokenAddress: string
  tokenName: string
  tokenSymbol: string
  creator: string
  binStep: number
  activeId: number
  currentPrice: number
  volume24h: number
  liquidity: number
  tvl: number
  feeRate: number
  platformFeesCollected: number
  launchFeeCollected: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

### MeteoraTransaction
```typescript
{
  signature: string (PK)
  poolAddress: string (FK)
  wallet: string
  txType: enum (CREATE, BUY, SELL, ADD_LIQUIDITY, REMOVE_LIQUIDITY)
  tokenAmount: number
  solAmount: number
  price: number
  platformFee: number
  success: boolean
  error: string
  createdAt: Date
}
```

---

## Meteora SDK Integration

### Key Features

1. **Dynamic Liquidity Market Maker (DLMM)**
   - Customizable bin steps for volatility control
   - Dynamic fee adjustment
   - Efficient capital utilization

2. **Pool Parameters**
   - `binStep`: Volatility parameter (default: 25)
   - `feeBps`: Trading fee in basis points (default: 25 = 0.25%)
   - `activeId`: Initial price bin (calculated from initial price)

3. **Activation Types**
   - Timestamp-based activation
   - Slot-based activation

### Price Calculation

The active bin ID is calculated from the initial price:
```typescript
binId = floor(log(price) / log(1 + binStep/10000))
```

---

## Testing

### E2E Tests

Run the integration tests:
```bash
npm run test:e2e -- meteora-integration.e2e-spec.ts
```

### Test Coverage

- Token creation flow
- Buy/sell operations
- Pool information retrieval
- Fee tracking
- Error handling

### Devnet Testing

All tests run on Solana devnet by default. Update `.env`:
```
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WSS_URL=wss://api.devnet.solana.com
```

---

## Deployment Considerations

### Production Checklist

1. **Environment Variables**
   ```
   SOLANA_RPC_URL=<mainnet-rpc-url>
   SOLANA_WSS_URL=<mainnet-wss-url>
   DATABASE_URL=<production-db-url>
   ```

2. **Security**
   - Implement wallet signature verification
   - Add rate limiting per wallet
   - Validate all inputs thoroughly
   - Monitor for suspicious activity

3. **Performance**
   - Enable database indexing on frequently queried fields
   - Implement caching for pool information
   - Use connection pooling for RPC calls

4. **Monitoring**
   - Track failed transactions
   - Monitor platform fee collection
   - Alert on pool creation failures
   - Log all critical operations

---

## Known Limitations

1. **Wallet Integration**: Currently generates test keypairs. Production requires wallet adapter integration.
2. **Historical Data**: Price history not yet implemented.
3. **Token Metadata**: Needs integration with Metaplex for on-chain metadata.
4. **Liquidity Provision**: Advanced liquidity operations not yet implemented.

---

## Future Enhancements

1. **Advanced Features**
   - Position management (add/remove liquidity)
   - Limit orders
   - Stop loss/take profit
   - Portfolio tracking

2. **Analytics**
   - Price charts and history
   - Volume analytics
   - Holder analytics
   - Pool performance metrics

3. **Integration**
   - Jupiter aggregator for better pricing
   - Birdeye API for market data
   - Token metadata from Metaplex

---

## Support

For issues or questions about the Meteora integration:

1. Check Meteora documentation: https://docs.meteora.ag
2. Review the SDK source: https://github.com/MeteoraAg/dlmm-sdk
3. Check test files for usage examples

---

## References

- **Meteora Documentation**: https://docs.meteora.ag
- **Meteora SDK**: https://www.npmjs.com/package/@meteora-ag/dlmm
- **Solana Web3.js**: https://solana-labs.github.io/solana-web3.js/
- **SPL Token**: https://spl.solana.com/token
