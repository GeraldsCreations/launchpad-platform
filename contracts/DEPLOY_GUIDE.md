# Quick Deployment Guide - Pump Program

## ✅ Status: Ready to Deploy

**Build:** Complete  
**Output:** `target/deploy/pump.so` (365K eBPF)  
**Network:** Devnet recommended for testing

---

## 1. Prerequisites Check

```bash
# Check Solana CLI is installed
solana --version
# Expected: solana-cli 1.18+

# Check you have a wallet
solana address
# If error, create one: solana-keygen new

# Check current network
solana config get
# Should show: RPC URL: https://api.devnet.solana.com
```

---

## 2. Set Up Devnet

```bash
# Configure for devnet
solana config set --url https://api.devnet.solana.com

# Check your balance
solana balance

# Get devnet SOL (airdrop)
solana airdrop 2

# Verify
solana balance
# Should show: 2 SOL
```

---

## 3. Deploy the Program

```bash
cd /root/.openclaw/workspace/launchpad-platform/contracts

# Deploy pump program
solana program deploy target/deploy/pump.so

# Expected output:
# Program Id: <PROGRAM_ID>
#
# To deploy this program:
#   $ solana program deploy target/deploy/pump.so
# The program address will default to this keypair (override with --program-id):
#   target/deploy/pump-keypair.json
```

**Save the Program ID!** You'll need it for the frontend.

---

## 4. Verify Deployment

```bash
# Check program exists (replace <PROGRAM_ID> with actual ID)
solana program show <PROGRAM_ID>

# Expected output:
# Program Id: <PROGRAM_ID>
# Owner: BPFLoaderUpgradeab1e11111111111111111111111
# ProgramData Address: ...
# Authority: <YOUR_WALLET>
# Last Deployed In Slot: ...
# Data Length: ... bytes
# Balance: ... SOL
```

---

## 5. If Deployment Fails

### Error: Insufficient Funds
```bash
solana airdrop 2
# Wait 30 seconds, try again
```

### Error: Account Already Exists
```bash
# Generate new keypair
solana-keygen new -o target/deploy/pump-keypair.json --force

# Deploy again
solana program deploy target/deploy/pump.so
```

### Error: Program Too Large
```bash
# Check file size
ls -lh target/deploy/pump.so

# If > 200KB, you may need more SOL for rent
# Estimate cost:
solana rent <FILE_SIZE_BYTES>

# Get more SOL:
solana airdrop 5
```

---

## 6. Update Program (After Changes)

```bash
# Rebuild
cd /root/.openclaw/workspace/launchpad-platform/contracts/programs/pump
cargo-build-sbf

# Upgrade deployed program
cd ../..
solana program deploy target/deploy/pump.so

# Or specify program ID explicitly:
solana program deploy --program-id <EXISTING_PROGRAM_ID> target/deploy/pump.so
```

---

## 7. Deploy to Mainnet (⚠️ CAUTION)

**ONLY after thorough testing on devnet!**

```bash
# Switch to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# You'll need REAL SOL (not airdrop)
# Check balance
solana balance

# Deploy (costs ~1-2 SOL)
solana program deploy target/deploy/pump.so

# Consider using a multi-sig for authority
# https://docs.solana.com/cli/transfer-tokens
```

---

## 8. Frontend Integration

After deployment, update your frontend config:

```typescript
// config/solana.ts
export const PUMP_PROGRAM_ID = new PublicKey("<YOUR_PROGRAM_ID>");
export const NETWORK = "devnet"; // or "mainnet-beta"
export const RPC_ENDPOINT = "https://api.devnet.solana.com";
```

---

## 9. Test the Program

### Using Anchor IDL

```bash
# Generate IDL (if needed)
anchor build --idl

# Test with Anchor
anchor test --skip-build --skip-deploy

# Or use Anchor client:
anchor client <YOUR_PROGRAM_ID>
```

### Using Solana CLI

```bash
# Example: Call initialize_curve_configuration
solana program invoke <PROGRAM_ID> \
  --data <BASE58_ENCODED_INSTRUCTION_DATA>
```

### Using TypeScript SDK

```typescript
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import idl from './target/idl/pump.json';

const program = new Program(idl, PUMP_PROGRAM_ID, provider);

// Call your instructions
await program.methods
  .initializeCurveConfiguration(...)
  .accounts({ ... })
  .rpc();
```

---

## 10. Monitoring & Debugging

### Check Program Logs

```bash
# Stream logs
solana logs <PROGRAM_ID>

# Or for specific transaction:
solana confirm <TRANSACTION_SIGNATURE> --verbose
```

### Common Issues

**"Program failed to complete"**
- Check account permissions (mut vs immutable)
- Verify PDAs are derived correctly
- Check signer requirements

**"Invalid account data"**
- Account not initialized yet
- Wrong account passed to instruction
- Serialization mismatch

**"Custom program error: 0x1"**
- Check your error codes in `lib.rs`
- Use `anchor expand` to see generated code

---

## 11. Cost Estimates (Devnet Free, Mainnet Paid)

| Action | Devnet | Mainnet |
|--------|--------|---------|
| Deploy (365K program) | Free | ~1-2 SOL |
| Upgrade existing | Free | ~0.01 SOL |
| Rent (account storage) | Free | ~0.002 SOL/account |
| Transaction fee | Free | 0.000005 SOL |

---

## Quick Commands Reference

```bash
# Build
cargo-build-sbf

# Deploy devnet
solana config set --url https://api.devnet.solana.com
solana airdrop 2
solana program deploy target/deploy/pump.so

# Verify
solana program show <PROGRAM_ID>

# Update
cargo-build-sbf
solana program deploy target/deploy/pump.so

# Check logs
solana logs <PROGRAM_ID>
```

---

## Next Steps

1. ✅ Deploy pump program
2. Deploy other programs (bonding-curve, token-factory, graduation)
3. Test all instructions on devnet
4. Build frontend integration
5. Thorough security audit
6. Deploy to mainnet

---

**Good luck!** 🚀

The program is production-ready for devnet deployment.  
All build issues resolved.  
File: `target/deploy/pump.so` (365K eBPF format)

---

**Created:** 2026-02-02  
**Updated:** After successful build fix  
**Status:** Ready for deployment ✅
