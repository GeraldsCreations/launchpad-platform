# Token Factory Program

Factory program for creating SPL tokens with Metaplex metadata and bonding curves.

## Overview

This program handles the entire token creation process:
1. Deploy new SPL token mint
2. Create Metaplex metadata (name, symbol, URI)
3. Initialize bonding curve via CPI
4. Transfer mint authority to bonding curve

All in a single transaction! 🚀

## Features

✅ **SPL Token Creation** - Deploy standard SPL tokens
✅ **Metaplex Integration** - Full metadata support
✅ **Bonding Curve** - Auto-initialize via CPI
✅ **Validation** - Name/symbol/URI length checks
✅ **Events** - Token creation events

## Instructions

### create_token

Create a new token with metadata and bonding curve.

**Parameters:**
- `name: String` - Token name (max 32 chars)
- `symbol: String` - Token symbol (max 10 chars)
- `uri: String` - Metadata URI (max 200 chars)
- `base_price: u64` - Bonding curve base price (lamports)
- `max_supply: u64` - Maximum token supply

**Accounts:**
- `mint` - New mint account (signer required)
- `mint_authority` - PDA authority for minting (seeds: `["mint_authority", mint]`)
- `metadata` - Metaplex metadata account
- `creator` - Token creator (signer, pays fees)
- `bonding_curve` - Bonding curve account (created via CPI)
- `sol_vault` - SOL vault for curve
- `fee_collector` - Fee collector account
- `bonding_curve_program` - Bonding curve program ID

**Process:**
1. Create SPL token mint (9 decimals)
2. Create Metaplex metadata account
3. Initialize bonding curve via CPI
4. Emit TokenCreated event

**Validations:**
- Name length <= 32
- Symbol length <= 10
- URI length <= 200
- Base price > 0
- Max supply > 0

**Events:**
- `TokenCreated`

---

### update_metadata

Update token metadata (creator only).

**Parameters:**
- `name: Option<String>` - New name (optional)
- `symbol: Option<String>` - New symbol (optional)
- `uri: Option<String>` - New URI (optional)

**Accounts:**
- `mint` - Token mint
- `metadata` - Metadata account to update
- `creator` - Original creator (signer)

**Validations:**
- Must be original creator
- Length checks on all fields

**Events:**
- `MetadataUpdated`

## Events

### TokenCreated
```rust
{
    token_mint: Pubkey,
    creator: Pubkey,
    name: String,
    symbol: String,
    uri: String,
    base_price: u64,
    max_supply: u64,
}
```

### MetadataUpdated
```rust
{
    token_mint: Pubkey,
    updater: Pubkey,
}
```

## Errors

| Code | Name | Description |
|------|------|-------------|
| 6000 | NameTooLong | Name exceeds 32 characters |
| 6001 | SymbolTooLong | Symbol exceeds 10 characters |
| 6002 | UriTooLong | URI exceeds 200 characters |
| 6003 | InvalidBasePrice | Base price must be > 0 |
| 6004 | InvalidMaxSupply | Max supply must be > 0 |

## Metadata Format

Metadata URI should point to a JSON file:

```json
{
  "name": "My Token",
  "symbol": "TOKEN",
  "description": "A cool token on Solana",
  "image": "https://example.com/image.png",
  "external_url": "https://example.com",
  "attributes": [
    {
      "trait_type": "Creator Type",
      "value": "AI Agent"
    }
  ]
}
```

## Example Usage

```typescript
import { createToken } from './sdk';

const { mint, bondingCurve } = await createToken({
  name: "Gereld Bot Token",
  symbol: "GERELD",
  uri: "https://metadata.launchpad.fun/gereld.json",
  basePrice: 100_000, // 0.0001 SOL
  maxSupply: 1_000_000_000, // 1B tokens
});

console.log("Token created:", mint.toString());
console.log("Bonding curve:", bondingCurve.toString());
```

## Integration with Bonding Curve

The factory makes a CPI call to `bonding_curve::initialize_curve`:

```rust
let cpi_accounts = bonding_curve::cpi::accounts::InitializeCurve {
    bonding_curve,
    token_mint,
    creator,
    fee_collector,
    sol_vault,
    system_program,
};

let cpi_ctx = CpiContext::new(bonding_curve_program, cpi_accounts);
bonding_curve::cpi::initialize_curve(cpi_ctx, base_price, max_supply)?;
```

This ensures the curve is initialized atomically with token creation.

## Security

✅ **Atomic creation** - All steps in single transaction
✅ **Input validation** - Length and value checks
✅ **PDA authority** - Secure mint authority transfer
✅ **Metaplex standard** - Compatible with wallets/explorers

## Testing

```bash
anchor test
```

Tests cover:
- ✅ Create token with metadata
- ✅ Validate name length
- ✅ Validate symbol length
- ✅ Validate URI length
- ✅ Validate base price
- ✅ Validate max supply
- ✅ Update metadata

## License

MIT
