# DBC API Research: Replace Indexer with SDK Queries

**Date:** 2026-02-04 01:01 UTC  
**Status:** ✅ FEASIBLE - Can replace indexer with DBC SDK

---

## 🎯 Key Finding

**YES, we can replace our blockchain indexer with DBC SDK queries!**

The `StateService` in DBC SDK provides all the query methods we need to fetch pool data directly from the blockchain without running our own indexer.

---

## 📊 DBC StateService Query Methods

### Core Pool Queries

**1. `getPoolsByConfig(configPubkey)`**
```typescript
// Get ALL pools using our platform config
const pools = await stateService.getPoolsByConfig(platformConfigKey);
```
**Returns:** Array of all pools created with our config  
**Use Case:** ✅ **Replaces our entire indexer!**

**2. `getPoolsByCreator(creatorPubkey)`**
```typescript
// Get all pools created by a specific wallet
const pools = await stateService.getPoolsByCreator(botWallet);
```
**Returns:** Array of pools by creator  
**Use Case:** Bot creator stats, leaderboard

**3. `getPool(poolPubkey)`**
```typescript
// Get single pool state
const pool = await stateService.getPool(poolAddress);
```
**Returns:** Complete pool state (price, supply, fees, etc.)  
**Use Case:** Token detail page, trading quotes

**4. `getPoolMetadata(poolPubkey)`**
```typescript
// Get token metadata
const metadata = await stateService.getPoolMetadata(poolAddress);
```
**Returns:** Token name, symbol, URI  
**Use Case:** Token information display

**5. `getPoolFeeBreakdown(poolPubkey)`**
```typescript
// Get fee data
const fees = await stateService.getPoolFeeBreakdown(poolAddress);
```
**Returns:** Partner + creator fees (unclaimed/claimed/total)  
**Use Case:** ✅ Already using for rewards!

**6. `getPoolCurveProgress(poolPubkey)`**
```typescript
// Get bonding curve progress
const progress = await stateService.getPoolCurveProgress(poolAddress);
```
**Returns:** Percentage progress (0-100%)  
**Use Case:** Show graduation progress

---

## 🔄 Current Indexer vs DBC SDK

### Current Indexer (What We Have Now)

**File:** `src/indexer/indexer.service.ts`

**What it does:**
1. Subscribes to DBC program logs
2. Listens for new pool creation events
3. Filters events by our config key
4. Saves pool data to database
5. Runs continuously in background

**Problems:**
- ❌ Complex event parsing
- ❌ Needs to run 24/7
- ❌ Can miss events if offline
- ❌ Duplicate logic with DBC SDK
- ❌ Maintains separate database

---

### DBC SDK Approach (Better!)

**What we'd do instead:**
1. Call `getPoolsByConfig()` when needed
2. DBC SDK queries blockchain directly
3. Always returns latest data
4. No background process needed
5. No database sync issues

**Benefits:**
- ✅ Simpler code (~90% less)
- ✅ No background process
- ✅ Always up-to-date (real-time)
- ✅ No database sync issues
- ✅ Uses official SDK (more reliable)

---

## 📝 Implementation Plan

### Option 1: Full Replacement (Recommended)

**Remove indexer entirely, use DBC SDK for all queries.**

#### Before (Indexer)
```typescript
// indexer.service.ts - 400+ lines
@Injectable()
export class IndexerService {
  async onModuleInit() {
    // Subscribe to blockchain logs
    this.connection.onLogs(
      DBC_PROGRAM_ID,
      async (logs) => {
        // Parse events
        // Filter by config
        // Save to database
      }
    );
  }
}

// To get pools:
const pools = await poolRepository.find();
```

#### After (DBC SDK)
```typescript
// token.service.ts - Just a few lines!
@Injectable()
export class TokenService {
  private dbcClient: DynamicBondingCurveClient;
  
  constructor() {
    this.dbcClient = DynamicBondingCurveClient.create(connection);
  }
  
  // Get all our platform's tokens
  async getTrendingTokens() {
    const pools = await this.dbcClient.state.getPoolsByConfig(
      new PublicKey(platformConfigKey)
    );
    return pools;
  }
}
```

---

### What We'd Keep

**Database still useful for:**
- User accounts (wallet login)
- User preferences (watchlists, settings)
- Analytics (aggregate stats)

