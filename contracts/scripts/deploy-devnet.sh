#!/bin/bash

# Deploy smart contracts to Solana devnet

set -e

echo "🚀 Deploying LaunchPad contracts to devnet..."

# Set Solana config to devnet
solana config set --url devnet

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 10" | bc -l) )); then
    echo "⚠️  Low balance. Requesting airdrop..."
    solana airdrop 5
    sleep 5
fi

# Build programs
echo "📦 Building programs..."
anchor build

# Deploy programs
echo "🚢 Deploying programs..."
anchor deploy --provider.cluster devnet

# Get deployed program IDs
BONDING_CURVE_ID=$(solana address -k target/deploy/bonding_curve-keypair.json)
TOKEN_FACTORY_ID=$(solana address -k target/deploy/token_factory-keypair.json)
GRADUATION_ID=$(solana address -k target/deploy/graduation-keypair.json)

echo "✅ Deployment complete!"
echo ""
echo "Program IDs:"
echo "  Bonding Curve: $BONDING_CURVE_ID"
echo "  Token Factory: $TOKEN_FACTORY_ID"
echo "  Graduation:    $GRADUATION_ID"
echo ""
echo "Update Anchor.toml with these addresses and run:"
echo "  anchor deploy --provider.cluster devnet"
echo ""
echo "Verify deployment:"
echo "  solana program show $BONDING_CURVE_ID --url devnet"
