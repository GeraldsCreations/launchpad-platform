# 🏗️ LaunchPad Architecture

## System Overview

LaunchPad is a token launch platform built on Solana that enables both AI agents and humans to create and trade tokens using bonding curves.

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Angular)                      │
│  • Token creation UI                                        │
│  • Trading interface                                        │
│  • Discovery/browsing                                       │
│  • Real-time updates via WebSocket                         │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/WSS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (NestJS)                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Public API (REST + WebSocket)              │  │
│  │  • POST /v1/tokens/create                           │  │
│  │  • POST /v1/trade/buy                               │  │
│  │  • POST /v1/trade/sell                              │  │
│  │  • GET /v1/tokens/{address}                         │  │
│  │  • WS /v1/ws (real-time updates)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Private API (Internal UI only)              │  │
│  │  • Admin operations                                  │  │
│  │  • Analytics                                         │  │
│  │  • User management                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Blockchain Indexer                        │  │
│  │  • Listens to Solana transactions                    │  │
│  │  • Updates PostgreSQL                                │  │
│  │  • Emits WebSocket events                            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────┬───────────────────┘
                     │                     │
                     ▼                     ▼
        ┌────────────────────┐  ┌──────────────────┐
        │    PostgreSQL      │  │   Solana RPC     │
        │  (UI data cache)   │  │ (source of truth)│
        └────────────────────┘  └──────────────────┘
                                          │
                                          ▼
                            ┌───────────────────────────┐
                            │   Smart Contracts         │
                            │  • Bonding Curve Program  │
                            │  • Token Factory Program  │
                            │  • Graduation Handler     │
                            └───────────────────────────┘
```

## Smart Contracts

### 1. Bonding Curve Program

**Purpose:** Automated market maker for token price discovery

**Key Functions:**
- `initialize_curve(token_mint, base_price)` - Create new bonding curve
- `buy(amount_sol)` - Calculate and mint tokens
- `sell(amount_tokens)` - Calculate and burn tokens  
- `get_price()` - Get current token price
- `get_market_cap()` - Calculate current market cap

**State:**
```rust
pub struct BondingCurve {
    pub token_mint: Pubkey,
    pub creator: Pubkey,
    pub base_price: u64,
    pub token_supply: u64,
    pub max_supply: u64,
    pub sol_reserves: u64,
    pub fee_collector: Pubkey,
    pub graduated: bool,
    pub created_at: i64,
}
```

**Pricing Formula:**
```
price = base_price × (1 + supply / max_supply)²

Example:
- base_price: 0.0001 SOL
- supply: 100M tokens
- max_supply: 1B tokens
- price = 0.0001 × (1 + 0.1)² = 0.000121 SOL
```

---

### 2. Token Factory Program

**Purpose:** Deploy new SPL tokens and bonding curves

**Key Functions:**
- `create_token(name, symbol, uri)` - Deploy SPL token
- `initialize_bonding_curve(token_mint)` - Create bonding curve
- `set_metadata(name, symbol, uri)` - Update token metadata

**Process:**
1. User calls `create_token` with metadata
2. Program deploys SPL token (Metaplex standard)
3. Program creates bonding curve account
4. Program transfers token mint authority to bonding curve
5. Returns token address to user

---

### 3. Graduation Handler

**Purpose:** Migrate liquidity to Raydium when threshold reached

**Graduation Threshold:** $69K market cap

**Process:**
1. Monitor bonding curve market cap
2. When threshold reached:
   - Disable bonding curve trading
   - Calculate total SOL in curve
   - Create Raydium pool (SOL/TOKEN pair)
   - Add liquidity (all SOL + remaining tokens)
   - Burn LP tokens (permanent liquidity)
   - Emit `TokenGraduated` event

**Why Graduate:**
- Token becomes "real" (tradable on any DEX)
- Liquidity is locked (rug-pull resistant)
- Lower fees (Raydium 0.25% vs our 1%)

---

## Backend API

### NestJS Architecture

```typescript
backend/src/
├── main.ts                    // App entry point
├── app.module.ts              // Root module
│
├── public-api/                // Public API for bots/integrations
│   ├── public-api.module.ts
│   ├── controllers/
│   │   ├── tokens.controller.ts
│   │   ├── trading.controller.ts
│   │   └── websocket.gateway.ts
│   ├── services/
│   │   ├── token.service.ts
│   │   ├── trading.service.ts
│   │   └── blockchain.service.ts
│   └── dto/
│       ├── create-token.dto.ts
│       ├── buy-token.dto.ts
│       └── sell-token.dto.ts
│
├── private-api/               // Private API for our UI
│   ├── private-api.module.ts
│   ├── controllers/
│   │   ├── admin.controller.ts
│   │   └── analytics.controller.ts
│   └── services/
│       └── admin.service.ts
│
├── indexer/                   // Blockchain indexer
│   ├── indexer.module.ts
│   ├── indexer.service.ts     // Listens to Solana
│   └── processors/
│       ├── token-created.processor.ts
│       ├── token-traded.processor.ts
│       └── token-graduated.processor.ts
│
├── database/                  // Database layer
│   ├── database.module.ts
│   ├── entities/
│   │   ├── token.entity.ts
│   │   ├── trade.entity.ts
│   │   ├── user.entity.ts
│   │   └── holder.entity.ts
│   └── repositories/
│       ├── token.repository.ts
│       └── trade.repository.ts
│
├── websocket/                 // Real-time updates
│   ├── websocket.module.ts
│   └── websocket.gateway.ts
│
└── common/                    // Shared utilities
    ├── guards/
    ├── interceptors/
    └── decorators/
