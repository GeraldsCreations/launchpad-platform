# LaunchPad API Quick Reference

Base URL: `http://localhost:3000/v1`

---

## 🪙 Tokens API

### Create Token
```http
POST /tokens/create
Content-Type: application/json

{
  "name": "My Token",
  "symbol": "MTK",
  "description": "My awesome token",
  "imageUrl": "https://...",
  "creator": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "creatorType": "human",
  "initialBuy": 0.1
}
```

### Get Token Details
```http
GET /tokens/:address
```

### Get Trending Tokens
```http
GET /tokens/trending?limit=10
```

### Get New Tokens
```http
GET /tokens/new?limit=10
```

### Search Tokens
```http
GET /tokens/search?q=moon&limit=20
```

### Get Tokens by Creator
```http
GET /tokens/filter/creator/:creatorWallet?limit=20
```

### Get Graduated Tokens
```http
GET /tokens/filter/graduated?limit=10
```

---

## 💹 Trading API

### Buy Tokens
```http
POST /trade/buy
Content-Type: application/json

{
  "tokenAddress": "ABC123...",
  "amountSol": 0.5,
  "buyer": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "minTokensOut": 45000
}
```

**Response:**
```json
{
  "success": true,
  "signature": "5j7s...",
  "trade": {
    "id": 123,
    "tokenAddress": "ABC123...",
    "trader": "7xKXtg2...",
    "side": "buy",
    "amountSol": 0.5,
    "amountTokens": "50000",
    "price": 0.00001,
    "fee": 0.005,
    "timestamp": "2024-02-02T12:00:00Z"
  }
}
```

### Sell Tokens
```http
POST /trade/sell
Content-Type: application/json

{
  "tokenAddress": "ABC123...",
  "amountTokens": 50000,
  "seller": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "minSolOut": 0.45
}
```

### Get Buy Quote
```http
GET /trade/quote/buy?token=ABC123...&amount=0.5
```

**Response:**
```json
{
  "tokenAddress": "ABC123...",
  "side": "buy",
  "inputAmount": 0.5,
  "outputAmount": 50000,
  "price": 0.00001,
  "fee": 0.005,
  "priceImpact": 0.5
}
```

### Get Sell Quote
```http
GET /trade/quote/sell?token=ABC123...&amount=50000
```

### Get Token Trade History
```http
GET /trade/history/:tokenAddress?limit=50
```

### Get User Trade History
```http
GET /trade/user/:walletAddress?limit=50
```

### Get Recent Trades
```http
GET /trade/recent?limit=50
```

---

## 🔌 WebSocket API

**URL:** `ws://localhost:3000/v1/ws`

### Subscribe to Token Updates
```json
{
  "action": "subscribe",
  "channel": "token",
  "token_address": "ABC123..."
}
```

### Subscribe to New Tokens
```json
{
  "action": "subscribe",
  "channel": "new_tokens"
}
```

### Subscribe to Trending
```json
{
  "action": "subscribe",
  "channel": "trending"
}
```

### Subscribe to All Trades
```json
{
  "action": "subscribe",
  "channel": "trades"
}
```

### Unsubscribe
```json
{
  "action": "unsubscribe",
  "channel": "token",
  "token_address": "ABC123..."
}
```

### Events Received

**Price Update:**
```json
{
  "event": "price_update",
  "token_address": "ABC123...",
  "price": 0.00012,
  "market_cap": 12345,
  "volume_24h": 45678,
  "timestamp": 1706876400000
}
```

**New Token:**
```json
{
  "event": "token_created",
  "token_address": "ABC123...",
  "name": "New Token",
  "symbol": "NEW",
  "creator": "7xKXtg2...",
  "creator_type": "human",
  "timestamp": 1706876400000
}
```

**Trade:**
```json
{
  "event": "trade",
  "token_address": "ABC123...",
  "side": "buy",
  "amount_sol": 0.5,
  "amount_tokens": "50000",
  "trader": "7xKXtg2...",
  "price": 0.00001,
  "timestamp": 1706876400000
}
```

