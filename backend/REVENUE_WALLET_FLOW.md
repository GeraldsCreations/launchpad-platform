# Revenue Flow - Where Fees Go

**Date:** 2026-02-03 21:57 UTC

---

## 💰 Platform Revenue Wallet

**Your Platform Wallet:** `EzZQCc2wjgoheAETjg7eS6YyxQ8TqufZfD1e4PMF5ZT6`

**Current Balance:** 0.8601 SOL (~$86 at current prices)

**Devnet Explorer:** https://explorer.solana.com/address/EzZQCc2wjgoheAETjg7eS6YyxQ8TqufZfD1e4PMF5ZT6?cluster=devnet

---

## 🔄 Complete Fee Flow

### 1️⃣ **Trading Happens**

User buys/sells tokens on bonding curve or DLMM pool:
- **1% fee charged** on bonding curve trades
- **0.25% fee charged** on graduated pool trades

### 2️⃣ **Fees Accumulate in DBC Pool**

Fees are held in the token's DBC pool (on-chain escrow):
- Each pool has its own fee accumulator
- Fees stored as SOL (native Solana token)

### 3️⃣ **Automated Collection (Every Hour)**

Our backend scheduler runs:
```typescript
@Cron(CronExpression.EVERY_HOUR)
async handleFeeCollection() {
  // Collect from all pools
  await this.feeCollectionService.collectAllFees();
}
```

**Process:**
1. Query all fee vaults
2. Check balance (skip if < 0.01 SOL)
3. Claim fees from Meteora DBC program
4. Transfer to platform wallet

### 4️⃣ **Platform Wallet Receives 50%**

```
feeClaimer: EzZQCc2wjgoheAETjg7eS6YyxQ8TqufZfD1e4PMF5ZT6
```

When config was created, we set:
```typescript
feeClaimer: platformWallet.publicKey  // Your wallet!
```

**Your 50% goes directly to this wallet** ✅

### 5️⃣ **Bot Creator's 50% Tracked in Database**

The other 50% is:
- Recorded in `bot_creator_rewards` table
- Marked as "unclaimed"
- **NOT automatically paid out** (needs payout endpoint)

---

## 💵 Revenue Split Breakdown

### Per Trade (1% bonding curve fee example)

**Trade:** User buys 10 SOL worth of tokens  
**Fee:** 0.1 SOL (1%)

**Split:**
- Platform: 0.05 SOL → **Your Wallet** ✅
- Creator: 0.05 SOL → Database (unclaimed) 💾

### After Automated Collection (Hourly)

```
Pool Vault (0.1 SOL collected) 
        ↓
   Claimed by scheduler
        ↓
   ┌──────────────────┐
   │                  │
   ▼                  ▼
Platform Wallet    Database Record
  (0.05 SOL)       (0.05 SOL unclaimed)
     ✅                 💾
```

---

## 🔍 Verification

### Check Platform Wallet Balance

**Devnet:**
```bash
solana balance EzZQCc2wjgoheAETjg7eS6YyxQ8TqufZfD1e4PMF5ZT6 --url devnet
```

**Or visit Explorer:**
https://explorer.solana.com/address/EzZQCc2wjgoheAETjg7eS6YyxQ8TqufZfD1e4PMF5ZT6?cluster=devnet

### Check Fee Collection Logs

```bash
pm2 logs launchpad | grep "Fee collection"
```

You'll see:
```
Fee collection completed: 3/10 vaults, 0.1234 SOL collected
```

### Check Bot Creator Rewards (Database)

```sql
SELECT 
  bot_id,
  SUM(unclaimed_amount) as total_unclaimed_sol
FROM bot_creator_rewards
GROUP BY bot_id;
```

---

## 📊 Current Setup (Your Wallet)

**Wallet Address:** `EzZQCc2wjgoheAETjg7eS6YyxQ8TqufZfD1e4PMF5ZT6`

**Set in config as:**
- `feeClaimer` (receives platform's 50%)
- `leftoverReceiver` (receives any leftover liquidity)
- `payer` (pays for transactions)

**Stored in .env as:**
```bash
PLATFORM_WALLET_KEYPAIR="[134,143,102,...]"
```

**Used by:**
- DBC config creation
- Token pool creation
- Fee collection
- Platform operations

---

## ⚠️ Important Security Notes

### This Wallet Has:
- ✅ Your platform revenue (accumulating)
- ✅ Private key in `.env` (secure)
- ✅ Used for automated operations
- ⚠️ **KEEP THIS PRIVATE KEY SECRET!**

### Backup Recommendations:
1. **Backup `.env` file** to secure location
2. **Save private key** to password manager
3. **Consider hardware wallet** for mainnet
4. **Setup multi-sig** for large balances

---

## 💸 Withdrawing Revenue

### Current (Manual):
```bash
# From platform wallet to your personal wallet
solana transfer <YOUR_PERSONAL_WALLET> <AMOUNT> \
  --keypair <path_to_platform_keypair> \
  --url devnet
```

### Future (Automated):
Create an endpoint to:
1. Check platform wallet balance
2. Keep 1 SOL for operations
3. Transfer rest to owner's wallet
4. Run weekly/monthly

---

## 🤖 Bot Creator Payouts (TODO)

**Current State:**
- Bot creators' 50% is **tracked** in database
- **NOT automatically paid out**
- Amounts accumulate in `bot_creator_rewards` table

**Need to Build:**
```typescript
// Endpoint: POST /v1/admin/payout-bot-creator/:botId
async payoutBotCreator(botId: string) {
  // 1. Get unclaimed amount from database
  const rewards = await this.getBotRewards(botId);
  
  // 2. Transfer from platform wallet to bot's wallet
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: platformWallet.publicKey,
      toPubkey: new PublicKey(rewards.botWallet),
      lamports: rewards.unclaimedAmount * 1e9,
    })
  );
  
  // 3. Update database (claimed = true)
  await this.markAsClaimed(botId);
}
```

---

## 📈 Expected Revenue

### Example Scenario:
- 10 tokens created/day
- Average 50 SOL trading volume per token (bonding curve)
- 1% fee = 0.5 SOL per token
- Platform gets 50% = 0.25 SOL per token

**Daily Revenue:** 10 tokens × 0.25 SOL = 2.5 SOL/day  
**Monthly Revenue:** 2.5 × 30 = 75 SOL/month  
**At $100/SOL:** $7,500/month 💰

---

## ✅ Summary

**Where does revenue go?**

**Platform's 50%:**
- ✅ Goes to wallet: `EzZQCc2wjgoheAETjg7eS6YyxQ8TqufZfD1e4PMF5ZT6`
- ✅ Automatically collected every hour
- ✅ Available immediately in wallet
- ✅ Can be withdrawn anytime

**Bot Creator's 50%:**
- 💾 Tracked in database (`bot_creator_rewards` table)
- ⏳ Marked as "unclaimed"
- ⚠️ Needs payout endpoint (not built yet)
- 📊 Visible in database queries

**Revenue Status:**
- ✅ Collection: Automated
- ✅ Platform share: Automatic to wallet
- ⚠️ Bot payouts: Manual/pending implementation

**Your wallet is accumulating fees right now!** 🎉
