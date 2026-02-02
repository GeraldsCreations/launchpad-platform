# LaunchPad Trader Skill

**AI-powered token trading on LaunchPad bonding curves**

This skill enables ClawdBot agents to create, buy, and sell tokens on the LaunchPad platform, interact with bonding curves, track trending tokens, and manage portfolios autonomously.

---

## 🎯 What This Skill Does

- **Create Tokens**: Deploy new tokens with bonding curves
- **Trade**: Buy and sell tokens using bonding curve pricing
- **Monitor**: Track trending tokens, new launches, and price movements
- **Portfolio**: Check balances and holdings
- **Discovery**: Search and filter tokens by criteria

---

## 🔧 Setup

### 1. Environment Variables

Add these to your ClawdBot environment:

```bash
# Required
LAUNCHPAD_API_URL="https://api.launchpad.fun/v1"
LAUNCHPAD_WALLET_PATH="/path/to/solana-wallet.json"

# Optional
LAUNCHPAD_API_KEY=""  # For rate limit increases (future)
LAUNCHPAD_RPC_URL="https://api.mainnet-beta.solana.com"  # Custom Solana RPC
LAUNCHPAD_SLIPPAGE="0.05"  # 5% default slippage tolerance
LAUNCHPAD_AUTO_CONFIRM="false"  # Require confirmation for trades
```

### 2. Wallet Setup

Create a Solana wallet for your bot:

```bash
# Generate new wallet
solana-keygen new --outfile ~/.config/solana/launchpad-bot.json

# Fund it with SOL
solana airdrop 1 --keypair ~/.config/solana/launchpad-bot.json

# Set environment variable
export LAUNCHPAD_WALLET_PATH="$HOME/.config/solana/launchpad-bot.json"
```

### 3. Install Dependencies

```bash
# Solana CLI (for wallet operations)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# jq (for JSON parsing)
sudo apt-get install jq

# curl (usually pre-installed)
sudo apt-get install curl
```

---

## 📋 Available Commands

### Create Token

Deploy a new token with bonding curve:

```bash
launchpad create \
  --name "Gereld Bot" \
  --symbol "GERELD" \
  --description "AI Company Manager" \
  --image "https://example.com/gereld.png" \
  --initial-buy 1.0
```

**Parameters:**
- `--name`: Token name (required)
- `--symbol`: Token ticker, 3-10 chars (required)
- `--description`: Token description (optional)
- `--image`: Image URL (optional, defaults to LaunchPad placeholder)
- `--initial-buy`: SOL amount for initial buy (optional, 0-10 SOL)

**Example Output:**
```
✅ Token created successfully!

Token Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Symbol: GERELD
Bonding Curve: 9zKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Initial Price: 0.0001 SOL
Your Balance: 1,000,000 GERELD

Transaction: https://solscan.io/tx/abc123...
```

---

### Buy Tokens

Purchase tokens from bonding curve:

```bash
# Buy with SOL amount
launchpad buy GERELD 0.5

# Buy specific token amount
launchpad buy GERELD 50000 --tokens
```

**Parameters:**
- `symbol` or `address`: Token to buy (required)
- `amount`: SOL amount or token amount (required)
- `--tokens`: Specify token amount instead of SOL
- `--slippage`: Max slippage tolerance (default: 5%)
- `--max-price`: Maximum price per token (safety check)

**Example Output:**
```
💰 Buying GERELD with 0.5 SOL...

Current Price: 0.00012 SOL
Estimated Tokens: 4,166 GERELD
Slippage: 5%
Est. Total: 0.505 SOL (incl. 1% fee)

Confirm? [y/N]: y

✅ Purchase successful!
Bought: 4,150 GERELD
Paid: 0.505 SOL
New Balance: 1,004,150 GERELD

Transaction: https://solscan.io/tx/def456...
```

---

### Sell Tokens

Sell tokens back to bonding curve:

```bash
# Sell specific amount
launchpad sell GERELD 50000

# Sell all holdings
launchpad sell GERELD --all

# Sell percentage of holdings
launchpad sell GERELD 25%
```

**Parameters:**
- `symbol` or `address`: Token to sell (required)
- `amount`: Token amount, percentage, or `--all` (required)
- `--slippage`: Max slippage tolerance (default: 5%)
- `--min-price`: Minimum price per token (safety check)

**Example Output:**
```
📉 Selling 50,000 GERELD...

Current Price: 0.00011 SOL
Estimated SOL: 5.5 SOL
Slippage: 5%
Est. Total: 5.445 SOL (after 1% fee)

Confirm? [y/N]: y

✅ Sale successful!
Sold: 50,000 GERELD
Received: 5.445 SOL
New Balance: 954,150 GERELD

Transaction: https://solscan.io/tx/ghi789...
```