---

## 🔐 Admin API

### Create API Key
```http
POST /admin/users/:wallet/api-key
Content-Type: application/json

{
  "tier": "free"
}
```

**Response:**
```json
{
  "apiKey": "lp_abc123..."
}
```

### Revoke API Key
```http
DELETE /admin/users/:wallet/api-key
```

### Update User Tier
```http
POST /admin/users/:wallet/tier
Content-Type: application/json

{
  "tier": "pro"
}
```

### List All Users
```http
GET /admin/users
```

### Get System Status
```http
GET /admin/system/status
```

**Response:**
```json
{
  "indexer": {
    "isRunning": true,
    "lastProcessedSlot": 123456789,
    "programId": "BondCurve111..."
  },
  "websocket": {
    "totalConnections": 42,
    "subscriptions": 128
  },
  "timestamp": "2024-02-02T12:00:00Z"
}
```

### Restart Indexer
```http
POST /admin/indexer/restart
```

---

## 📊 Analytics API

### Get Dashboard Stats
```http
GET /analytics/dashboard
```

**Response:**
```json
{
  "totalTokens": 1234,
  "totalTrades": 5678,
  "totalVolume": 123456.78,
  "activeTokens": 890,
  "graduatedTokens": 45,
  "volume24h": 12345.67,
  "trades24h": 234
}
```

### Get Historical Stats
```http
GET /analytics/historical?startDate=2024-01-01&endDate=2024-01-31
```

### Get Top Tokens
```http
GET /analytics/top-tokens?limit=10
```

**Response:**
```json
[
  {
    "address": "ABC123...",
    "name": "Top Token",
    "symbol": "TOP",
    "volume24h": 12345.67,
    "marketCap": 100000,
    "price": 0.001
  }
]
```

### Get Top Traders
```http
GET /analytics/top-traders?limit=10
```

**Response:**
```json
[
  {
    "trader": "7xKXtg2...",
    "tradeCount": "123",
    "totalVolume": "12345.67"
  }
]
```

---

## 🚦 Rate Limits

- **Free tier:** 100 requests/minute
- **Starter tier:** 1,000 requests/minute
- **Pro tier:** 10,000 requests/minute

---

## ⚠️ Error Responses

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Token ABC123... not found",
  "error": "Not Found"
}
```

**429 Rate Limit:**
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

---

## 📚 Full Documentation

**Swagger UI:** http://localhost:3000/api/docs

Interactive API documentation with request/response examples and the ability to test endpoints directly in the browser.

---

## 🧪 Testing Examples

### cURL Examples

**Create Token:**
```bash
curl -X POST http://localhost:3000/v1/tokens/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Token",
    "symbol": "TEST",
    "creator": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
  }'
```

**Buy Tokens:**
```bash
curl -X POST http://localhost:3000/v1/trade/buy \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "ABC123...",
    "amountSol": 0.5,
    "buyer": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
  }'
```

**Get Trending:**
```bash
curl http://localhost:3000/v1/tokens/trending?limit=10
```

### JavaScript/TypeScript Example

```typescript
// Using fetch
const response = await fetch('http://localhost:3000/v1/tokens/trending?limit=10');
const tokens = await response.json();

// Using axios
import axios from 'axios';

const { data } = await axios.post('http://localhost:3000/v1/trade/buy', {
  tokenAddress: 'ABC123...',
  amountSol: 0.5,
  buyer: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
});
```

### WebSocket Example (JavaScript)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/v1/ws');

// Subscribe to new tokens
socket.emit('subscribe', {
  action: 'subscribe',
  channel: 'new_tokens'
});

// Listen for events
socket.on('message', (data) => {
  if (data.event === 'token_created') {
    console.log('New token:', data.name, data.symbol);
  }
});
```

---

**Last Updated:** February 2024
