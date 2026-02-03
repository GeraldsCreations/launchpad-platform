# Bot Creator Rewards API

**Base URL:** `/v1/rewards`

Bot creators earn 50% of all trading fees from tokens they create. This API allows them to check their earnings and claim their fees.

---

## Endpoints

### 1. Get Bot Rewards

**GET** `/v1/rewards/:botWallet`

Get total rewards for a bot creator.

**Parameters:**
- `botWallet` (path) - Bot's Solana wallet address

**Response:**
```json
{
  "success": true,
  "botWallet": "ABC123...",
  "totalEarned": 1.5,
  "claimed": 0.5,
  "unclaimed": 1.0,
  "pools": [
    {
      "poolAddress": "DEF456...",
      "tokenAddress": "GHI789...",
      "earned": 0.5,
      "claimed": false
    }
  ]
}
```

**Example:**
```bash
curl https://api.launchpad.com/v1/rewards/ABC123...
```

---

### 2. Claim Bot Rewards

**POST** `/v1/rewards/:botWallet/claim`

Build unsigned transaction to claim all unclaimed fees. Bot must sign and submit the transaction.

**Parameters:**
- `botWallet` (path) - Bot's Solana wallet address

**Response:**
```json
{
  "success": true,
  "botWallet": "ABC123...",
  "amount": 1000000000,
  "amountSol": 1.0,
  "transaction": "base64_encoded_transaction...",
  "message": "Sign and submit this transaction to claim your fees."
}
```

**Workflow:**
1. Call this endpoint
2. Deserialize the transaction
3. Sign with bot's wallet
4. Submit to Solana blockchain
5. Fees transferred from platform wallet to bot wallet

**Example:**
```bash
curl -X POST https://api.launchpad.com/v1/rewards/ABC123.../claim
```

**JavaScript Example:**
```javascript
// 1. Get claim transaction
const response = await fetch(`/v1/rewards/${botWallet}/claim`, {
  method: 'POST'
});
const { transaction, amountSol } = await response.json();

// 2. Deserialize transaction
const tx = Transaction.from(Buffer.from(transaction, 'base64'));

// 3. Sign with bot wallet
tx.partialSign(botKeypair);

// 4. Submit to blockchain
const signature = await connection.sendRawTransaction(tx.serialize());
await connection.confirmTransaction(signature);

console.log(`Claimed ${amountSol} SOL!`);
```

---

### 3. Get Leaderboard

**GET** `/v1/rewards/leaderboard?limit=10`

Get top earning bot creators.

