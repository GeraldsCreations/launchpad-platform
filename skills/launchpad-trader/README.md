# LaunchPad Trader Skill for ClawdBot

**AI-powered token trading on LaunchPad bonding curves**

This ClawdBot skill enables autonomous AI agents to create, trade, and manage tokens on the LaunchPad platform using Solana bonding curves.

---

## 🚀 Quick Start

### 1. Installation

```bash
# Navigate to skill directory
cd /root/.openclaw/workspace/launchpad-platform/skills/launchpad-trader

# Install dependencies
sudo apt-get update
sudo apt-get install -y jq curl bc

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
solana --version
jq --version
```

### 2. Wallet Setup

```bash
# Create new Solana wallet for trading
solana-keygen new --outfile ~/.config/solana/launchpad-bot.json

# Save your seed phrase securely!

# Check wallet address
solana-keygen pubkey ~/.config/solana/launchpad-bot.json

# Fund wallet (testnet)
solana airdrop 1 --keypair ~/.config/solana/launchpad-bot.json --url devnet

# Fund wallet (mainnet) - transfer SOL from another wallet
# solana transfer <WALLET_ADDRESS> 1.0 --from <YOUR_MAIN_WALLET>
```

### 3. Environment Configuration

```bash
# Add to ~/.bashrc or ~/.zshrc
export LAUNCHPAD_API_URL="https://api.launchpad.fun/v1"
export LAUNCHPAD_WALLET_PATH="$HOME/.config/solana/launchpad-bot.json"
export LAUNCHPAD_SLIPPAGE="0.05"
export LAUNCHPAD_AUTO_CONFIRM="false"

# Reload shell
source ~/.bashrc
```

### 4. Add to PATH

```bash
# Option 1: Symlink to /usr/local/bin
sudo ln -s /root/.openclaw/workspace/launchpad-platform/skills/launchpad-trader/launchpad /usr/local/bin/launchpad

# Option 2: Add to PATH
export PATH="$PATH:/root/.openclaw/workspace/launchpad-platform/skills/launchpad-trader"

# Verify
launchpad version
```

### 5. Test the Skill

```bash
# Check balance
launchpad balance

# View trending tokens
launchpad trending

# Search for tokens
launchpad search "test"
```

---

## 📖 Usage

### Creating Tokens

```bash
# Basic token creation
launchpad create \
  --name "Gereld Bot" \
  --symbol "GERELD"

# Full token with metadata and initial buy
launchpad create \
  --name "Gereld Bot" \
  --symbol "GERELD" \
  --description "AI Company Manager and Project Coordinator" \
  --image "https://example.com/gereld.png" \
  --initial-buy 1.0
```

**Parameters:**
- `--name`: Token name (required)
- `--symbol`: Token ticker, 3-10 characters (required)
- `--description`: Token description (optional)
- `--image`: Image URL (optional)
- `--initial-buy`: SOL amount for initial buy, 0-10 SOL (optional)

**Output:**
```
✅ Token created successfully!

Token Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Symbol: GERELD
Bonding Curve: 9zKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Initial Price: 0.0001 SOL
Your Balance: 1,000,000 GERELD

Transaction: https://solscan.io/tx/abc123...
View Token: https://launchpad.fun/token/7xKXtg...
```

---

### Buying Tokens

```bash
# Buy with SOL amount
launchpad buy GERELD 0.5

# Buy specific token amount
launchpad buy GERELD 50000 --tokens

# Buy with slippage and price protection
launchpad buy GERELD 1.0 \
  --slippage 0.01 \
  --max-price 0.00015
```

**Parameters:**
- `TOKEN`: Symbol or address (required)
- `AMOUNT`: SOL amount or token amount (required)
- `--tokens`: Treat amount as token quantity instead of SOL
- `--slippage`: Max slippage tolerance (default: 5%)
- `--max-price`: Maximum price per token safety check

**Confirmation Prompt:**
```
💰 Buying GERELD with 0.5 SOL...

Current Price: 0.00012 SOL
Estimated Tokens: 4,166 GERELD
Slippage: 5%
Est. Total: 0.505 SOL (incl. 1% fee)

Confirm? [y/N]:
```

---

### Selling Tokens

```bash
# Sell specific amount
launchpad sell GERELD 50000

# Sell all holdings
launchpad sell GERELD --all

# Sell percentage
launchpad sell GERELD 25%

# Sell with price protection
launchpad sell GERELD 100000 \
  --slippage 0.01 \
  --min-price 0.0001
```

**Parameters:**
- `TOKEN`: Symbol or address (required)
- `AMOUNT`: Token amount, percentage, or `--all` (required)
- `--all`: Sell entire balance
- `--slippage`: Max slippage tolerance (default: 5%)
- `--min-price`: Minimum price per token safety check

---

### Checking Balances

```bash
# View full portfolio
launchpad balance

# View specific token
launchpad balance GERELD

# Show USD values
launchpad balance --usd

# Simple output (parseable)
launchpad balance --simple
```

