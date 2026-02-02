# Bonding Curve Program

Automated market maker (AMM) for token price discovery using a quadratic bonding curve formula.

## Overview

This program implements a bonding curve that automatically adjusts token price based on supply. As more tokens are bought, the price increases quadratically. When tokens are sold, the price decreases.

### Pricing Formula

```
price = base_price × (1 + supply / max_supply)²
```

**Example:**
- Base price: 0.0001 SOL
- Current supply: 100M tokens
- Max supply: 1B tokens
- Current price: 0.0001 × (1 + 0.1)² = 0.000121 SOL

## Features

✅ **Buy Function** - Purchase tokens with SOL
✅ **Sell Function** - Sell tokens back for SOL  
✅ **1% Fee** - Collected on all trades
✅ **Slippage Protection** - Min tokens out for buys, min SOL out for sells
✅ **Graduation** - Can be marked as graduated to disable trading
✅ **Events** - Emits events for all state changes

## State

```rust
pub struct BondingCurve {
    pub token_mint: Pubkey,        // SPL token mint address
    pub creator: Pubkey,            // Token creator
    pub base_price: u64,            // Starting price (lamports)
    pub token_supply: u64,          // Current circulating supply
    pub max_supply: u64,            // Maximum token supply
    pub sol_reserves: u64,          // SOL held in curve (lamports)
    pub fee_collector: Pubkey,      // Address that receives fees
    pub graduated: bool,            // Whether curve has graduated
    pub created_at: i64,            // Unix timestamp
    pub bump: u8,                   // PDA bump seed
}
```

## Instructions

### initialize_curve

Initialize a new bonding curve for a token.

**Parameters:**
- `base_price: u64` - Starting price in lamports (e.g., 100_000 = 0.0001 SOL)
- `max_supply: u64` - Maximum token supply (e.g., 1_000_000_000)

**Accounts:**
- `bonding_curve` - PDA account to initialize (seeds: `["bonding_curve", token_mint]`)
- `token_mint` - Token mint account
- `creator` - Signer creating the curve
- `fee_collector` - Account that receives trading fees
- `sol_vault` - PDA to hold SOL reserves (seeds: `["sol_vault", token_mint]`)

**Validations:**
- Base price must be > 0
- Max supply must be > 0

**Events:**
- `CurveInitialized`

---

### buy

Buy tokens with SOL.

**Parameters:**
- `sol_amount: u64` - Amount of SOL to spend (lamports)
- `min_tokens_out: u64` - Minimum tokens to receive (slippage protection)

**Accounts:**
- `bonding_curve` - Curve account
- `token_mint` - Token mint (with mint authority = curve PDA)
- `buyer` - Signer buying tokens
- `buyer_token_account` - Buyer's token account (receives tokens)
- `sol_vault` - Curve's SOL vault (receives SOL)
- `fee_collector` - Fee collector account

**Process:**
1. Calculate 1% fee on SOL amount
2. Transfer SOL (minus fee) from buyer to vault
3. Transfer fee to fee collector
4. Calculate tokens to mint based on bonding curve
5. Mint tokens to buyer
6. Update curve state (supply, reserves)

**Validations:**
- Curve must not be graduated
- SOL amount must be > 0
- Tokens to mint must be >= min_tokens_out (slippage)
- New supply must not exceed max_supply

**Events:**
- `TokensBought`

---

### sell

Sell tokens for SOL.

**Parameters:**
- `token_amount: u64` - Amount of tokens to sell
- `min_sol_out: u64` - Minimum SOL to receive (slippage protection)

**Accounts:**
- `bonding_curve` - Curve account
- `token_mint` - Token mint
- `seller` - Signer selling tokens
- `seller_token_account` - Seller's token account (tokens burned from here)
- `sol_vault` - Curve's SOL vault (sends SOL)
- `fee_collector` - Fee collector account

**Process:**
1. Calculate SOL to return based on bonding curve
2. Calculate 1% fee on SOL amount
3. Burn tokens from seller
4. Transfer SOL (minus fee) from vault to seller
5. Transfer fee to fee collector
6. Update curve state (supply, reserves)

**Validations:**
- Curve must not be graduated
- Token amount must be > 0
- Token amount must be <= current supply
- SOL to return (minus fee) must be >= min_sol_out (slippage)
- SOL to return must be <= reserves

**Events:**
- `TokensSold`

---

### get_price

Get current token price (view function).

**Returns:**
- `u64` - Current price in lamports

**Accounts:**
- `bonding_curve` - Curve account (read-only)

**Formula:**
```rust
price = base_price * (1 + supply / max_supply)^2
```

---

### graduate

Mark curve as graduated, disabling all trading.

**Accounts:**
- `bonding_curve` - Curve account
- `graduation_handler` - Signer (must be graduation program)

**Validations:**
- Curve must not already be graduated

**Events:**
- `CurveGraduated`

**Note:** Only callable by the graduation handler program.

## Events

### CurveInitialized
```rust
{
    token_mint: Pubkey,
    creator: Pubkey,
    base_price: u64,
    max_supply: u64,
}
```

### TokensBought
```rust
{
    buyer: Pubkey,
    token_mint: Pubkey,
    sol_amount: u64,
    tokens_received: u64,
    fee: u64,
}
```

### TokensSold
```rust
{
    seller: Pubkey,
    token_mint: Pubkey,
    tokens_sold: u64,
    sol_received: u64,
    fee: u64,
}
```

### CurveGraduated
```rust
{
    token_mint: Pubkey,
    final_supply: u64,
    sol_reserves: u64,
}
```

## Errors

| Code | Name | Description |
|------|------|-------------|
| 6000 | InvalidBasePrice | Base price must be > 0 |
| 6001 | InvalidMaxSupply | Max supply must be > 0 |
| 6002 | InvalidAmount | Amount must be > 0 |
| 6003 | CurveGraduated | Trading disabled (curve graduated) |
| 6004 | MathOverflow | Arithmetic overflow |
| 6005 | SlippageExceeded | Price moved beyond slippage tolerance |
| 6006 | MaxSupplyExceeded | Cannot exceed max token supply |
| 6007 | InsufficientSupply | Not enough tokens in circulation |
| 6008 | InsufficientReserves | Not enough SOL in reserves |
| 6009 | AlreadyGraduated | Curve already graduated |

## Security Considerations

### ✅ Implemented
- **Slippage protection** - Min/max amounts on trades
- **Math overflow checks** - All arithmetic checked
- **Graduated state** - Immutable once set
- **PDA authority** - Only curve can mint tokens
- **Fee collection** - 1% on all trades

### ⚠️  Considerations
- **Price manipulation** - Large buys can significantly move price
- **Frontrunning** - Public mempool allows MEV
- **Graduation timing** - No time locks on graduation

### 🔐 Recommendations
- Use slippage protection on all trades
- Monitor for unusual trading patterns
- Implement rate limiting in frontend
- Consider MEV protection for large trades

## Testing

Run tests:
```bash
anchor test
```

Unit tests cover:
- ✅ Initialize curve
- ✅ Buy tokens
- ✅ Sell tokens
- ✅ Get current price
- ✅ Graduate curve
- ✅ Slippage protection
- ✅ Math overflow prevention
- ✅ Invalid inputs

## License

MIT
