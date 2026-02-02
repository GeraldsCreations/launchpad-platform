#!/bin/bash
# Test script to verify LaunchPad Trader Skill installation

set -euo pipefail

echo "🧪 LaunchPad Trader Skill - Installation Test"
echo "=============================================="
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

check_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# 1. Check file structure
echo "1. Checking file structure..."
FILES=(
    "README.md"
    "SKILL.md"
    "launchpad"
    "scripts/create-token.sh"
    "scripts/buy-token.sh"
    "scripts/sell-token.sh"
    "scripts/get-balance.sh"
    "scripts/list-trending.sh"
    "scripts/list-new.sh"
    "scripts/search-tokens.sh"
    "scripts/get-token-info.sh"
    "scripts/lib/api.sh"
    "config/api.config.json"
    "config/wallet.example.json"
)

for file in "${FILES[@]}"; do
    if [[ -f "$file" ]]; then
        check_pass "$file exists"
    else
        check_fail "$file missing"
    fi
done
echo ""

# 2. Check script permissions
echo "2. Checking script permissions..."
SCRIPTS=(
    "launchpad"
    "scripts/create-token.sh"
    "scripts/buy-token.sh"
    "scripts/sell-token.sh"
    "scripts/get-balance.sh"
    "scripts/list-trending.sh"
    "scripts/list-new.sh"
    "scripts/search-tokens.sh"
    "scripts/get-token-info.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [[ -x "$script" ]]; then
        check_pass "$script is executable"
    else
        check_fail "$script not executable (run: chmod +x $script)"
    fi
done
echo ""

# 3. Check dependencies
echo "3. Checking dependencies..."
DEPS=("jq" "curl" "bc")

for dep in "${DEPS[@]}"; do
    if command -v "$dep" &> /dev/null; then
        VERSION=$(command -v "$dep" | xargs ls -l)
        check_pass "$dep installed"
    else
        check_fail "$dep not installed (run: sudo apt-get install $dep)"
    fi
done

# Check Solana CLI
if command -v solana-keygen &> /dev/null; then
    SOLANA_VERSION=$(solana --version 2>/dev/null | head -n1)
    check_pass "Solana CLI installed ($SOLANA_VERSION)"
else
    check_warn "Solana CLI not installed (needed for trading)"
    check_info "Install: sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
fi
echo ""

# 4. Check environment variables
echo "4. Checking environment variables..."

if [[ -n "${LAUNCHPAD_API_URL:-}" ]]; then
    check_pass "LAUNCHPAD_API_URL set: $LAUNCHPAD_API_URL"
else
    check_warn "LAUNCHPAD_API_URL not set (will use default)"
    check_info "export LAUNCHPAD_API_URL=\"https://api.launchpad.fun/v1\""
fi

if [[ -n "${LAUNCHPAD_WALLET_PATH:-}" ]]; then
    check_pass "LAUNCHPAD_WALLET_PATH set: $LAUNCHPAD_WALLET_PATH"
    
    if [[ -f "$LAUNCHPAD_WALLET_PATH" ]]; then
        check_pass "Wallet file exists"
    else
        check_warn "Wallet file not found at $LAUNCHPAD_WALLET_PATH"
    fi
else
    check_warn "LAUNCHPAD_WALLET_PATH not set (needed for trading)"
    check_info "Create wallet: solana-keygen new --outfile ~/.config/solana/launchpad-bot.json"
    check_info "export LAUNCHPAD_WALLET_PATH=\"~/.config/solana/launchpad-bot.json\""
fi

if [[ -n "${LAUNCHPAD_SLIPPAGE:-}" ]]; then
    check_pass "LAUNCHPAD_SLIPPAGE set: $LAUNCHPAD_SLIPPAGE"
else
    check_info "LAUNCHPAD_SLIPPAGE not set (will use default: 0.05)"
fi
echo ""

# 5. Test API connectivity (if curl available)
echo "5. Testing API connectivity..."
if command -v curl &> /dev/null; then
    API_URL="${LAUNCHPAD_API_URL:-https://api.launchpad.fun/v1}"
    
    # Test connection (with timeout)
    if curl -s --max-time 5 "${API_URL}/tokens/trending?limit=1" > /dev/null 2>&1; then
        check_pass "API endpoint reachable: $API_URL"
    else
        check_warn "API endpoint not reachable (may be offline or wrong URL)"
        check_info "This is normal if backend isn't deployed yet"
    fi
else
    check_warn "curl not available, skipping API test"
fi
echo ""

# 6. Test main command
echo "6. Testing main command..."
if ./launchpad version &> /dev/null; then
    VERSION=$(./launchpad version)
    check_pass "Main command works: $VERSION"
else
    check_fail "Main command failed"
fi
echo ""

# Summary
echo "=============================================="
echo "Test Summary:"
echo ""

if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "🎉 LaunchPad Trader Skill is ready to use!"
    echo ""
    echo "Next steps:"
    echo "1. Fund your wallet with SOL"
    echo "2. Try: ./launchpad trending"
    echo "3. Read SKILL.md for full documentation"
elif [[ $ERRORS -eq 0 ]]; then
    echo -e "${YELLOW}⚠ Tests passed with $WARNINGS warning(s)${NC}"
    echo ""
    echo "The skill should work, but check warnings above."
else
    echo -e "${RED}✗ Tests failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before using the skill."
    exit 1
fi
echo ""