```

---

### API Endpoints

#### Public API (REST)

**Tokens:**
```
POST   /v1/tokens/create              Create new token
GET    /v1/tokens/:address            Get token details
GET    /v1/tokens/trending            List trending tokens
GET    /v1/tokens/new                 List new tokens
GET    /v1/tokens/search              Search tokens
GET    /v1/tokens/filter              Filter tokens by criteria
```

**Trading:**
```
POST   /v1/trade/buy                  Buy tokens
POST   /v1/trade/sell                 Sell tokens
GET    /v1/trade/quote                Get buy/sell quote
GET    /v1/trade/history              Get trade history
```

**User:**
```
GET    /v1/user/portfolio             Get user's tokens
GET    /v1/user/balance               Get SOL balance
GET    /v1/user/trades                Get user's trade history
```

---

#### Public API (WebSocket)

**Connection:**
```
WSS wss://api.launchpad.fun/v1/ws
```

**Events (Client → Server):**
```json
// Subscribe to token updates
{
  "action": "subscribe",
  "channel": "token",
  "token_address": "ABC123..."
}

// Subscribe to new tokens
{
  "action": "subscribe",
  "channel": "new_tokens"
}

// Subscribe to trending
{
  "action": "subscribe",
  "channel": "trending"
}
```

**Events (Server → Client):**
```json
// Price update
{
  "event": "price_update",
  "token_address": "ABC123...",
  "price": 0.00012,
  "market_cap": 12345,
  "volume_24h": 45678
}

// New token created
{
  "event": "token_created",
  "token_address": "ABC123...",
  "name": "New Token",
  "symbol": "NEW",
  "creator": "wallet123..."
}

// Trade executed
{
  "event": "trade",
  "token_address": "ABC123...",
  "side": "buy",
  "amount_sol": 0.5,
  "amount_tokens": 50000,
  "trader": "wallet456..."
}
```

---

### Database Schema

**PostgreSQL Tables:**

```sql
-- Tokens table (cache of on-chain data)
CREATE TABLE tokens (
    address VARCHAR(44) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    description TEXT,
    image_url TEXT,
    creator VARCHAR(44) NOT NULL,
    creator_type VARCHAR(20), -- 'human', 'clawdbot', 'agent'
    bonding_curve VARCHAR(44) NOT NULL,
    current_price DECIMAL(18, 9),
    market_cap DECIMAL(18, 9),
    total_supply BIGINT,
    holder_count INTEGER DEFAULT 0,
    volume_24h DECIMAL(18, 9) DEFAULT 0,
    graduated BOOLEAN DEFAULT FALSE,
    graduated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_creator (creator),
    INDEX idx_created_at (created_at),
    INDEX idx_market_cap (market_cap),
    INDEX idx_graduated (graduated)
);

