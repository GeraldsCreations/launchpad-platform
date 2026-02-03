# LaunchPad Backend Architecture

**Last Updated:** 2026-02-03 21:33 UTC

## 🏗️ System Overview

The LaunchPad backend uses an **event-driven architecture** where tokens and trades enter the system via on-chain events that are indexed in real-time.

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER ACTIONS                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─── Create Token
                              ├─── Buy Tokens
                              └─── Sell Tokens
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (Angular)                         │
│  - Token creation form                                      │
│  - Trading interface                                        │
│  - Wallet integration (Phantom/Solflare)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND API (/v1)                           │
│                                                             │
│  POST /v1/tokens/create  ─┐                                 │
│  POST /v1/trade/buy       │ Returns unsigned transaction   │
│  POST /v1/trade/sell      │                                 │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            │ Transaction Builder
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              DBC SERVICE (Token Creation)                   │
│                                                             │
│  1. Upload image to IPFS (Pinata)                           │
│  2. Upload metadata JSON to IPFS                            │
│  3. Build Solana transaction:                               │
│     - Create token mint                                     │
│     - Create DBC pool                                       │
│     - Initialize bonding curve                              │
│  4. Partially sign (platform wallet)                        │
│  5. Return to user for final signature                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ User signs tx
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  USER WALLET                                │
│  - Signs transaction                                        │
│  - Submits to Solana blockchain                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              SOLANA BLOCKCHAIN (Devnet)                     │
│                                                             │
│  Programs:                                                  │
│  - Token Mint Program                                       │
│  - Meteora DBC Program                                      │
│  - System Program                                           │
│                                                             │
│  Emits Events:                                              │
│  - TokenCreated                                             │
│  - TokenPurchased                                           │
│  - TokenSold                                                │
│  - TokenGraduated                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket Subscription
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 INDEXER SERVICE                             │
│                                                             │
│  - Subscribes to DBC program logs                           │
│  - Listens for events in real-time                          │
│  - Parses transaction logs                                  │
│  - Extracts event data                                      │
│                                                             │
│  Event Types:                                               │
│  • TokenCreated   → handleTokenCreated()                    │
│  • TokenPurchased → handleTrade()                           │
│  • TokenSold      → handleTrade()                           │
│  • TokenGraduated → handleGraduation()                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Save to DB
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL)                          │
│                                                             │
│  Tables:                                                    │
│  • tokens          - Token metadata                         │
│  • trades          - Buy/sell transactions                  │
│  • meteora_pools   - Pool information                       │
│  • chat_messages   - Chat/comments                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Real-time updates
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              WEBSOCKET GATEWAY                              │
│                                                             │
│  - Broadcasts new tokens                                    │
│  - Broadcasts new trades                                    │
│  - Updates prices                                           │
│  - Live activity feed                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (Live Updates)                   │
│  - Token list refreshes                                     │
│  - Price charts update                                      │
│  - Activity feed shows new trades                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Detailed Flows

### 1️⃣ **Token Creation Flow**

```
User → Frontend → POST /v1/tokens/create
                    ↓
            DBC Service builds transaction:
              1. Upload image → Pinata IPFS
              2. Upload metadata → Pinata IPFS
              3. Create token mint instruction
              4. Create DBC pool instruction
              5. Platform wallet partially signs
                    ↓
            Returns unsigned transaction
                    ↓
User wallet signs & submits → Solana blockchain
                    ↓
Blockchain emits "TokenCreated" event
                    ↓
Indexer catches event → Parses data
                    ↓
Saves token to database
                    ↓
WebSocket broadcasts new token
                    ↓
Frontend shows new token in list
```

### 2️⃣ **Trading Flow (Buy/Sell)**

```
User → Frontend → POST /v1/trade/buy
                    ↓
            Trading Service builds transaction:
              1. Calculate token amount from SOL
              2. Create swap instruction (DBC)
              3. Add slippage protection
              4. Return unsigned transaction
                    ↓
            Returns unsigned transaction
                    ↓
User wallet signs & submits → Solana blockchain
                    ↓
Blockchain emits "TokenPurchased" event
                    ↓
Indexer catches event → Parses data
                    ↓
Saves trade to database
                    ↓
Updates token stats (volume, price, holders)
                    ↓
WebSocket broadcasts trade + price update
                    ↓
Frontend updates:
  - Price chart
  - Activity feed
  - Token stats
```

### 3️⃣ **Indexer Event Processing**

```
Solana Blockchain (via WebSocket)
        ↓
onLogs(bondingCurveProgramId)
        ↓
processLogs(logs)
        ↓
parseLogMessages() → Extract event type & data
        ↓
┌──────────────┬──────────────┬──────────────┐
│              │              │              │
▼              ▼              ▼              ▼
TokenCreated   Trade         Graduation     (Other)
│              │              │
▼              ▼              ▼
handleTokenCreated()  handleTrade()  handleGraduation()
│              │              │
▼              ▼              ▼
Save to tokens_table  Save to trades_table  Update token status
│              │              │
▼              ▼              ▼
WebSocket broadcast   WebSocket broadcast   WebSocket broadcast
```

