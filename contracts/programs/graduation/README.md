# Graduation Handler Program

Monitors bonding curves and migrates them to Raydium DEX when market cap threshold is reached.

## Overview

When a token reaches $69K market cap on the bonding curve, it "graduates" to Raydium - a full-featured DEX with deep liquidity. The graduation process:

1. ✅ Monitors market cap
2. ✅ Marks curve as graduated
3. ✅ Creates Raydium pool
4. ✅ Adds all liquidity (SOL + tokens)
5. ✅ Burns LP tokens (permanent lock)

## Graduation Threshold

**$69,000 market cap**

Calculated as: `sol_reserves * SOL_PRICE_USD`

For testing/devnet, threshold is configurable.

## Features

✅ **Automatic graduation** - Triggered when threshold reached
✅ **Raydium integration** - Creates DEX pool via CPI
✅ **Liquidity lock** - LP tokens permanently burned
✅ **Emergency withdraw** - Admin escape hatch
✅ **Events** - All state changes logged

## State

This program is stateless - it operates on `BondingCurve` accounts from the bonding curve program.

## Instructions

### check_and_graduate

Check if token has reached graduation threshold and mark as graduated.

**Accounts:**
- `bonding_curve` - Bonding curve account (read-only)
- `authority` - Signer authorized to trigger graduation
- `bonding_curve_program` - Bonding curve program ID

**Process:**
1. Read bonding curve state
2. Calculate market cap: `sol_reserves * SOL_PRICE`
3. Check if >= $69K threshold
4. If yes, call `bonding_curve::graduate()` via CPI
5. Emit `ReadyForGraduation` event

**Validations:**
- Market cap >= threshold
- Curve not already graduated

**Events:**
- `ReadyForGraduation`

**Example:**
```typescript
await graduationProgram.methods
  .checkAndGraduate()
  .accounts({
    bondingCurve,
    authority: wallet.publicKey,
    bondingCurveProgram: BONDING_CURVE_PROGRAM_ID,
  })
  .rpc();
```

---

### migrate_to_raydium

Migrate curve liquidity to Raydium DEX pool.

**Accounts:**
- `bonding_curve` - Graduated bonding curve
- `token_mint` - Token mint
- `sol_vault` - Curve's SOL vault
- `token_vault` - Curve's token vault
- `raydium_pool` - New Raydium pool account
- `raydium_program` - Raydium AMM program
- `authority` - Signer authorized to migrate

**Process:**
1. Verify curve is graduated
2. Create Raydium pool via CPI
3. Transfer all SOL from curve to pool
4. Transfer all tokens to pool
5. Receive LP tokens
6. Burn LP tokens (permanent lock)
7. Emit `TokenGraduated` event

**Validations:**
- Curve must be graduated
- Sufficient SOL and token reserves

**Events:**
- `TokenGraduated`

**Example:**
```typescript
await graduationProgram.methods
  .migrateToRaydium()
  .accounts({
    bondingCurve,
    tokenMint,
    solVault,
    tokenVault,
    raydiumPool,
    raydiumProgram: RAYDIUM_AMM_PROGRAM_ID,
    authority: wallet.publicKey,
  })
  .rpc();
```

---

### emergency_withdraw

Emergency function to withdraw SOL if graduation fails.

**Accounts:**
- `bonding_curve` - Graduated bonding curve
- `sol_vault` - Curve's SOL vault
- `creator` - Original token creator (receives funds)
- `admin` - Admin signer

**Process:**
1. Verify curve is graduated
2. Transfer all SOL from vault to creator
3. Emit `EmergencyWithdrawal` event

**Validations:**
- Curve must be graduated
- Only admin can call

**Events:**
- `EmergencyWithdrawal`

**Note:** This is a safety mechanism if Raydium migration fails. Should rarely be used.

## Events

### ReadyForGraduation
```rust
{
    token_mint: Pubkey,
    market_cap_sol: u64,
    sol_reserves: u64,
    token_supply: u64,
}
```

### TokenGraduated
```rust
{
    token_mint: Pubkey,
    raydium_pool: Pubkey,
    sol_migrated: u64,
    tokens_migrated: u64,
    lp_tokens_burned: bool,
}
```

