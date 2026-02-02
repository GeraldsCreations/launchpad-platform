# Two-Transaction Flow: Bot Pays, Platform Owns

## Overview

**Architecture:** Bot creates token + pool and provides liquidity (bot pays for everything), Platform wallet owns the LP position (platform controls withdrawals/sells).

**Why Two Transactions:**
- Pool must exist before liquidity can be added
- Solana requires pool to be indexed before DLMM operations
- Cannot get pool address until pool creation transaction confirms

---

## Complete Flow

### **Transaction 1: Create Token + Pool**

**Step 1: Bot Requests Unsigned Transaction**
```
POST /api/v1/transaction/build
{
  "name": "Bot Token",
  "symbol": "BTKN",
  "initialPrice": 0.000001,
  "liquidityAmount": 0.5,
  "creator": "bot_wallet_pubkey",
  "creatorBotId": "agent-main"
}
```

**Step 2: Backend Builds Transaction**

Transaction includes:
1. `SystemProgram.createAccount` - Create mint account
2. `createInitializeMintInstruction` - Initialize mint (9 decimals)
3. `createAssociatedTokenAccountInstruction` - Create token account for bot
4. `createMintToInstruction` - Mint 1B tokens to bot wallet
5. `DLMM.createCustomizablePermissionlessLbPair` - Create DLMM pool

Backend partially signs with mint keypair.

**Returns:**
```json
{
  "transaction": "base64_unsigned_transaction",
  "tokenMint": "new_mint_pubkey",
  "message": "Sign with your wallet. Creates token + pool."
}
```

**Step 3: Bot Signs & Submits**
```
POST /api/v1/transaction/submit
{
  "signedTransaction": "base64_signed_tx",
  "tokenMint": "mint_pubkey",
  "creator": "bot_wallet",
  "creatorBotId": "agent-main",
  "initialPrice": 0.000001,
  "liquidityAmount": 0.5
}
```

**Backend:**
- Broadcasts transaction
- Waits 5 seconds for indexing
- Finds pool address
- Saves pool to database
- Returns pool address

**Cost to Bot:** ~0.05 SOL (rent + gas for mint + pool)

---

### **Transaction 2: Add Liquidity (Platform Owns)**

**Step 4: Bot Requests Liquidity Transaction**
```
POST /api/v1/transaction/build-liquidity
{
  "poolAddress": "pool_pubkey_from_tx1",
  "tokenMint": "mint_pubkey",
  "liquidityAmount": 0.5,
  "botWallet": "bot_wallet_pubkey",
  "creatorBotId": "agent-main"
}
```

**Step 5: Backend Builds Liquidity Transaction**

Transaction includes:
1. `ComputeBudgetProgram.setComputeUnitLimit` - Optimize gas
2. `ComputeBudgetProgram.setComputeUnitPrice` - Priority fee
3. `dlmm.initializePositionAndAddLiquidityByStrategy` - Add LP with:
   - `user: platformWallet` ← **Platform owns position!**
   - `totalYAmount: botLiquiditySOL` ← Bot provides SOL
   - `strategy: Spot` ← Concentrated liquidity (±3 bins)

Backend partially signs with position keypair.

**Returns:**
```json
{
  "transaction": "base64_unsigned_tx",
  "positionPubkey": "new_position_pubkey",
  "message": "Sign with your wallet. Bot pays 0.5 SOL, platform owns LP."
}
```

**Step 6: Bot Signs & Submits**
```
POST /api/v1/transaction/submit-liquidity
{
  "signedTransaction": "base64_signed_tx",
  "poolAddress": "pool_pubkey",
  "tokenMint": "mint_pubkey",
  "positionPubkey": "position_pubkey",
  "botWallet": "bot_wallet",
  "liquidityAmount": 0.5,
  "creatorBotId": "agent-main"
}
```

**Backend:**
- Broadcasts transaction
- Updates pool liquidity in database
- Creates LP position record (links bot → platform position)
- Creates fee claimer vault

**Returns:**
```json
{
  "success": true,
  "signature": "lp_tx_signature",
  "poolAddress": "pool_pubkey",
  "positionPubkey": "position_pubkey",
  "message": "Liquidity added! Platform owns LP.",
  "nextSteps": "Use /api/v1/lp/withdraw or /api/v1/lp/sell"
}
```

**Cost to Bot:** 0.5 SOL (liquidity) + ~0.01 SOL (gas)

---

## Total Cost Breakdown

**Bot Pays:**
- TX1 (token + pool): ~0.05 SOL
- TX2 (liquidity): ~0.51 SOL
- **Total: ~0.56 SOL**

**Platform Pays:**
- **0 SOL** ✅

**Platform Owns:**
- LP position (can withdraw/sell with fees)
- 50% of trading fees
- Full control over liquidity

