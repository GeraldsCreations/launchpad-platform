# DBC Config & Fee Flow

**Our Platform Config:** `56JeApcTgcSEE6mNJ5ygv4i7rkzjCiVgpuwPD4UE8r7V`

---

## ✅ How It Works

### 1. **Platform Config Created Once (Already Done)**

Our DBC config was created with this fee structure:

```typescript
// Location: dbc.service.ts line 233
migrationFee: {
  feePercentage: 0,          // 0% during bonding curve
  creatorFeePercentage: 0,   // 0% during bonding curve
},

migratedPoolFee: {
  poolFeeBps: 25,            // 0.25% after graduation
}
```

**Config Key:** `56JeApcTgcSEE6mNJ5ygv4i7rkzjCiVgpuwPD4UE8r7V`

This config is **stored on-chain** and contains all fee parameters.

---

### 2. **Every Token Uses This Config**

When a token is created:

```typescript
// Location: dbc.service.ts line 438-463
async buildCreateTokenTransaction(params) {
  // Check if config exists
  if (!this.platformConfigKey) {
    throw new Error('Platform config not initialized');
  }
  
  // Create token + pool using OUR config
  const result = await this.createTokenAndPool({
    name: params.name,
    symbol: params.symbol,
    configKey: this.platformConfigKey,  // ← OUR CONFIG!
    // ...
  });
}
```

**Flow:**
```
Frontend → POST /tokens/create
    ↓
TokenService.createToken()
    ↓
DbcService.buildCreateTokenTransaction()
    ↓
Uses platformConfigKey: 56JeApcTgcSEE6mNJ5ygv4i7rkzjCiVgpuwPD4UE8r7V
    ↓
Creates token with OUR fee structure
    ↓
Transaction submitted to Solana
    ↓
Fees collected according to OUR config
```

---

### 3. **Indexer Filters by This Config**

The indexer **only tracks tokens using our config:**

```typescript
// Location: indexer.service.ts
private platformConfigKey = '56JeApcTgcSEE6mNJ5ygv4i7rkzjCiVgpuwPD4UE8r7V';

async isOurPlatformTransaction(signature) {
  // Fetch transaction
  const tx = await this.connection.getParsedTransaction(signature);
  
  // Check if OUR config is mentioned
  const isOurs = accountKeys.includes(this.platformConfigKey);
  
  // Only process if it's ours
  return isOurs;
}
```

---

## 🔒 **Security: Config is Immutable**

**Once created, the DBC config CANNOT be changed!**

- ✅ Fee structure is **locked on-chain**
- ✅ All tokens using this config have **identical fee rules**
- ✅ No way to change fees for existing config
- ✅ New config needed if fee structure changes

---

## 💰 **Current Fee Structure (On-Chain)**

Our config `56Je...` has these fees:

### Phase 1: Bonding Curve ($1k → $10k)
```
Platform Fee:    0%   ❌
Creator Fee:     0%   ❌
Total:           0%   ❌
```

### Phase 2: After Graduation ($10k+)
```
Trading Fee:     0.25%  ✅
Split:           50/50 (platform/creator)
Platform Gets:   0.125% per trade
Creator Gets:    0.125% per trade
```

---

## 🔍 **Verification**

### Check Token Uses Our Config:

1. **Create a token** via `/tokens/create`
2. **Get transaction signature** from response
3. **View on Solana Explorer:** `https://explorer.solana.com/tx/[signature]?cluster=devnet`
4. **Look at accounts** - you'll see our config: `56JeApcTgcSEE6mNJ5ygv4i7rkzjCiVgpuwPD4UE8r7V`

### Check Database:

```sql
SELECT * FROM meteora_pools WHERE pool_address = '[pool_address]';

-- You'll see:
-- config_key: 56JeApcTgcSEE6mNJ5ygv4i7rkzjCiVgpuwPD4UE8r7V
-- creator_revenue_share_percent: 50
```

---

## ✅ **Confirmed: All Connected**

**Platform Config:** `56JeApcTgcSEE6mNJ5ygv4i7rkzjCiVgpuwPD4UE8r7V` ✅  
**Fee Structure:** Defined in config (0% bonding, 0.25% graduated) ✅  
**Token Creation:** Uses this config (line 461 in dbc.service.ts) ✅  
**Indexer Filtering:** Only tracks this config ✅  
**Fee Collection:** Collects from tokens with this config ✅  

**Everything is tied to our DBC config!** 🎯

---

## 📝 **To Change Fee Structure:**

**Option 1: Create New Config (Recommended)**
```typescript
// Create new config with different fees
const newConfig = await dbcService.createPartnerConfig({
  migrationFee: {
    feePercentage: 25,        // NEW: 0.25% during bonding
    creatorFeePercentage: 25, // NEW: 0.25% creator share
  }
});

// Update platformConfigKey to use new config
this.platformConfigKey = newConfig.configKey;
```

**Option 2: Deploy New Platform (Not Recommended)**
- Different config = different platform identity
- Lose continuity with existing tokens

---

## 🚨 **Important Notes**

1. **Config is per-platform, not per-token**
   - All tokens share the same config
   - Same fee structure for all tokens
   
2. **Config is immutable once created**
   - Cannot modify existing config
   - Must create new config for different fees
   
3. **Database vs On-Chain**
   - Database stores: rewards, splits, tracking
   - On-chain stores: fee structure, config
   - Both reference the same config key

4. **Fee Collection Always Uses Config**
   - Meteora SDK reads fees from on-chain config
   - Our scheduler collects based on config rules
   - Split happens according to config percentages

---

## ✅ Summary

**Yes, fee collection uses our DBC config!**

- Config Key: `56JeApcTgcSEE6mNJ5ygv4i7rkzjCiVgpuwPD4UE8r7V`
- Every token created uses this config
- Fees defined in config (0% bonding, 0.25% graduated)
- Indexer filters by this config
- Fee collection reads from this config
- 50/50 split automated

**Everything is properly connected!** 🍆
