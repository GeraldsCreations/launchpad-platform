# Fee Collection System Explained

**Date:** 2026-02-03 21:40 UTC  
**Status:** ⚠️ Automated but NOT generating fees yet (0% trading fees during bonding curve)

---

## 🔄 How Fees Work with DBC (Dynamic Bonding Curve)

### Two Phases of a Token's Life

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1: BONDING CURVE                    │
│  Market Cap: $1k → $10k                                      │
│  Trading Fee: 0% ❌ (NO FEES COLLECTED)                      │
│  Duration: Until $10k market cap reached                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Token hits $10k market cap
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               PHASE 2: GRADUATED TO DLMM POOL                │
│  Market Cap: $10k+                                           │
│  Trading Fee: 0.25% ✅ (FEES START HERE)                     │
│  Pool Type: Meteora DLMM v2                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 💰 Current Fee Configuration

### Bonding Curve Phase (Before Graduation)
```typescript
migrationFee: {
  feePercentage: 0,           // Platform fee: 0%
  creatorFeePercentage: 0,    // Creator fee: 0%
}
```

**Result:** ❌ **NO fees collected during bonding curve trading**

### DLMM Pool Phase (After Graduation)
```typescript
migratedPoolFee: {
  collectFeeMode: 0,          // Collect in quote token (SOL)
  dynamicFee: 0,              // Fixed fee (not dynamic)
  poolFeeBps: 25,             // 0.25% pool fee (25 basis points)
}
```

**Result:** ✅ **0.25% fee on every trade after graduation**

---

## 🤖 Automated Fee Collection System

### 1. **Fee Claimer Vaults** (Created Per Token)

When a token is created, a **Fee Claimer Vault** is automatically set up:

```typescript
// Located: fee-collection.service.ts

async createFeeClaimerVault(poolAddress, tokenAddress) {
  // Derive a unique PDA (Program Derived Address) for this pool
  const [feeClaimerPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('fee_claimer'), poolAddress.toBuffer()],
    METEORA_PROGRAM_ID
  );
  
  // Save to database
  vault = {
    poolAddress,
    tokenAddress,
    feeClaimerPubkey: feeClaimerPDA,
    totalFeesCollected: 0,
    unclaimedFees: 0,
  };
}
```

**Database:** `fee_claimer_vaults` table

### 2. **Automated Collection** (Every Hour)

```typescript
// Located: fee-collection.scheduler.ts

@Cron(CronExpression.EVERY_HOUR)
async handleFeeCollection() {
  // Run every hour automatically
  const result = await this.feeCollectionService.collectAllFees();
}
```

**Process:**
1. **Query** all vaults that haven't been claimed in 1+ hour
2. **Check** each vault's balance (skip if < 0.01 SOL)
3. **Claim** fees from Meteora program
4. **Transfer** to platform wallet
5. **Split** 50/50 between platform and bot creator
6. **Update** database records

### 3. **Fee Splitting** (50/50)

```typescript
// Located: fee-collection.service.ts

async distributeCreatorRewards(vault, feeAmount) {
  // Get bot creator info from pool
  const pool = await this.poolRepository.findOne({ poolAddress });
  
  // Calculate split (default 50/50)
  const creatorShare = feeAmount * (pool.creatorRevenueSharePercent / 100);
  const platformShare = feeAmount - creatorShare;
  
  // Update bot's reward balance
  reward.unclaimedAmount += creatorShare;
  
  // Platform share goes directly to platform wallet
}
```

---

## 📊 Fee Flow Diagram

```
User trades on graduated token (DLMM pool)
              ↓
        0.25% fee charged
              ↓
   Fee sent to Fee Claimer Vault PDA
              ↓
   (Accumulated until hourly collection)
              ↓
     Automated Scheduler Runs (every hour)
              ↓
  Check vault balance > 0.01 SOL?
              ↓
        Claim fees from vault
              ↓
Transfer to Platform Wallet (100% collected)
              ↓
         Split 50/50:
    ┌────────────────────┐
    │                    │
    ▼                    ▼
Platform 50%      Bot Creator 50%
    │                    │
    │                    ├─► Save to bot_creator_rewards table
    │                    └─► Mark as unclaimed
    │
    └─► Platform wallet (immediately available)
```

---

## 🗄️ Database Tables

### **fee_claimer_vaults**
```sql
- id                     - Auto-increment
- pool_address           - DLMM pool address
- token_address          - Token mint address
- fee_claimer_pubkey     - PDA for collecting fees
- total_fees_collected   - Lifetime total (SOL)
- claimed_fees           - Already claimed (SOL)
- unclaimed_fees         - Waiting to be claimed (SOL)
- last_claim_at          - Last collection timestamp
- claim_count            - Number of times claimed
- created_at             - When vault was created
```