---

### Check Balance

View your token holdings and SOL balance:

```bash
# All holdings
launchpad balance

# Specific token
launchpad balance GERELD

# Portfolio value in USD
launchpad balance --usd
```

**Example Output:**
```
💼 Your Portfolio

SOL Balance: 12.5 SOL ($2,500 USD)

Token Holdings:
┌─────────┬────────────┬───────────────┬──────────┬──────────┐
│ Symbol  │ Balance    │ Current Price │ Value    │ PnL      │
├─────────┼────────────┼───────────────┼──────────┼──────────┤
│ GERELD  │ 954,150    │ 0.00011 SOL   │ 104.9 SOL│ +104.4 SOL│
│ CHADBOT │ 50,000     │ 0.00025 SOL   │ 12.5 SOL │ +2.5 SOL  │
│ MEMECOIN│ 1,000,000  │ 0.00005 SOL   │ 50.0 SOL │ -10.0 SOL │
└─────────┴────────────┴───────────────┴──────────┴──────────┘

Total Value: 167.4 SOL ($33,480 USD)
Total PnL: +96.9 SOL (+137%)
```

---

### List Trending Tokens

View top trending tokens by volume:

```bash
# Top 10 trending
launchpad trending

# Custom limit
launchpad trending --limit 20

# Filter by time
launchpad trending --period 24h
```

**Example Output:**
```
🔥 Trending Tokens (24h volume)

1. BONK - Bonk Inu
   Price: 0.00001 SOL | MCap: $45K | Vol: 1,234 SOL
   Address: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263

2. GERELD - Gereld Bot
   Price: 0.00011 SOL | MCap: $23K | Vol: 856 SOL
   Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

3. CHADBOT - Chad Bot
   Price: 0.00025 SOL | MCap: $67K | Vol: 645 SOL (🎓 GRADUATED)
   Address: 9zKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

---

### List New Tokens

View recently created tokens:

```bash
# Latest 10 tokens
launchpad new

# Custom limit
launchpad new --limit 20

# Filter by creator type
launchpad new --creator-type bot
```

**Example Output:**
```
🆕 New Tokens

1. AIAGENT - AI Agent Token (2 minutes ago)
   Creator: Bot (ClawdBot)
   Price: 0.0001 SOL | MCap: $1.2K
   Address: 8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

2. MOONSHOT - To The Moon (15 minutes ago)
   Creator: Human
   Price: 0.00008 SOL | MCap: $850
   Address: 6xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

---

### Search Tokens

Find tokens by name, symbol, or keyword:

```bash
# Search by keyword
launchpad search "gereld"

# Search by symbol
launchpad search "GERELD"

# Advanced filters
launchpad search "bot" --min-mcap 10000 --graduated false
```

**Example Output:**
```
🔍 Search results for "gereld"

Found 3 tokens:

1. GERELD - Gereld Bot
   Price: 0.00011 SOL | MCap: $23K
   "AI Company Manager and Project Coordinator"
   Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

2. GERELDAI - Gereld AI
   Price: 0.00005 SOL | MCap: $5K
   "AI assistant for project management"
   Address: 5xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

---

### Get Token Info

Get detailed information about a specific token:

```bash
# By symbol
launchpad info GERELD

# By address
launchpad info 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

**Example Output:**
```
📊 GERELD - Gereld Bot

Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Bonding Curve: 9zKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

Creator: BotQ7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJo
Type: ClawdBot Agent
Created: 2024-01-15 14:30:00 UTC (5 days ago)

Price: 0.00011 SOL
Market Cap: $23,456 USD
24h Volume: 856 SOL
Holders: 156

Supply: 213,456,789 / 1,000,000,000 (21.3%)
Graduation: $45,544 to go ($69K threshold)

Description:
"AI Company Manager and Project Coordinator. Helps manage
teams, projects, and deadlines autonomously."

Top Holders:
1. Bot7x... - 954,150 (0.95%)
2. Human9z... - 500,000 (0.50%)
3. Bot5x... - 350,000 (0.35%)

Website: https://gereld.bot
Twitter: @gereldbot
```

---

## 🤖 AI Agent Usage

### Natural Language Commands

ClawdBot can interpret these phrases and execute the appropriate commands:

**Creating:**
- "Create a token called Gereld Bot with symbol GERELD"
- "Launch a new token for my AI agent"
- "Deploy a meme coin named CHADBOT"

**Buying:**
- "Buy 0.5 SOL worth of GERELD"
- "Purchase 50,000 GERELD tokens"
- "Invest 1 SOL in the trending token"

**Selling:**
- "Sell all my GERELD tokens"
- "Sell 25% of my CHADBOT holdings"
- "Dump 100,000 GERELD"

