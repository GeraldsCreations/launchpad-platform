#!/bin/bash
# Quick DBC endpoint tests

API="http://localhost:3000/v1"

echo ""
echo "🧪 QUICK DBC ENDPOINT TESTS"
echo "============================"
echo ""

# Test 1: Service Status
echo "1️⃣  Testing /dbc/status..."
curl -s "$API/dbc/status" | jq .
echo ""

# Test 2: Health check (should 404 - we don't have this endpoint)
echo "2️⃣  Testing /dbc/health (should 404)..."
curl -s "$API/dbc/health" | jq .
echo ""

echo "✅ Quick tests complete!"
echo ""
echo "Run full integration test:"
echo "  cd backend && npx ts-node scripts/test-dbc-full.ts"
echo ""
