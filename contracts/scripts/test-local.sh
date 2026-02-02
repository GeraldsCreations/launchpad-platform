#!/bin/bash

# Run tests on local validator

set -e

echo "🧪 Running tests on local validator..."

# Kill any existing validator
pkill -f solana-test-validator || true

# Start local validator in background
echo "Starting local validator..."
solana-test-validator \
  --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s tests/fixtures/mpl_token_metadata.so \
  --reset \
  --quiet &

VALIDATOR_PID=$!

# Wait for validator to start
sleep 5

# Run tests
echo "Running Anchor tests..."
anchor test --skip-local-validator

# Cleanup
echo "Stopping validator..."
kill $VALIDATOR_PID || true

echo "✅ Tests complete!"