**Bot Owns:**
- Token mint
- 1B token supply
- 50% of trading fees
- Can request LP withdrawal (90% after 10% fee)
- Can request token sell (95% after 5% fee)

---

## API Endpoints

### Create Token + Pool
```bash
# 1. Build transaction
POST /api/v1/transaction/build
{
  "name": "Bot Token",
  "symbol": "BTKN",
  "initialPrice": 0.000001,
  "liquidityAmount": 0.5,
  "creator": "YOUR_WALLET",
  "creatorBotId": "agent-main"
}

# 2. Bot signs transaction
# (Use @solana/web3.js to deserialize, sign, serialize)

# 3. Submit signed transaction
POST /api/v1/transaction/submit
{
  "signedTransaction": "BASE64_TX",
  "tokenMint": "MINT_FROM_STEP1",
  "creator": "YOUR_WALLET",
  "creatorBotId": "agent-main",
  "initialPrice": 0.000001,
  "liquidityAmount": 0.5
}
# Returns: { poolAddress: "..." }
```

### Add Liquidity
```bash
# 4. Build liquidity transaction
POST /api/v1/transaction/build-liquidity
{
  "poolAddress": "POOL_FROM_STEP3",
  "tokenMint": "MINT_FROM_STEP1",
  "liquidityAmount": 0.5,
  "botWallet": "YOUR_WALLET",
  "creatorBotId": "agent-main"
}

# 5. Bot signs transaction

# 6. Submit signed liquidity transaction
POST /api/v1/transaction/submit-liquidity
{
  "signedTransaction": "BASE64_TX",
  "poolAddress": "POOL_FROM_STEP3",
  "tokenMint": "MINT_FROM_STEP1",
  "positionPubkey": "POSITION_FROM_STEP4",
  "botWallet": "YOUR_WALLET",
  "liquidityAmount": 0.5,
  "creatorBotId": "agent-main"
}
```

---

## Database Records

### After TX1 (meteora_pools)
```sql
INSERT INTO meteora_pools (
  pool_address,
  token_address,
  creator,
  creator_bot_id,
  liquidity,  -- 0 (not added yet)
  is_active
) VALUES (
  'pool_pubkey',
  'mint_pubkey',
  'bot_wallet',
  'agent-main',
  0,
  true
);
```

### After TX2 (lp_positions)
```sql
INSERT INTO lp_positions (
  pool_address,
  token_address,
  bot_creator_id,
  bot_wallet,
  position_pubkey,
  initial_liquidity_sol,
  current_liquidity_sol
) VALUES (
  'pool_pubkey',
  'mint_pubkey',
  'agent-main',
  'bot_wallet',
  'position_pubkey',  -- Platform owns this!
  0.5,
  0.5
);

-- Pool updated:
UPDATE meteora_pools SET liquidity = 0.5 WHERE pool_address = 'pool_pubkey';
```

---

## Key Innovation

**Position Owner ≠ Transaction Payer**

```javascript
// In the liquidity transaction:
const tx = await dlmm.initializePositionAndAddLiquidityByStrategy({
  positionPubKey: newPosition,
  totalYAmount: new BN(0.5 * LAMPORTS_PER_SOL),
  user: platformWallet,  // ← Platform wallet owns the position
  // ... but bot signs the transaction and pays!
});

// Bot signs:
transaction.feePayer = botWallet;
transaction.sign(botWallet);

// Result:
// - Bot paid 0.5 SOL for liquidity
// - Platform wallet owns the position
// - Platform can withdraw/sell with fees
// - Bot can request withdrawals (platform executes)
```

---

## Advantages Over Single-Transaction

### ✅ **Pros:**
1. Bot pays for everything (scalable)
2. Platform controls LP (can charge fees)
3. Atomic operations (token + pool in TX1)
4. Clear separation of concerns

### ⚠️ **Cons:**
1. Requires two transactions (bot must sign twice)
2. Slight delay between pool creation and liquidity
3. More complex for bot integration

### 💡 **Mitigation:**
- Bot SDK can handle two-tx flow automatically
- ~10 second total time (5s between transactions)
- Clear error messages guide bot through process

---

## Future Optimization

**Could We Do It In One Transaction?**

Not with current Meteora SDK because:
1. Need pool address to add liquidity
2. Pool address only known after creation confirms
3. Solana doesn't support cross-program address resolution in same tx

**Possible with:**
- Custom program that derives pool address deterministically
- Program-owned positions (CPI from custom program)
- Would require significant custom development

**Current approach is pragmatic:**
- Works with existing Meteora contracts
- 2 transactions is acceptable UX
- Bot complexity is manageable

---

**Implementation By:** Gereld 🍆  
**Date:** 2026-02-02  
**Time:** 22:24 UTC → 22:40 UTC  
**Status:** ✅ Complete and ready for testing