**Monitoring:**
- "Show my portfolio"
- "What's trending on LaunchPad?"
- "Check the price of GERELD"
- "Find tokens about AI agents"
- "Show me new bot tokens"

**Information:**
- "How much GERELD do I have?"
- "What's the price of BONK?"
- "Show me details about CHADBOT"
- "Is GERELD close to graduation?"

---

## 🔐 Safety Features

### Confirmation Prompts

By default, trades require confirmation:

```bash
export LAUNCHPAD_AUTO_CONFIRM="false"  # Default
```

To enable auto-confirmation (use with caution):

```bash
export LAUNCHPAD_AUTO_CONFIRM="true"
```

### Price Limits

Set maximum price per token when buying:

```bash
launchpad buy GERELD 0.5 --max-price 0.00015
```

Set minimum price per token when selling:

```bash
launchpad sell GERELD 50000 --min-price 0.0001
```

### Slippage Protection

Default 5% slippage tolerance prevents front-running:

```bash
launchpad buy GERELD 0.5 --slippage 0.01  # 1% max slippage
```

### Transaction Timeouts

All transactions timeout after 30 seconds to prevent stuck trades.

---

## 📡 API Integration

### Authentication

Currently no API key required. Future versions may support:

```bash
export LAUNCHPAD_API_KEY="your-api-key"
```

### Rate Limits

**Free Tier:**
- 100 requests per minute
- 1,000 requests per hour
- 10,000 requests per day

**Pro Tier (future):**
- 1,000 requests per minute
- WebSocket subscriptions
- Priority transaction processing

---

## 🎪 Trigger Keywords

ClawdBot recognizes these keywords to activate the LaunchPad skill:

**Action Triggers:**
- `launchpad`, `launch pad`, `bonding curve`
- `create token`, `deploy token`, `launch token`
- `buy token`, `purchase`, `trade`
- `sell token`, `dump`
- `trending`, `new tokens`, `hot tokens`
- `portfolio`, `balance`, `holdings`
- `token info`, `token details`

**Platform Mentions:**
- "LaunchPad platform"
- "LaunchPad.fun"
- "bonding curve trading"

---

## 🧪 Examples

### Example 1: Create & Promote Token

```bash
# Create token
launchpad create \
  --name "Gereld Bot" \
  --symbol "GERELD" \
  --description "AI Company Manager" \
  --initial-buy 2.0

# Share on Twitter
twitter tweet "Just launched $GERELD on @LaunchPadFun! 🚀
AI-powered project management token.
Get in early: https://launchpad.fun/token/7xKX..."

# Monitor price
launchpad info GERELD
```

---

### Example 2: Trade on Trending Tokens

```bash
# Find trending token
launchpad trending --limit 1

# Buy the top token
launchpad buy BONK 1.0

# Set alert for 2x price
# (requires separate notification skill)
```

---

### Example 3: Portfolio Management

```bash
# Check portfolio
launchpad balance --usd

# Rebalance: sell losers, buy winners
launchpad sell MEMECOIN --all
launchpad buy GERELD 5.0

# Check new balance
launchpad balance
```

---

### Example 4: Discovery & Research

```bash
# Search for AI tokens
launchpad search "AI" --min-mcap 5000

# Get details on interesting token
launchpad info AIAGENT

# Buy if it looks good
launchpad buy AIAGENT 0.5
```

---

## 🐛 Troubleshooting

### "Insufficient SOL balance"

Fund your wallet:

```bash
solana balance --keypair $LAUNCHPAD_WALLET_PATH
solana airdrop 1 --keypair $LAUNCHPAD_WALLET_PATH
```

### "Transaction failed: slippage exceeded"

Increase slippage tolerance:

```bash
launchpad buy GERELD 0.5 --slippage 0.10  # 10%
```

### "Token not found"

Use full address instead of symbol:

```bash
launchpad buy 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 0.5
```

### "API connection error"

Check API URL and network:

```bash
curl https://api.launchpad.fun/v1/tokens/trending
```

---

## 📚 Resources

- **Website**: https://launchpad.fun
- **API Docs**: https://docs.launchpad.fun
- **Discord**: https://discord.gg/launchpad
- **Twitter**: @LaunchPadFun

---

## 🔮 Future Features

- **Auto-trading strategies** (DCA, momentum, etc.)
- **Price alerts** (notify on price changes)
- **Portfolio tracking** (PnL charts, history)
- **Limit orders** (buy/sell at target price)
- **WebSocket subscriptions** (real-time updates)
- **Multi-token swaps** (trade between tokens)
- **Liquidity provision** (earn fees on graduated tokens)

---

**Version:** 1.0.0  
**Last Updated:** 2024-01-20  
**Maintainer:** LaunchPad Team  
**License:** MIT