**Output:**
```
💼 Your Portfolio

SOL Balance: 12.5 SOL ($2,500 USD)

Token Holdings:
┌─────────┬────────────┬───────────────┬──────────┬──────────┐
│ Symbol  │ Balance    │ Current Price │ Value    │ PnL      │
├─────────┼────────────┼───────────────┼──────────┼──────────┤
│ GERELD  │ 954,150    │ 0.00011 SOL   │ 104.9 SOL│ +104.4 SOL│
│ CHADBOT │ 50,000     │ 0.00025 SOL   │ 12.5 SOL │ +2.5 SOL  │
└─────────┴────────────┴───────────────┴──────────┴──────────┘

Total Value: 167.4 SOL ($33,480 USD)
Total PnL: +96.9 SOL (+137%)
```

---

### Discovering Tokens

#### Trending Tokens
```bash
# Top 10 trending (24h volume)
launchpad trending

# Top 20 trending
launchpad trending --limit 20

# Trending in last hour
launchpad trending --period 1h

# JSON output
launchpad trending --json
```

#### New Tokens
```bash
# Latest 10 tokens
launchpad new

# Latest 20 tokens
launchpad new --limit 20

# Only bot-created tokens
launchpad new --creator-type bot
```

#### Search Tokens
```bash
# Search by keyword
launchpad search "gereld"

# Search with filters
launchpad search "bot" \
  --min-mcap 10000 \
  --graduated false

# Search for AI agent tokens
launchpad search "AI" \
  --creator bot \
  --limit 20
```

---

### Token Information

```bash
# Get detailed info
launchpad info GERELD

# Show top holders
launchpad info GERELD --holders

# Show recent trades
launchpad info GERELD --trades

# JSON output
launchpad info GERELD --json
```

**Output:**
```
📊 GERELD - Gereld Bot

Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Bonding Curve: 9zKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

Creator: ClawdBot Agent
  BotQ7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJo

Created: 2024-01-15 14:30:00 UTC (5 days ago)

Status: ⏳ Bonding Curve
  $45,544 to graduation ($69K threshold)

Market Data:
  Price: 0.00011 SOL
  Market Cap: $23,456 USD
  24h Volume: 856 SOL
  Holders: 156

Supply:
  Current: 213,456,789 / 1,000,000,000 (21.3%)

Description:
  AI Company Manager and Project Coordinator. Helps manage
  teams, projects, and deadlines autonomously.
```

---

## 🤖 ClawdBot Integration

### Natural Language Commands

ClawdBot automatically recognizes these trigger keywords:

**Creating:**
- "Create a token called Gereld Bot with symbol GERELD"
- "Launch a new token for my AI agent"
- "Deploy CHADBOT on LaunchPad"

**Buying:**
- "Buy 0.5 SOL worth of GERELD"
- "Purchase 50,000 GERELD tokens"
- "Invest 1 SOL in the top trending token"

**Selling:**
- "Sell all my GERELD tokens"
- "Sell 25% of my CHADBOT holdings"
- "Dump 100,000 GERELD"

**Monitoring:**
- "Show my LaunchPad portfolio"
- "What's trending on LaunchPad?"
- "Check the price of GERELD"
- "Find tokens about AI agents"

### Trigger Keywords

The skill activates on:
- `launchpad`, `launch pad`, `bonding curve`
- `create token`, `deploy token`, `launch token`
- `buy token`, `sell token`, `trade`
- `trending tokens`, `new tokens`
- `portfolio`, `balance`

---

## ⚙️ Configuration

### Environment Variables

```bash
# Required
export LAUNCHPAD_WALLET_PATH="$HOME/.config/solana/launchpad-bot.json"

# Optional (with defaults)
export LAUNCHPAD_API_URL="https://api.launchpad.fun/v1"
export LAUNCHPAD_RPC_URL="https://api.mainnet-beta.solana.com"
export LAUNCHPAD_SLIPPAGE="0.05"  # 5% default slippage
export LAUNCHPAD_AUTO_CONFIRM="false"  # Require confirmations
export LAUNCHPAD_API_KEY=""  # For rate limit increases (future)
```

### Config Files

**API Configuration**: `config/api.config.json`
- API endpoints
- Timeout settings
- Retry logic
- Bonding curve parameters

**Wallet Template**: `config/wallet.example.json`
- Example wallet format
- Setup instructions

---

## 🔐 Security

### Safety Features

1. **Confirmation Prompts**: All trades require explicit confirmation (unless `AUTO_CONFIRM=true`)
2. **Price Limits**: Set max/min prices to prevent bad trades
3. **Slippage Protection**: Default 5% tolerance prevents front-running
4. **Transaction Timeouts**: 30-second timeout prevents stuck transactions
5. **Balance Checks**: Validates sufficient funds before transactions

### Best Practices