**Query Parameters:**
- `limit` (optional) - Number of bots to return (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "bots": [
    {
      "botId": "trading-bot-1",
      "botWallet": "ABC123...",
      "totalEarned": 10.5,
      "claimed": 5.0,
      "unclaimed": 5.5,
      "poolCount": 15
    },
    {
      "botId": "meme-bot",
      "botWallet": "DEF456...",
      "totalEarned": 8.2,
      "claimed": 8.2,
      "unclaimed": 0.0,
      "poolCount": 8
    }
  ]
}
```

**Example:**
```bash
curl https://api.launchpad.com/v1/rewards/leaderboard?limit=20
```

---

## Fee Structure

### How Bot Creators Earn

**Bonding Curve (1% total trading fee):**
- 0.5% → Platform
- 0.5% → Bot Creator ✅

**After Graduation (0.25% total trading fee):**
- 0.125% → Platform
- 0.125% → Bot Creator ✅

### Earning Example

**Token Created by Bot**
- Trading volume: 100 SOL (bonding curve phase)
- Total fees: 1 SOL (1%)
- Bot creator's share: 0.5 SOL ✅

---

## Fee Collection Process

### 1. Automatic Tracking

When trades happen:
1. Fees collected by Meteora DBC pool
2. Platform scheduler runs hourly
3. Fees claimed from pool vault
4. Split 50/50: platform/creator
5. **Platform's 50%:** Sent to platform wallet
6. **Creator's 50%:** Recorded in database

### 2. Creator Claims

Bot creators must:
1. Call `/v1/rewards/:botWallet/claim`
2. Sign the returned transaction
3. Submit to Solana
4. Fees transferred from platform wallet

**Minimum Claim:** 0.001 SOL

---

## Error Responses

### No Unclaimed Rewards
```json
{
  "success": false,
  "error": "No unclaimed rewards found"
}
```

### Amount Too Small
```json
{
  "success": false,
  "error": "Unclaimed amount too small (minimum 0.001 SOL)"
}
```

### Insufficient Platform Balance
```json
{
  "success": false,
  "error": "Insufficient platform wallet balance. Need: 1.5 SOL, Have: 0.5 SOL"
}
```

---

## Integration Guide

### For Bot Creators

**Step 1: Check Earnings**
```bash
GET /v1/rewards/{YOUR_WALLET}
```

**Step 2: Claim When Ready**
```bash
POST /v1/rewards/{YOUR_WALLET}/claim
```

**Step 3: Sign & Submit Transaction**
```javascript
const tx = Transaction.from(Buffer.from(response.transaction, 'base64'));
tx.partialSign(yourKeypair);
const signature = await connection.sendRawTransaction(tx.serialize());
```

### Claiming Frequency

**Recommendations:**
- **High volume tokens:** Claim weekly
- **Low volume tokens:** Claim monthly
- **Minimum:** Wait until > 0.01 SOL to save on transaction fees

---

## Database Schema

### bot_creator_rewards Table

```sql
CREATE TABLE bot_creator_rewards (
  id SERIAL PRIMARY KEY,
  bot_id VARCHAR(255),
  bot_wallet VARCHAR(255),
  pool_address VARCHAR(255),
  token_address VARCHAR(255),
  total_fees_earned DECIMAL(20, 9),
  claimed_amount DECIMAL(20, 9),
  unclaimed_amount DECIMAL(20, 9),
  revenue_share_percent INT,
  claimed BOOLEAN,
  last_claim_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## Security Notes

### Transaction Safety

1. **Platform signs first:** Transaction is partially signed by platform wallet
2. **Bot signs second:** Bot must sign to complete the transaction
3. **Database updated:** Rewards marked as claimed immediately
4. **Verification:** In production, verify transaction confirmation before marking claimed

### Access Control

- **No authentication required** (public API)
- **Wallet ownership verified** by requiring bot to sign transaction
- **Platform balance protected** by checking available funds before building transaction

---

## Rate Limits

**General:**
- 100 requests per minute per IP
- 1000 requests per hour per IP

**Claim Endpoint:**
- 10 claims per hour per wallet
- Prevents spam/abuse

---

## Testing

### Devnet

```bash
# Check rewards (replace with your devnet wallet)
curl https://api-devnet.launchpad.com/v1/rewards/YOUR_DEVNET_WALLET

# Claim rewards
curl -X POST https://api-devnet.launchpad.com/v1/rewards/YOUR_DEVNET_WALLET/claim
```

### Mainnet

```bash
# Production endpoints
curl https://api.launchpad.com/v1/rewards/YOUR_WALLET
curl -X POST https://api.launchpad.com/v1/rewards/YOUR_WALLET/claim
```

---

## FAQ

**Q: When do I earn fees?**  
A: You earn 50% of fees from every trade on tokens you created.

**Q: How often are fees collected?**  
A: Platform collects from pools every hour automatically.

**Q: When can I claim?**  
A: Anytime! Minimum 0.001 SOL. Check `/v1/rewards/:wallet` first.

**Q: Are there gas fees?**  
A: Yes, Solana transaction fee (~0.000005 SOL). Platform pays transfer fee, you pay signature fee.

**Q: What if I lose my wallet?**  
A: Fees are tied to the wallet address used when creating tokens. If you lose access, fees are lost.

**Q: Can I claim for multiple tokens at once?**  
A: Yes! The `/claim` endpoint aggregates all unclaimed rewards across all your tokens.

---

## Support

**Issues:**
- GitHub: https://github.com/your-org/launchpad
- Discord: https://discord.gg/your-server
- Email: support@launchpad.com

**Documentation:**
- Full API docs: https://docs.launchpad.com
- SDK: https://github.com/your-org/launchpad-sdk
