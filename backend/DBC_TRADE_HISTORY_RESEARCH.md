# DBC Trade History Research

**Date:** 2026-02-04 06:51 UTC  
**Question:** Can we get trade history from DBC API?

---

## ❌ Short Answer: NO

**DBC SDK does NOT provide historical trade data.**

The SDK provides:
- ✅ Pool state queries (`getPool`, `getPoolsByConfig`)
- ✅ Fee data (`getPoolFeeBreakdown`)
- ✅ Swap execution (`swap`, `swapBuyTx`)
- ✅ Swap quotes (`swapQuote`)
- ❌ **No trade history queries**

---

## 🔍 How to Get Trade History

### Option 1: Solana RPC (Manual Parsing)

**Method:** Query blockchain transactions directly

```typescript
// Get all transactions for a pool
const signatures = await connection.getSignaturesForAddress(
  new PublicKey(poolAddress),
  { limit: 100 }
);

// Fetch and parse each transaction
for (const sig of signatures) {
  const tx = await connection.getParsedTransaction(sig.signature);
  
  // Parse instruction data to extract:
  // - Swap direction (buy/sell)
  // - Amount in
  // - Amount out
  // - User wallet
  // - Timestamp
}
```

**Pros:**
- ✅ No indexer needed
- ✅ Always up-to-date
- ✅ Direct from blockchain

**Cons:**
- ❌ Slow (need to fetch + parse each transaction)
- ❌ Rate limited by RPC
- ❌ Complex parsing (need to decode instruction data)
- ❌ Expensive at scale (many RPC calls)

---

### Option 2: Our Current Indexer (Already Built!)

**Method:** Background service listening to DBC program logs

```typescript
// indexer.service.ts - Already doing this!
@Injectable()
export class IndexerService {
  async onModuleInit() {
    this.connection.onLogs(DBC_PROGRAM_ID, async (logs) => {
      // Parse swap events
      const swapEvent = this.parseSwapEvent(logs);
      
      // Save to database
      await this.tradeRepository.save({
        poolAddress: swapEvent.pool,
        user: swapEvent.user,
        direction: swapEvent.direction,
        amountIn: swapEvent.amountIn,
        amountOut: swapEvent.amountOut,
        timestamp: swapEvent.timestamp,
      });
    });
  }
}

// Then query from database (fast!)
const trades = await tradeRepository.find({
  where: { poolAddress },
  order: { timestamp: 'DESC' },
  take: 100,
});
```

**Pros:**
- ✅ Real-time updates
- ✅ Fast queries (database)
- ✅ Already built and working
- ✅ Can aggregate stats easily

**Cons:**
- ❌ Needs background process
- ❌ Needs database storage
- ❌ Can miss events if offline

---

### Option 3: Enhanced RPC (Helius/Alchemy/QuickNode)

**Method:** Use enhanced RPC endpoints with parsed data

```typescript
// Using Helius API
const response = await fetch(
  `https://api.helius.xyz/v0/addresses/${poolAddress}/transactions?api-key=${HELIUS_KEY}`
);

const transactions = await response.json();

// Already parsed and formatted!
transactions.forEach(tx => {
  console.log({
    type: tx.type, // 'SWAP'
    source: tx.source,
    amount: tx.amount,
    timestamp: tx.timestamp,
  });
});
```

**Pros:**
- ✅ No parsing needed (pre-parsed)
- ✅ Fast queries
- ✅ No indexer needed
- ✅ Rich metadata

**Cons:**
- ❌ Costs money (API fees)
- ❌ Vendor lock-in
- ❌ Still need to cache/store for performance

---

## 🤔 Should We Keep the Indexer?

### For Pool Data: NO (Use DBC SDK)
- ✅ `getPoolsByConfig()` replaces indexer for pool list
- ✅ `getPool()` replaces indexer for pool state
- ✅ Real-time, simpler, no database needed

### For Trade History: YES (Need Indexer or Enhanced RPC)
- ❌ DBC SDK has no trade history queries
- ✅ Indexer provides fast, queryable trade data
- ✅ Already built and working

---

## 📊 Recommended Hybrid Approach

**Use DBC SDK for:**
- Pool listings (`getPoolsByConfig`)
- Pool state (`getPool`)
- Token metadata (`getPoolMetadata`)
- Fee data (`getPoolFeeBreakdown`)

**Keep Indexer for:**
- Trade history (buy/sell events)
- User trade tracking
- Volume calculations
- Historical price data

---

## 🔧 Updated Architecture

### Before (Indexer for Everything)
```
Indexer
  ├── Pool creation events → Database
  ├── Pool state updates → Database
  ├── Trade events → Database
  └── Fee events → Database

