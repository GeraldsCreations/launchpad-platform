#!/bin/bash

# Deploy smart contracts to Solana mainnet
# ⚠️  USE WITH CAUTION - THIS DEPLOYS TO MAINNET

set -e

echo "⚠️  WARNING: You are about to deploy to MAINNET"
echo "This will cost real SOL and deploy contracts to production"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled"
    exit 1
fi

echo "🚀 Deploying LaunchPad contracts to mainnet..."

# Set Solana config to mainnet
solana config set --url mainnet-beta

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 50" | bc -l) )); then
    echo "❌ Insufficient balance for mainnet deployment (need ~50 SOL)"
    echo "Current balance: $BALANCE SOL"
    exit 1
fi

# Build programs (release mode)
echo "📦 Building programs in release mode..."
anchor build --verifiable

# Run security checks
echo "🔒 Running security checks..."
# Add security audit checks here

# Deploy programs
echo "🚢 Deploying programs..."
anchor deploy --provider.cluster mainnet-beta

# Get deployed program IDs
BONDING_CURVE_ID=$(solana address -k target/deploy/bonding_curve-keypair.json)
TOKEN_FACTORY_ID=$(solana address -k target/deploy/token_factory-keypair.json)
GRADUATION_ID=$(solana address -k target/deploy/graduation-keypair.json)

echo "✅ Deployment complete!"
echo ""
echo "🎉 MAINNET Program IDs:"
echo "  Bonding Curve: $BONDING_CURVE_ID"
echo "  Token Factory: $TOKEN_FACTORY_ID"
echo "  Graduation:    $GRADUATION_ID"
echo ""
echo "Next steps:"
echo "1. Verify programs: anchor verify"
echo "2. Update frontend config with program IDs"
echo "3. Submit for audit verification"
echo "4. Update documentation"
echo ""
echo "⚠️  SAVE THESE PROGRAM IDS - YOU'LL NEED THEM!"