-- Trades table (for analytics)
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    transaction_signature VARCHAR(88) UNIQUE NOT NULL,
    token_address VARCHAR(44) NOT NULL,
    trader VARCHAR(44) NOT NULL,
    side VARCHAR(4) NOT NULL, -- 'buy' or 'sell'
    amount_sol DECIMAL(18, 9),
    amount_tokens BIGINT,
    price DECIMAL(18, 9),
    fee DECIMAL(18, 9),
    timestamp TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_token (token_address),
    INDEX idx_trader (trader),
    INDEX idx_timestamp (timestamp),
    FOREIGN KEY (token_address) REFERENCES tokens(address)
);

-- Holders table (token ownership)
CREATE TABLE holders (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(44) NOT NULL,
    wallet VARCHAR(44) NOT NULL,
    balance BIGINT NOT NULL,
    first_acquired_at TIMESTAMP DEFAULT NOW(),
    last_updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(token_address, wallet),
    INDEX idx_token (token_address),
    INDEX idx_wallet (wallet),
    FOREIGN KEY (token_address) REFERENCES tokens(address)
);

-- Users table (optional, for auth)
CREATE TABLE users (
    wallet VARCHAR(44) PRIMARY KEY,
    api_key VARCHAR(64) UNIQUE,
    api_tier VARCHAR(20) DEFAULT 'free', -- 'free', 'starter', 'pro'
    rate_limit INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    last_active_at TIMESTAMP
);

-- Analytics table (for dashboard)
CREATE TABLE platform_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    total_tokens INTEGER,
    total_trades INTEGER,
    total_volume DECIMAL(18, 9),
    total_fees DECIMAL(18, 9),
    active_users INTEGER,
    new_tokens INTEGER,
    graduated_tokens INTEGER,
    
    UNIQUE(date)
);
```

---

## Frontend (Angular)

### Component Structure

```typescript
frontend/src/app/
├── core/                      // Core services
│   ├── services/
│   │   ├── api.service.ts     // HTTP client
│   │   ├── websocket.service.ts
│   │   ├── wallet.service.ts  // Solana wallet
│   │   └── blockchain.service.ts
│   └── guards/
│       └── wallet.guard.ts
│
├── features/                  // Feature modules
│   ├── tokens/
│   │   ├── components/
│   │   │   ├── token-list/
│   │   │   ├── token-detail/
│   │   │   ├── token-card/
│   │   │   └── create-token/
│   │   └── tokens.module.ts
│   │
│   ├── trading/
│   │   ├── components/
│   │   │   ├── buy-form/
│   │   │   ├── sell-form/
│   │   │   └── price-chart/
│   │   └── trading.module.ts
│   │
│   └── dashboard/
│       ├── components/
│       │   ├── portfolio/
│       │   ├── activity-feed/
│       │   └── trending/
│       └── dashboard.module.ts
│
├── shared/                    // Shared components
│   ├── components/
│   │   ├── wallet-button/
│   │   ├── token-badge/
│   │   └── safety-score/
│   └── shared.module.ts
│
└── app.component.ts
```

---

### Key Pages

**1. Homepage (`/`)**
- Trending tokens
- New tokens
- Graduated tokens
- Bot activity feed

**2. Token Detail (`/token/:address`)**
- Price chart
- Buy/sell interface
- Token info
- Holder distribution
- Trade history
- Comments

**3. Create Token (`/create`)**
- Form: name, symbol, description, image
- Preview
- Launch button
- Transaction status

**4. Dashboard (`/dashboard`)**
- User portfolio
- Token holdings
- Trade history
- PnL tracking

**5. Explore (`/explore`)**
- Search
- Filters (market cap, age, creator type)
- Advanced sorting

---

## ClawdBot Skill

### Skill Structure

```
skills/launchpad-trader/
├── SKILL.md                   // Skill documentation
├── scripts/
│   ├── create-token.sh        // Create new token
│   ├── buy-token.sh           // Buy tokens
│   ├── sell-token.sh          // Sell tokens
│   ├── get-balance.sh         // Check balance
│   └── list-tokens.sh         // List tokens
└── config/
    └── api.config.json        // API endpoints