### EmergencyWithdrawal
```rust
{
    token_mint: Pubkey,
    amount: u64,
    recipient: Pubkey,
}
```

## Errors

| Code | Name | Description |
|------|------|-------------|
| 6000 | AlreadyGraduated | Token has already graduated |
| 6001 | ThresholdNotReached | Market cap below $69K |
| 6002 | NotGraduated | Token hasn't graduated yet |
| 6003 | Unauthorized | Not authorized to perform action |

## Raydium Integration

The program integrates with Raydium AMM v4:

**Raydium AMM Program:** `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`

### Pool Creation

```rust
// Simplified - actual implementation uses Raydium CPI
raydium_amm::instruction::initialize2(
    program_id: &Pubkey,
    amm_id: &Pubkey,
    amm_authority: &Pubkey,
    amm_open_orders: &Pubkey,
    lp_mint_address: &Pubkey,
    coin_mint_address: &Pubkey,  // Token
    pc_mint_address: &Pubkey,     // SOL (wrapped)
    pool_coin_token_account: &Pubkey,
    pool_pc_token_account: &Pubkey,
    // ... more accounts
    nonce: u8,
    open_time: u64,
)?;
```

### LP Token Burn

After creating pool and adding liquidity:

```rust
// Burn all LP tokens to lock liquidity permanently
token::burn(
    CpiContext::new(token_program, Burn {
        mint: lp_mint,
        from: lp_token_account,
        authority: graduation_handler,
    }),
    lp_balance,
)?;
```

This ensures:
- ✅ Liquidity is permanently locked
- ✅ No one can remove it (rug-pull protection)
- ✅ Token is fully "graduated" to decentralized trading

## Graduation Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Token trading on bonding curve                       │
│    (price increases as more tokens bought)              │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
              Market cap >= $69K?
                      │
                      ▼ Yes
┌─────────────────────────────────────────────────────────┐
│ 2. check_and_graduate()                                 │
│    - Verify threshold                                   │
│    - Mark curve as graduated                            │
│    - Emit ReadyForGraduation                            │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ 3. migrate_to_raydium()                                 │
│    - Create Raydium pool                                │
│    - Add all SOL + tokens as liquidity                  │
│    - Burn LP tokens (permanent lock)                    │
│    - Emit TokenGraduated                                │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Token now tradable on Raydium                        │
│    - Full DEX functionality                             │
│    - Lower fees (0.25% vs 1%)                           │
│    - Liquidity permanently locked                       │
│    - Rug-pull impossible                                │
└─────────────────────────────────────────────────────────┘
```

## Automation

In production, graduation should be automated:

```typescript
// Backend service monitoring bonding curves
setInterval(async () => {
  const curves = await getAllBondingCurves();
  
  for (const curve of curves) {
    if (!curve.graduated && curve.marketCap >= GRADUATION_THRESHOLD) {
      try {
        // Auto-graduate
        await graduationProgram.methods
          .checkAndGraduate()
          .accounts({ ... })
          .rpc();
        
        // Wait for confirmation, then migrate
        await graduationProgram.methods
          .migrateToRaydium()
          .accounts({ ... })
          .rpc();
        
        console.log(`🎓 Token ${curve.tokenMint} graduated!`);
      } catch (err) {
        console.error(`Failed to graduate ${curve.tokenMint}:`, err);
      }
    }
  }
}, 60_000); // Check every minute
```

## Security

✅ **Threshold enforcement** - Can't graduate early
✅ **Immutable graduation** - Can't un-graduate
✅ **LP token burn** - Liquidity permanently locked
✅ **Emergency escape** - Admin can recover if migration fails

⚠️  **Considerations:**
- Oracle price feed for accurate market cap
- MEV protection during migration
- Raydium pool creation costs
- Gas optimization for high-frequency checks

## Testing

```bash
anchor test
```

Tests cover:
- ✅ Check graduation threshold
- ✅ Graduate token
- ✅ Migrate to Raydium
- ✅ Emergency withdrawal
- ✅ Already graduated error
- ✅ Threshold not reached error

## License

MIT
