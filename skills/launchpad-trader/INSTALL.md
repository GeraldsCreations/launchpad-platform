# Installation Guide

## Quick Install (5 minutes)

### 1. Install Dependencies

```bash
# Update package list
sudo apt-get update

# Install required packages
sudo apt-get install -y jq curl bc

# Install Solana CLI (for wallet operations)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add Solana to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Add to shell profile for persistence
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc

# Reload shell
source ~/.bashrc

# Verify installation
solana --version
jq --version
```

### 2. Create Trading Wallet

```bash
# Create new wallet
mkdir -p ~/.config/solana
solana-keygen new --outfile ~/.config/solana/launchpad-bot.json

# ⚠️ IMPORTANT: Save your seed phrase securely!

# Check wallet address
solana-keygen pubkey ~/.config/solana/launchpad-bot.json

# Check balance (should be 0)
solana balance --keypair ~/.config/solana/launchpad-bot.json
```

### 3. Fund Wallet

**Option A: Testnet (for testing)**
```bash
# Switch to devnet
solana config set --url devnet

# Request airdrop
solana airdrop 1 --keypair ~/.config/solana/launchpad-bot.json

# Verify balance
solana balance --keypair ~/.config/solana/launchpad-bot.json
```

**Option B: Mainnet (for real trading)**
```bash
# Get your wallet address
WALLET_ADDRESS=$(solana-keygen pubkey ~/.config/solana/launchpad-bot.json)
echo "Send SOL to: $WALLET_ADDRESS"

# Transfer from another wallet, exchange, or purchase SOL
# Wait for transaction confirmation...

# Verify balance
solana balance --keypair ~/.config/solana/launchpad-bot.json
```

### 4. Configure Environment

```bash
# Add to ~/.bashrc or ~/.zshrc
cat >> ~/.bashrc << 'EOF'

# LaunchPad Trader Configuration
export LAUNCHPAD_API_URL="https://api.launchpad.fun/v1"
export LAUNCHPAD_WALLET_PATH="$HOME/.config/solana/launchpad-bot.json"
export LAUNCHPAD_SLIPPAGE="0.05"
export LAUNCHPAD_AUTO_CONFIRM="false"

EOF

# Reload configuration
source ~/.bashrc
```

### 5. Install LaunchPad CLI

```bash
# Option A: Add to PATH
export PATH="$PATH:/root/.openclaw/workspace/launchpad-platform/skills/launchpad-trader"
echo 'export PATH="$PATH:/root/.openclaw/workspace/launchpad-platform/skills/launchpad-trader"' >> ~/.bashrc

# Option B: Create symlink (requires sudo)
sudo ln -s /root/.openclaw/workspace/launchpad-platform/skills/launchpad-trader/launchpad /usr/local/bin/launchpad

# Verify installation
launchpad version
```

### 6. Test Installation

```bash
# Run test script
cd /root/.openclaw/workspace/launchpad-platform/skills/launchpad-trader
./test-skill.sh

# Try basic commands
launchpad balance
launchpad trending
launchpad search "test"
```

---

## Verification Checklist

- [ ] Dependencies installed (jq, curl, bc, solana)
- [ ] Wallet created and secured
- [ ] Wallet funded with SOL
- [ ] Environment variables set
- [ ] LaunchPad CLI accessible
- [ ] Test script passes
- [ ] Basic commands work

---

## Next Steps

1. **Read Documentation**
   - `SKILL.md` - Complete skill reference
   - `README.md` - Usage guide and examples

2. **Try Sample Commands**
   ```bash
   # View trending tokens
   launchpad trending

   # Search tokens
   launchpad search "AI"

   # Check your balance
   launchpad balance
   ```

3. **Start Trading** (when backend is live)
   ```bash
   # Create your first token
   launchpad create --name "My Token" --symbol "MYTKN"

   # Buy tokens
   launchpad buy SYMBOL 0.5

   # Check portfolio
   launchpad balance
   ```

---

## Troubleshooting

### Solana CLI Not Found
```bash
# Check if installed
which solana

# If not in PATH, add it
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Make permanent
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
```

### Permission Denied
```bash
# Make scripts executable
chmod +x /root/.openclaw/workspace/launchpad-platform/skills/launchpad-trader/launchpad
chmod +x /root/.openclaw/workspace/launchpad-platform/skills/launchpad-trader/scripts/*.sh
```

### Wallet Not Found
```bash
# Check wallet path
ls -la ~/.config/solana/launchpad-bot.json

# Verify environment variable
echo $LAUNCHPAD_WALLET_PATH

# Set if missing
export LAUNCHPAD_WALLET_PATH="$HOME/.config/solana/launchpad-bot.json"
```

### API Connection Error
```bash
# Test API endpoint
curl https://api.launchpad.fun/v1/tokens/trending

# If fails, backend may not be deployed yet
# This is normal during development
```

---

## Security Reminders

1. ✅ **Backup seed phrase** - Write it down on paper
2. ✅ **Never share keypair** - Keep wallet file private
3. ✅ **Use separate wallet** - Don't use main wallet for bots
4. ✅ **Test with small amounts** - Start with minimal SOL
5. ✅ **Monitor transactions** - Check Solscan regularly

---

## Support

- Documentation: `SKILL.md`, `README.md`
- Architecture: `/root/.openclaw/workspace/launchpad-platform/docs/ARCHITECTURE.md`
- Issues: Contact LaunchPad team

---

**Estimated Time**: 5-10 minutes  
**Difficulty**: Easy  
**Prerequisites**: Linux/Unix shell access