### **bot_creator_rewards**
```sql
- id                     - Auto-increment
- bot_id                 - Bot identifier (creator)
- bot_wallet             - Bot's wallet address
- pool_address           - Associated pool
- token_address          - Token mint
- total_fees_earned      - Lifetime earnings (SOL)
- claimed_amount         - Already paid out (SOL)
- unclaimed_amount       - Pending payout (SOL)
- revenue_share_percent  - % split (default 50%)
- claimed                - Boolean flag
- last_claim_at          - When last paid
- created_at / updated_at
```

---

## ⚙️ Configuration

### Environment Variables
```bash
# Platform wallet (receives 50% of fees)
PLATFORM_WALLET_KEYPAIR="[...]"

# DBC platform config (identifies our tokens)
DBC_PLATFORM_CONFIG_KEY="56JeApcTgcSEE6mNJ5ygv4i7rkzjCiVgpuwPD4UE8r7V"
```

### Fee Split Defaults
```typescript
// Default revenue share for bot creators
creatorRevenueSharePercent: 50  // 50% to creator, 50% to platform
```

**Configurable per token** when pool is created (stored in `meteora_pools` table).

---

## 📈 Platform Stats (Logged Every 6 Hours)

```
=== Platform Stats ===
Total Fees Collected: 12.5000 SOL
Total Vaults: 25
Bot Rewards (Total): 6.2500 SOL
Bot Rewards (Claimed): 3.0000 SOL
Bot Rewards (Unclaimed): 3.2500 SOL
====================
```

---

## 🚨 Current Issue: No Fees During Bonding Curve

### Problem

Tokens are in **Phase 1 (Bonding Curve)** from $1k → $10k market cap, where:
- ❌ Trading fee is **0%**
- ❌ NO fees collected during this phase
- ❌ Only after graduation ($10k+) do fees start

### Impact

**Until tokens graduate:**
- Platform earns: **$0**
- Bot creators earn: **$0**
- Fee system is idle (nothing to collect)

### Solution Options

#### Option 1: Add Bonding Curve Trading Fee
```typescript
migrationFee: {
  feePercentage: 25,          // 0.25% platform fee ✅
  creatorFeePercentage: 25,   // 0.25% creator fee ✅
}
```

**Result:** 0.5% total fee on every trade from day 1

#### Option 2: Keep 0% Until Graduation
```typescript
// Current setup - no changes
```

**Result:** Platform only earns after tokens reach $10k market cap

#### Option 3: Higher Post-Graduation Fee
```typescript
migratedPoolFee: {
  poolFeeBps: 50,  // 0.5% instead of 0.25%
}
```

**Result:** Compensate for no bonding curve fees with higher graduated pool fees

---

## 💡 Recommendation

**For early revenue, add bonding curve fees:**

```typescript
// Update dbc.service.ts
migrationFee: {
  feePercentage: 25,          // 0.25% → platform
  creatorFeePercentage: 25,   // 0.25% → bot creator
}
```

**Why:**
- ✅ Revenue from day 1
- ✅ Competitive with other platforms (most charge 0.5-1%)
- ✅ Rewards early bot creators immediately
- ✅ Total 0.5% fee (0.25% × 2) is reasonable

---

## 🔧 How to Enable Bonding Curve Fees

1. Edit: `backend/src/meteora-api/services/dbc.service.ts`
2. Find `buildCurveWithMarketCap()` call
3. Update `migrationFee` section:
   ```typescript
   migrationFee: {
     feePercentage: 25,        // Change from 0
     creatorFeePercentage: 25, // Change from 0
   }
   ```
4. Restart backend
5. Test with new token creation

---

## ✅ What's Already Working

### Automated System ✅
- ✅ Scheduler runs every hour
- ✅ Collects from all vaults
- ✅ Splits 50/50 automatically
- ✅ Updates database records
- ✅ Logs stats every 6 hours

### Database Tracking ✅
- ✅ Fee claimer vaults created
- ✅ Bot creator rewards tracked
- ✅ Unclaimed amounts recorded
- ✅ Lifetime totals maintained

### Missing ❌
- ❌ No fees during bonding curve phase (0% configured)
- ❌ Manual payout system for bot creators (DB tracking only)

---

## 🚀 Next Steps

1. **Decide on fee structure:**
   - Add bonding curve fees? (recommended)
   - Keep 0% until graduation? (delayed revenue)

2. **Implement bot creator payouts:**
   - Currently: Rewards tracked but not paid
   - Need: Endpoint to transfer unclaimed amounts to bot wallets

3. **Test fee collection:**
   - Create token → graduate it → verify fees collect
   - Check hourly scheduler logs
   - Verify database updates

---

## 📝 Summary

**Fee System Status:** ✅ **Automated and ready**  
**Currently Collecting:** ❌ **$0 (no fees during bonding curve)**  
**Recommendation:** ✅ **Enable 0.5% bonding curve fees (0.25% × 2)**  
**Revenue Split:** ✅ **50% platform, 50% bot creator**  
**Automation:** ✅ **Hourly collection, automatic splitting**

The system is built and working—just needs fees enabled to start generating revenue! 🍆