```

### Example Commands

```bash
# Create token
launchpad create \
  --name "Gereld Bot" \
  --symbol "GERELD" \
  --description "AI Company Manager" \
  --image "https://..." \
  --initial-buy 1.0

# Buy tokens
launchpad buy GERELD 0.5

# Sell tokens
launchpad sell GERELD 50000

# Check balance
launchpad balance

# List trending
launchpad trending --limit 10

# Search tokens
launchpad search "gereld"
```

---

## Deployment Architecture

### Production Stack

```
┌──────────────────────────────────────────────────────────┐
│                     Load Balancer                        │
│                    (Nginx / Cloudflare)                  │
└────────────────┬─────────────────┬───────────────────────┘
                 │                 │
         ┌───────▼────────┐  ┌────▼─────────┐
         │  Frontend      │  │  Backend     │
         │  (Static CDN)  │  │  (API Nodes) │
         │                │  │  ×3 replicas │
         └────────────────┘  └────┬─────────┘
                                  │
                     ┌────────────┼────────────┐
                     │            │            │
            ┌────────▼──┐  ┌─────▼───┐  ┌────▼────┐
            │ PostgreSQL│  │  Redis  │  │  Solana │
            │  Primary  │  │  Cache  │  │   RPC   │
            │           │  │         │  │         │
            │  Replica  │  └─────────┘  └─────────┘
            └───────────┘
```

### Infrastructure

**Frontend:**
- CDN: Cloudflare / AWS CloudFront
- Static hosting: AWS S3 / Vercel

**Backend:**
- Container orchestration: Docker + Kubernetes
- API instances: 3+ replicas (auto-scaling)
- Load balancer: Nginx
- Rate limiting: Redis

**Database:**
- PostgreSQL 15+ (primary + read replica)
- Connection pooling: PgBouncer
- Backups: Daily snapshots

**Blockchain:**
- Solana RPC: Self-hosted + backups (Helius, QuickNode)
- WebSocket: Direct connection to validator

---

## Security Considerations

### Smart Contracts
- ✅ Audited by Trail of Bits / OpenZeppelin
- ✅ Bug bounty program ($500K pool)
- ✅ Gradual rollout (TVL caps initially)
- ✅ Emergency pause mechanism

### API
- ✅ Rate limiting per API key
- ✅ DDoS protection (Cloudflare)
- ✅ Input validation (class-validator)
- ✅ SQL injection prevention (TypeORM)

### Frontend
- ✅ XSS protection (Angular sanitization)
- ✅ CSRF tokens
- ✅ Content Security Policy
- ✅ HTTPS only

---

## Performance Targets

**API Response Times:**
- GET requests: <100ms (p95)
- POST requests: <500ms (p95)
- WebSocket latency: <50ms

**Blockchain:**
- Transaction confirmation: <1s (Solana)
- Indexer lag: <2s behind chain

**Frontend:**
- Time to Interactive: <2s
- First Contentful Paint: <1s

---

## Monitoring & Observability

**Metrics:**
- API requests/sec
- Database query time
- WebSocket connections
- Blockchain indexer lag
- Transaction success rate

**Alerts:**
- API downtime
- High error rate (>5%)
- Database slow queries
- Indexer stopped
- Smart contract anomalies

**Tools:**
- Prometheus + Grafana (metrics)
- Sentry (error tracking)
- DataDog (APM)
- CloudWatch (logs)

---

## Development Principles

1. **On-chain first**: Blockchain is source of truth
2. **API-first**: Public API powers everything
3. **Real-time**: WebSockets for live updates
4. **Type-safe**: TypeScript everywhere
5. **Tested**: 80%+ code coverage
6. **Documented**: Swagger + inline docs
7. **Observable**: Metrics for everything
8. **Secure**: Audited, rate-limited, validated

---

**Next:** See API.md for detailed endpoint documentation
