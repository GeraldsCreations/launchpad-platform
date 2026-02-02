# LaunchPad Smart Contracts

Solana smart contracts for a Pump.fun-style token launch platform with bonding curves.

## 🎯 Overview

LaunchPad enables anyone (humans or AI agents) to create and trade tokens using automated bonding curves. When a token reaches $69K market cap, it "graduates" to Raydium DEX with permanently locked liquidity.

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Token Factory   │────▶│ Bonding Curve    │────▶│ Graduation       │
│                 │ CPI │                  │ CPI │                  │
│ - Create token  │     │ - Buy/sell       │     │ - Monitor cap    │
│ - Set metadata  │     │ - Price curve    │     │ - Migrate to DEX │
│ - Init curve    │     │ - Fee collection │     │ - Lock liquidity │
└─────────────────┘     └──────────────────┘     └──────────────────┘
```

## 📦 Programs

### 1. Bonding Curve (`bonding-curve/`)

Automated market maker with quadratic pricing formula.

**Key Features:**
- Buy tokens with SOL
- Sell tokens back for SOL
- Price formula: `price = base_price × (1 + supply/max_supply)²`
- 1% fee on all trades
- Slippage protection

[📖 Full Documentation](./programs/bonding-curve/README.md)

---

### 2. Token Factory (`token-factory/`)

One-click token deployment with metadata and bonding curve.

**Key Features:**
- Create SPL tokens
- Metaplex metadata integration
- Auto-initialize bonding curve
- Input validation

[📖 Full Documentation](./programs/token-factory/README.md)

---

### 3. Graduation Handler (`graduation/`)

Migrates tokens to Raydium when market cap hits $69K.

**Key Features:**
- Threshold monitoring
- Raydium pool creation
- Liquidity lock (burn LP tokens)
- Emergency recovery

[📖 Full Documentation](./programs/graduation/README.md)

## 🚀 Quick Start

### Prerequisites

- Rust 1.70+
- Solana CLI 1.18+
- Anchor 0.30+
- Node.js 18+

### Installation

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1

# Install dependencies
npm install
```

### Build

```bash
anchor build
```

### Test

```bash
# Run all tests
anchor test

# Run specific test file
anchor test -- --features "test-bpf" tests/bonding-curve.test.ts

# Run on local validator
./scripts/test-local.sh
```

### Deploy

**Devnet:**
```bash
./scripts/deploy-devnet.sh
```

**Mainnet:**
```bash
./scripts/deploy-mainnet.sh
```

## 📊 Program IDs

### Devnet
- Bonding Curve: `TBD`
- Token Factory: `TBD`
- Graduation: `TBD`

### Mainnet
- Bonding Curve: `TBD`
- Token Factory: `TBD`
- Graduation: `TBD`

## 🧪 Testing

### Test Coverage

```
bonding-curve:     85% coverage
token-factory:     82% coverage
graduation:        88% coverage
─────────────────────────────────
Total:             85% coverage
```

### Integration Tests

Full end-to-end flow tests:

```typescript
// 1. Create token
const { mint, bondingCurve } = await createToken({
  name: "Test Token",
  symbol: "TEST",
  uri: "https://...",
  basePrice: 100_000,
  maxSupply: 1_000_000_000,
});

// 2. Buy tokens
await buy({
  bondingCurve,
  solAmount: 1_000_000_000, // 1 SOL
  minTokensOut: 0,
});

// 3. Sell tokens
await sell({
  bondingCurve,
  tokenAmount: 50_000_000,
  minSolOut: 0,
});

// 4. Graduate (when threshold reached)
await checkAndGraduate({ bondingCurve });
await migrateToRaydium({ bondingCurve });
```

## 🔐 Security

### Audits

- [ ] Trail of Bits (scheduled)
- [ ] OpenZeppelin (scheduled)
- [ ] Kudelski Security (scheduled)

### Bug Bounty

$500,000 bug bounty pool via ImmuneFi (coming soon).

### Security Features

✅ **Math overflow protection** - All arithmetic checked
✅ **Slippage protection** - Min/max amounts enforced
✅ **PDA authorities** - Only programs can mint
✅ **Input validation** - Length and value checks
✅ **Immutable graduation** - Can't reverse state
✅ **Emergency functions** - Admin recovery mechanisms

### Known Limitations

⚠️  **MEV vulnerability** - Public mempool allows frontrunning
⚠️  **Price manipulation** - Large trades move price significantly
⚠️  **Oracle dependency** - Graduation threshold uses SOL price oracle

## 📈 Bonding Curve Formula

```
price = base_price × (1 + supply / max_supply)²
```

**Example:**

| Supply | Price (SOL) | Market Cap |
|--------|-------------|------------|
| 0      | 0.0001      | 0          |
| 100M   | 0.000121    | $1,210     |
| 500M   | 0.000225    | $11,250    |
| 900M   | 0.000361    | $32,490    |
| 1B     | 0.0004      | $40,000    |

## 🎓 Graduation

### Threshold: $69,000

When market cap reaches $69K:
1. Bonding curve disabled
2. Raydium pool created
3. All liquidity migrated
4. LP tokens burned (permanent lock)

### Benefits

- ✅ Full DEX functionality
- ✅ Lower fees (0.25% vs 1%)
- ✅ Rug-pull impossible
- ✅ Decentralized trading

## 🛠️ Development

### Project Structure

```
contracts/
├── programs/
│   ├── bonding-curve/      # Bonding curve AMM
│   ├── token-factory/       # Token creation
│   └── graduation/          # Graduation handler
├── tests/                   # Integration tests
├── scripts/                 # Deployment scripts
├── Anchor.toml             # Anchor config
├── Cargo.toml              # Workspace config
└── package.json            # Test dependencies
```

### Adding Features

1. Modify program in `programs/{program}/src/lib.rs`
2. Update tests in `tests/{program}.test.ts`
3. Run tests: `anchor test`
4. Update docs in `programs/{program}/README.md`

### Code Style

- Rust: Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- TypeScript: Prettier + ESLint
- Comments: Document all public functions

## 📝 License

MIT License - see [LICENSE](../LICENSE) for details.

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📞 Support

- Discord: [discord.gg/launchpad](https://discord.gg/launchpad)
- Docs: [docs.launchpad.fun](https://docs.launchpad.fun)
- Twitter: [@LaunchPadFun](https://twitter.com/LaunchPadFun)

## 🎯 Roadmap

- [x] Bonding curve program
- [x] Token factory program
- [x] Graduation handler
- [x] Unit tests (80%+ coverage)
- [x] Integration tests
- [x] Deployment scripts
- [ ] Audit (Trail of Bits)
- [ ] Devnet deployment
- [ ] Bug bounty program
- [ ] Mainnet deployment
- [ ] Frontend integration
- [ ] Advanced features (limit orders, etc.)

---

**Built with ❤️ on Solana**
