# Meteora DBC Research & Implementation Notes

## What is DBC?

**Dynamic Bonding Curve (DBC)** - Pump.fun style token launches with automatic price discovery

### Key Features:
- ✅ One-transaction token + pool creation
- ✅ Token minted as part of pool creation (can't use existing token)
- ✅ Bonding curve with up to 16 customizable price points
- ✅ Automatic migration to DLMM when threshold hit (10 SOL default)
- ✅ Anti-sniper protection built-in
- ✅ Fee sharing (80% partner, 20% protocol)
- ✅ Locked LP tokens after migration

## Implementation Complexity

### SDK: `@meteora-ag/dynamic-bonding-curve-sdk` v1.5.1

**Services Available:**
- `PoolService` - Create pools, swap
- `PartnerService` - Create configs, claim fees
- `CreatorService` - Claim fees, withdraw
- `MigrationService` - Handle DLMM migration

### Type Challenges:

**1. CreatePoolParams:**
```typescript
type CreatePoolParams = {
  name: string;
  symbol: string;
  uri: string;
  payer: PublicKey;
  poolCreator: PublicKey;
  config: PublicKey;
  baseMint: PublicKey; // ← Expects PublicKey, not Keypair!
};
```

**Issue:** baseMint must be a PublicKey, but we need a way to sign the mint creation. The SDK likely handles this internally through `createPoolTx` method.

**2. FirstBuyParams:**
```typescript
type FirstBuyParams = {
  buyer: PublicKey;
  receiver?: PublicKey;
  buyAmount: BN;          // ← Changed from inAmount
  minimumAmountOut: BN;   // ← Changed from minOutAmount
  referralTokenAccount: PublicKey | null;
};
```

**3. Pool Address Derivation:**
```typescript
import { deriveDbcPoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';

const poolAddress = deriveDbcPoolAddress(
  quoteMint,  // SOL
  baseMint,   // Token
  config      // Partner config
);
```

**4. Program Access:**
```typescript
import { createDbcProgram } from '@meteora-ag/dynamic-bonding-curve-sdk';

const program = createDbcProgram(connection);
const poolAccount = await program.program.account.pool.fetch(poolPubkey);
```

## Implementation Status

### Files Created:
- ✅ `dbc.service.ts` (350+ lines)
- ✅ `dbc.controller.ts` (200+ lines)
- ✅ `create-dbc-token.dto.ts` (100+ lines)
- ✅ Module integration

### Compilation Errors:
1. `baseMint` type mismatch (Keypair vs PublicKey)
2. `FirstBuyParams` structure mismatch
3. `program.account` access pattern incorrect

### Time Required:
- **Research:** 2 hours (completed)
- **Implementation:** 2 hours (in progress)
- **Debugging:** 3-4 hours (estimated)
- **Testing:** 2 hours (estimated)
- **Total:** ~10 hours

## Partner Config Setup

**One-Time Setup Required:**

```typescript
const config = await partnerService.createConfig({
  createConfigParam: {
    configParameters: {
      curve: buildCurve({
        migrationQuoteAmount: new BN(10 * 1e9), // 10 SOL
        totalSupply: new BN(1_000_000_000), // 1B tokens
        initialPrice: 0.000001, // Starting price
      }),
      migrationOption: MigrationOption.DAMM_V2,
      migrationQuoteThreshold: new BN(10 * 1e9),
      poolCreationFee: new BN(0.05 * 1e9),
      poolTradingFeeBps: 100, // 1%
      creatorTradingFeeBps: 50, // 50% to creator
      // ... more params
    },
    quoteMint: SOL_MINT,
  },
  config: Keypair.generate(),
  feeClaimer: platformWallet.publicKey,
  payer: platformWallet.publicKey,
});
```

## Advantages over DLMM

### DBC (Bonding Curve):
- ✅ True pump.fun experience
- ✅ Automatic price discovery
- ✅ One transaction (token + pool)
- ✅ Auto-migration to liquidity pool
- ✅ Anti-sniper protection
- ✅ Built-in fee sharing

### DLMM (Manual):
- ✅ More control over pool parameters
- ✅ Simpler SDK (fewer type issues)
- ✅ Faster to implement
- ❌ No bonding curve
- ❌ Manual liquidity provision
- ❌ More complex for users

## Recommendation

**For LaunchPad:**

**Phase 1 (This Week):** Finish DLMM implementation
- 2-transaction flow (token → pool+liquidity)
- Bot pays, platform owns LP
- Manual liquidity provision
- **Status:** 90% complete, needs 2-4 hours

**Phase 2 (Next Week):** Add DBC as premium feature
- Bonding curve launches
- Pump.fun style experience
- **Status:** 40% complete, needs 6-8 hours

**Why Hybrid Approach:**
1. Get to market faster (DLMM works now)
2. Learn from user feedback
3. DBC adds premium bonding curve later
4. Both options give flexibility

## Next Steps

### If Continuing DBC:
1. Fix `baseMint` type issue (check SDK examples)
2. Correct `FirstBuyParams` structure
3. Fix program account fetching
4. Test end-to-end flow
5. Add metadata upload (IPFS/Arweave)

### If Finishing DLMM:
1. Finalize 2-transaction flow
2. Test token + pool creation
3. Test liquidity addition
4. Full backend audit
5. Deploy to devnet

---

**Date:** 2026-02-02
**Status:** DBC Implementation Paused (40% complete)
**Decision Needed:** Finish DLMM or Continue DBC?