---

## 🛠️ Key Services

### **TokenService** (`public-api/services/token.service.ts`)
- **Purpose:** Handle token creation requests
- **Dependencies:** DbcService, BlockchainService
- **Key Method:** `createToken()` → Returns unsigned transaction

### **DbcService** (`meteora-api/services/dbc.service.ts`)
- **Purpose:** Build token creation transactions using Meteora DBC
- **Key Methods:**
  - `buildCreateTokenTransaction()` → Builds unsigned tx
  - `uploadMetadata()` → Uploads to IPFS via Pinata

### **TradingService** (`public-api/services/trading.service.ts`)
- **Purpose:** Handle buy/sell transactions
- **Key Methods:**
  - `createBuyTransaction()` → Build buy tx
  - `createSellTransaction()` → Build sell tx

### **IndexerService** (`indexer/indexer.service.ts`)
- **Purpose:** Listen to blockchain events and sync to database
- **Key Methods:**
  - `start()` → Subscribe to program logs
  - `processLogs()` → Parse and handle events
  - `handleTokenCreated()` → Save new tokens
  - `handleTrade()` → Save trades and update stats

### **MetadataUploadService** (`meteora-api/services/metadata-upload.service.ts`)
- **Purpose:** Upload images and metadata to IPFS
- **Provider:** Pinata Cloud
- **Returns:** `ipfs://QmXXX...` URIs

---

## 🗄️ Database Schema (Simplified)

### **tokens** table
```sql
- address (PK)           - Token mint address
- name                   - Token name
- symbol                 - Token symbol
- description            - Description
- image_url              - IPFS URI
- creator_wallet         - Creator public key
- bonding_curve_address  - DBC pool address
- market_cap             - Current market cap
- volume_24h             - 24h trading volume
- created_at             - Timestamp
```

### **trades** table
```sql
- id (PK)                - Auto-increment ID
- signature              - Transaction signature
- token_address (FK)     - Reference to tokens
- trader_wallet          - Trader public key
- side                   - 'buy' or 'sell'
- amount_sol             - SOL amount
- amount_tokens          - Token amount
- price                  - Price at execution
- created_at             - Timestamp
```

---

## 🔌 API Endpoints (Public)

### Tokens
- `GET    /v1/tokens` - List all tokens
- `GET    /v1/tokens/:address` - Get token details
- `POST   /v1/tokens/create` - Create token (returns unsigned tx)
- `GET    /v1/tokens/trending` - Trending tokens
- `GET    /v1/tokens/new` - New tokens

### Trading
- `POST   /v1/trade/buy` - Buy tokens (returns unsigned tx)
- `POST   /v1/trade/sell` - Sell tokens (returns unsigned tx)
- `GET    /v1/trade/history/:tokenAddress` - Trade history

### Other
- `GET    /sol-price` - Current SOL price (oracle)
- `GET    /api/v1/pool/:address` - Pool stats

---

## 🚀 How It Works (Summary)

### **Data INTO the System:**

1. **User creates token** → Frontend calls `/v1/tokens/create`
2. **Backend builds transaction** → DBC service creates unsigned tx
3. **User signs & submits** → Transaction goes to Solana
4. **Blockchain emits event** → "TokenCreated" log
5. **Indexer catches event** → WebSocket subscription
6. **Event parsed** → Extract token data from logs
7. **Saved to database** → Token row created
8. **Broadcast to clients** → WebSocket sends update

### **Data OUT of the System:**

1. **Frontend requests data** → `GET /v1/tokens`
2. **Backend queries database** → TokenRepository.findAll()
3. **Returns JSON** → Token list with stats
4. **Real-time updates** → WebSocket for live changes

---

## ✅ Current Status

- ✅ Token creation working (DBC + IPFS)
- ✅ Trading endpoints working (buy/sell)
- ✅ Indexer running (WebSocket subscription)
- ✅ Database schema complete
- ✅ WebSocket broadcasting working
- ⚠️ Indexer event parsing is **stubbed** (needs full implementation)

---

## ⚠️ TODO: Complete Indexer Implementation

**Current Issue:** The indexer is listening to events but not fully parsing them.

**What needs to be done:**
1. Parse actual program logs (not simulated)
2. Extract event data from instruction data
3. Decode accounts and parameters
4. Handle all event types properly

**This is critical** for tokens/trades to automatically appear in the database after on-chain creation!

---

## 📝 Notes

- **No auth required** for public endpoints (buy/sell/create)
- **Rate limiting** via ThrottlerGuard (100 req/min)
- **WebSocket** for real-time updates (live prices, trades)
- **IPFS storage** via Pinata (image + metadata)
- **DBC bonding curve** for price discovery