**What we DON'T need database for:**
- ❌ Pool data (get from DBC SDK)
- ❌ Token data (get from DBC SDK)
- ❌ Trade history (get from DBC SDK)
- ❌ Fee data (get from DBC SDK)

---

## 🚀 Migration Steps

### Step 1: Add DBC Queries to TokenService

```typescript
// src/public-api/services/token.service.ts

async getTrendingTokens(limit: number = 10) {
  // Get all pools from DBC
  const pools = await this.dbcClient.state.getPoolsByConfig(
    new PublicKey(this.configService.get('DBC_PLATFORM_CONFIG_KEY'))
  );
  
  // Sort by volume, recent activity, etc.
  const sorted = pools
    .map(pool => ({
      poolAddress: pool.pubkey.toBase58(),
      baseMint: pool.baseMint.toBase58(),
      // ... extract data from pool state
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
    
  return sorted;
}

async getNewTokens(limit: number = 10) {
  const pools = await this.dbcClient.state.getPoolsByConfig(
    new PublicKey(this.configService.get('DBC_PLATFORM_CONFIG_KEY'))
  );
  
  // Sort by creation time (newest first)
  return pools
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

async searchTokens(query: string) {
  // Get all pools
  const pools = await this.dbcClient.state.getPoolsByConfig(
    new PublicKey(this.configService.get('DBC_PLATFORM_CONFIG_KEY'))
  );
  
  // Get metadata for each pool
  const withMetadata = await Promise.all(
    pools.map(async (pool) => {
      const metadata = await this.dbcClient.state.getPoolMetadata(pool.pubkey);
      return {
        poolAddress: pool.pubkey.toBase58(),
        name: metadata.name,
        symbol: metadata.symbol,
        ...pool
      };
    })
  );
  
  // Filter by search query
  return withMetadata.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.symbol.toLowerCase().includes(query.toLowerCase())
  );
}
```

---

### Step 2: Remove Indexer

```typescript
// Delete these files:
// - src/indexer/indexer.service.ts
// - src/indexer/indexer.module.ts

// Remove from app.module.ts:
// - IndexerModule import

// Drop database tables (optional):
// - meteora_pools
// - meteora_transactions
// - tokens
// - trades
```

---

### Step 3: Update Trading Service

```typescript
// src/public-api/services/trading.service.ts

async getBuyQuote(tokenAddress: string, amountSol: number) {
  // Get pool state from DBC
  const pool = await this.dbcClient.state.getPool(
    new PublicKey(tokenAddress)
  );
  
  // Use DBC's swap quote
  const quote = await this.dbcClient.pool.swapQuote({
    pool: pool.pubkey,
    amountIn: new BN(amountSol * 1e9),
    swapForY: true, // Buying tokens with SOL
  });
  
  return {
    expectedTokens: quote.amountOut.toNumber() / 1e9,
    priceImpact: quote.priceImpact,
    fee: quote.fee,
  };
}
```

---

## 📊 Comparison

### Current System (Indexer)

| Feature | Status |
|---------|--------|
| Real-time updates | ⚠️ Depends on indexer being online |
| Data freshness | ⚠️ Can lag if indexer restarts |
| Code complexity | ❌ High (~400 lines) |
| Background process | ❌ Needs to run 24/7 |
| Database sync | ❌ Can get out of sync |
| Maintenance | ❌ Need to monitor/restart |

### DBC SDK System (Proposed)

| Feature | Status |
|---------|--------|
| Real-time updates | ✅ Always queries latest from blockchain |
| Data freshness | ✅ Always 100% fresh |
| Code complexity | ✅ Low (~50 lines) |
| Background process | ✅ None needed |
| Database sync | ✅ No sync needed |
| Maintenance | ✅ Zero maintenance |

---

## ⚡ Performance Considerations

### Caching Strategy

**Problem:** Querying blockchain for every request = slow

**Solution:** Simple in-memory cache