Controllers query Database for everything
```

### After (Hybrid: DBC SDK + Indexer)
```
DBC SDK (Real-time queries)
  ├── Pool listings → getPoolsByConfig()
  ├── Pool state → getPool()
  ├── Token metadata → getPoolMetadata()
  └── Fees → getPoolFeeBreakdown()

Indexer (Trade history only)
  └── Trade events → Database

Controllers
  ├── Pool data → DBC SDK
  └── Trade history → Database
```

---

## 💡 Implementation Example

### Token Detail Page

**Old way (100% indexer):**
```typescript
@Get('tokens/:address')
async getToken(@Param('address') address: string) {
  // Get pool from database
  const pool = await this.poolRepository.findOne({ address });
  
  // Get trades from database
  const trades = await this.tradeRepository.find({ poolAddress: address });
  
  return { pool, trades };
}
```

**New way (Hybrid):**
```typescript
@Get('tokens/:address')
async getToken(@Param('address') address: string) {
  // Get pool state from DBC (real-time!)
  const pool = await this.dbcClient.state.getPool(
    new PublicKey(address)
  );
  
  // Get metadata from DBC
  const metadata = await this.dbcClient.state.getPoolMetadata(
    new PublicKey(address)
  );
  
  // Get trade history from indexer (database)
  const trades = await this.tradeRepository.find({
    where: { poolAddress: address },
    order: { timestamp: 'DESC' },
    take: 100,
  });
  
  return {
    // Real-time pool data
    pool: {
      address: pool.pubkey.toBase58(),
      price: pool.price,
      supply: pool.supply,
      progress: await this.dbcClient.state.getPoolCurveProgress(pool.pubkey),
    },
    // Metadata
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    // Historical trades
    trades,
  };
}
```

---

## 📈 Performance Comparison

### Getting Last 100 Trades

**Option 1: Solana RPC (Manual)**
- Get signatures: ~500ms
- Fetch 100 transactions: ~10-20 seconds
- Parse each transaction: ~1-2 seconds
- **Total: 12-23 seconds** ❌

**Option 2: Database (Indexer)**
- Query database: ~10-50ms
- **Total: 10-50ms** ✅

**Option 3: Enhanced RPC (Helius)**
- Single API call: ~200-500ms
- **Total: 200-500ms** ✅

---

## 💰 Cost Analysis

### Free Tier (Solana RPC)
- **Pool data:** DBC SDK (free) ✅
- **Trade history:** Manual parsing (slow, free but painful) ⚠️

### Current Setup (Indexer)
- **Pool data:** Database queries (fast, free)
- **Trade history:** Database queries (fast, free)
- **Cost:** Server CPU + Database storage

### Hybrid (DBC SDK + Indexer)
- **Pool data:** DBC SDK (free, real-time) ✅
- **Trade history:** Database queries (fast, free) ✅
- **Cost:** Less database storage, same CPU

### Enhanced RPC (Helius)
- **Pool data:** DBC SDK (free, real-time) ✅
- **Trade history:** Helius API ($$$)
- **Cost:** $0.001 per request = $100/month for 100k queries

---

## ✅ Final Recommendation

**Use Hybrid Approach:**

1. **Remove pool indexing** (use DBC SDK instead)
   - `getPoolsByConfig()` for pool list
   - `getPool()` for pool state
   - `getPoolMetadata()` for metadata

2. **Keep trade indexing** (no alternative in DBC SDK)
   - Listen to DBC program logs
   - Save swap events to database
   - Fast queries for trade history

**Benefits:**
- ✅ Simpler indexer (only tracks trades)
- ✅ Real-time pool data (DBC SDK)
- ✅ Fast trade history (database)
- ✅ Less database storage (no pool data)
- ✅ Best of both worlds

**Migration:**
1. Add DBC SDK queries for pool data
2. Simplify indexer to only track trades
3. Update controllers to use DBC SDK for pools
4. Keep trade queries hitting database

**Effort:** ~6-8 hours
- 3 hours: Add DBC queries for pools
- 2 hours: Simplify indexer (remove pool tracking)
- 2 hours: Update controllers
- 1 hour: Testing

---

## 📝 Summary

**Q: Can DBC API get trades?**  
**A: NO - DBC SDK does not provide trade history queries.**

**Solutions:**
1. **Solana RPC** (slow, complex, free)
2. **Keep Indexer** (fast, simple, already built) ✅ **Recommended**
3. **Enhanced RPC** (fast, simple, costs money)

**Best Approach:**
- Use DBC SDK for **pool data** (real-time, simpler)
- Use Indexer for **trade history** (no alternative)
- Hybrid = best performance + simplicity

🍆 **Keep the indexer, but simplify it to only track trades!**