- ✅ **Keep wallet secure**: Never share your keypair file
- ✅ **Use separate wallets**: Don't use your main wallet for bot trading
- ✅ **Start small**: Test with small amounts first
- ✅ **Set AUTO_CONFIRM=false**: Require manual confirmations for safety
- ✅ **Monitor transactions**: Check Solscan for confirmation
- ✅ **Back up seed phrase**: Write it down and store securely

### Risk Warnings

- ⚠️ **Bonding curves are volatile**: Prices can change rapidly
- ⚠️ **Slippage exists**: Final price may differ from quote
- ⚠️ **No guarantees**: Token may not graduate or gain value
- ⚠️ **Smart contract risk**: Use at your own risk
- ⚠️ **Bot trading**: Automated trading carries additional risks

---

## 🐛 Troubleshooting

### Common Issues

#### "Insufficient SOL balance"
```bash
# Check balance
solana balance --keypair $LAUNCHPAD_WALLET_PATH

# Fund wallet (testnet)
solana airdrop 1 --keypair $LAUNCHPAD_WALLET_PATH --url devnet

# Fund wallet (mainnet) - transfer from another wallet
```

#### "Transaction failed: slippage exceeded"
```bash
# Increase slippage tolerance
launchpad buy GERELD 0.5 --slippage 0.10  # 10%
```

#### "Token not found"
```bash
# Use full address instead of symbol
launchpad buy 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 0.5
```

#### "API connection error"
```bash
# Test API connectivity
curl https://api.launchpad.fun/v1/tokens/trending

# Check environment variables
echo $LAUNCHPAD_API_URL
```

#### "Wallet not found"
```bash
# Verify wallet path
ls -la $LAUNCHPAD_WALLET_PATH

# Set correct path
export LAUNCHPAD_WALLET_PATH="$HOME/.config/solana/launchpad-bot.json"
```

---

## 📚 Documentation

### File Structure

```
launchpad-trader/
├── README.md                      # This file
├── SKILL.md                       # Skill documentation
├── launchpad                      # Main CLI entry point
│
├── scripts/                       # Trading scripts
│   ├── create-token.sh           # Create new token
│   ├── buy-token.sh              # Buy tokens
│   ├── sell-token.sh             # Sell tokens
│   ├── get-balance.sh            # Check balances
│   ├── list-trending.sh          # List trending
│   ├── list-new.sh               # List new tokens
│   ├── search-tokens.sh          # Search tokens
│   ├── get-token-info.sh         # Token details
│   │
│   └── lib/                      # Helper library
│       └── api.sh                # API integration
│
└── config/                        # Configuration
    ├── api.config.json           # API endpoints
    └── wallet.example.json       # Wallet template
```

### API Reference

See `SKILL.md` for complete API documentation including:
- Endpoint details
- Request/response formats
- Error codes
- Rate limits

### Architecture

See `/root/.openclaw/workspace/launchpad-platform/docs/ARCHITECTURE.md` for:
- System overview
- Smart contract details
- Bonding curve mechanics
- Backend architecture

---

## 🔮 Roadmap

### v1.1 (Coming Soon)
- [ ] WebSocket subscriptions for real-time price updates
- [ ] Price alerts and notifications
- [ ] Auto-trading strategies (DCA, momentum)
- [ ] Portfolio tracking with PnL charts

### v1.2 (Future)
- [ ] Limit orders (buy/sell at target price)
- [ ] Multi-token swaps
- [ ] Liquidity provision on graduated tokens
- [ ] Advanced analytics and insights

---

## 🤝 Contributing

This skill is part of the LaunchPad platform. For issues or feature requests:

1. Check existing issues
2. Create detailed bug reports
3. Submit pull requests with tests
4. Follow code style conventions

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🔗 Resources

- **LaunchPad Website**: https://launchpad.fun
- **API Documentation**: https://docs.launchpad.fun
- **Discord Community**: https://discord.gg/launchpad
- **Twitter**: @LaunchPadFun
- **Solana Docs**: https://docs.solana.com

---

## ✨ Examples

### Example 1: Launch Your AI Agent Token

```bash
# 1. Create token
launchpad create \
  --name "My AI Agent" \
  --symbol "MYAI" \
  --description "Autonomous AI agent token" \
  --initial-buy 2.0

# 2. Share on Twitter
echo "Just launched \$MYAI on @LaunchPadFun! 🚀"

# 3. Monitor price
launchpad info MYAI
```

### Example 2: Trade Trending Tokens

```bash
# 1. Find trending token
launchpad trending --limit 1

# 2. Buy the top token
launchpad buy BONK 1.0

# 3. Check your balance
launchpad balance BONK
```

### Example 3: Portfolio Management

```bash
# 1. Check portfolio
launchpad balance --usd

# 2. Rebalance (sell losers, buy winners)
launchpad sell MEMECOIN --all
launchpad buy GERELD 5.0

# 3. Monitor gains
launchpad balance
```

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-20  
**Maintainer**: LaunchPad Team

Happy trading! 🚀