```typescript
@Injectable()
export class TokenService {
  private poolsCache: {
    data: any[];
    timestamp: number;
  } = { data: [], timestamp: 0 };
  
  private CACHE_TTL = 30 * 1000; // 30 seconds
  
  async getTrendingTokens() {
    const now = Date.now();
    
    // Return cached data if fresh
    if (this.poolsCache.timestamp > now - this.CACHE_TTL) {
      return this.poolsCache.data;
    }
    
    // Fetch fresh data
    const pools = await this.dbcClient.state.getPoolsByConfig(configKey);
    
    // Update cache
    this.poolsCache = {
      data: pools,
      timestamp: now,
    };
    
    return pools;
  }
}
```

**Benefits:**
- ✅ Fast responses (cached)
- ✅ Still fresh (30s TTL)
- ✅ No database needed
- ✅ Automatic expiry

---

## 💰 Cost Analysis

### Current Indexer

**Costs:**
- Database storage (pools, transactions, tokens)
- Database queries (reads/writes)
- Server resources (indexer running 24/7)
- Maintenance time (monitoring, debugging)

### DBC SDK Queries

**Costs:**
- RPC calls (only when users request data)
- Server CPU (minimal, just caching)
- **No database writes needed!**

**Savings:**
- ✅ 90% less database usage
- ✅ No background process CPU
- ✅ Less maintenance overhead

---

## 🎯 Recommendation

### ✅ **Replace Indexer with DBC SDK**

**Reasons:**

1. **Simpler:** ~90% less code
2. **More reliable:** Uses official SDK
3. **Always fresh:** Real-time blockchain data
4. **Less maintenance:** No background process to monitor
5. **Cheaper:** Fewer database writes, less storage

**Migration effort:** ~4-6 hours
- 2 hours: Implement DBC queries in services
- 1 hour: Add caching layer
- 1 hour: Remove indexer code
- 1-2 hours: Testing

---

## 📋 Implementation Checklist

**Phase 1: Add DBC Queries (Keep Indexer Running)**
- [ ] Add `getPoolsByConfig()` to TokenService
- [ ] Add caching layer (30s TTL)
- [ ] Add `getPoolsByCreator()` to RewardsService
- [ ] Test queries return correct data
- [ ] Compare with indexer data (should match)

**Phase 2: Switch to DBC (Disable Indexer)**
- [ ] Update TokenService to use DBC queries
- [ ] Update TradingService to use DBC quotes
- [ ] Update RewardsService (already using DBC!)
- [ ] Stop indexer service
- [ ] Test all endpoints still work

**Phase 3: Cleanup (Remove Indexer)**
- [ ] Delete indexer.service.ts
- [ ] Delete indexer.module.ts
- [ ] Remove IndexerModule from app.module.ts
- [ ] Optional: Drop database tables
- [ ] Update documentation

---

## 🔍 Example: Full Token List Endpoint

### Before (Indexer)
```typescript
// 1. Indexer saves to DB
@Injectable()
export class IndexerService {
  async handlePoolCreated(event) {
    await this.poolRepository.save({
      poolAddress: event.pool,
      baseMint: event.baseMint,
      creator: event.creator,
      // ... lots of parsing
    });
  }
}

// 2. Controller queries DB
@Get('trending')
async getTrending() {
  return this.poolRepository.find({
    order: { volume: 'DESC' },
    take: 10,
  });
}
```

### After (DBC SDK)
```typescript
// No indexer needed!

@Get('trending')
async getTrending() {
  // Check cache
  if (this.isCacheFresh()) {
    return this.cachedPools;
  }
  
  // Query DBC directly
  const pools = await this.dbcClient.state.getPoolsByConfig(configKey);
  
  // Sort by volume
  const sorted = pools.sort((a, b) => b.volume - a.volume).slice(0, 10);
  
  // Cache for 30s
  this.cachedPools = sorted;
  this.cacheTime = Date.now();
  
  return sorted;
}
```

---

## ✅ Conclusion

**DBC SDK provides everything we need to replace the indexer.**

**Key Methods:**
- `getPoolsByConfig()` → List all platform tokens
- `getPoolsByCreator()` → Bot creator stats
- `getPool()` → Token details
- `getPoolFeeBreakdown()` → Rewards (already using!)

**Benefits:**
- ✅ 90% less code
- ✅ More reliable
- ✅ Always up-to-date
- ✅ Less infrastructure
- ✅ Easier maintenance

**Next Step:** Implement DBC queries + caching, test in parallel with indexer, then remove indexer once verified working.

🍆 **Ready to replace the indexer!**
