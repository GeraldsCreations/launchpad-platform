#!/bin/bash

echo "🔍 Verifying Watchlist Feature Implementation..."
echo "=================================================="
echo ""

ERRORS=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        return 0
    else
        echo -e "${RED}✗${NC} File missing: $1"
        ((ERRORS++))
        return 1
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Content found in $1: $2"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Content not found in $1: $2"
        ((WARNINGS++))
        return 1
    fi
}

echo "📁 Checking File Structure..."
echo "------------------------------"

# Service
check_file "src/app/core/services/watchlist.service.ts"

# Button Component
check_file "src/app/shared/components/watchlist-button/watchlist-button.component.ts"
check_file "src/app/shared/components/watchlist-button/watchlist-button.component.html"
check_file "src/app/shared/components/watchlist-button/watchlist-button.component.scss"

# Watchlist Page
check_file "src/app/features/watchlist/watchlist.page.ts"
check_file "src/app/features/watchlist/watchlist.page.html"
check_file "src/app/features/watchlist/watchlist.page.scss"

# Routes
check_file "src/app/app.routes.ts"

# App navigation
check_file "src/app/app.ts"

echo ""
echo "🔎 Checking Service Implementation..."
echo "--------------------------------------"

if [ -f "src/app/core/services/watchlist.service.ts" ]; then
    check_content "src/app/core/services/watchlist.service.ts" "addToWatchlist"
    check_content "src/app/core/services/watchlist.service.ts" "removeFromWatchlist"
    check_content "src/app/core/services/watchlist.service.ts" "isInWatchlist"
    check_content "src/app/core/services/watchlist.service.ts" "getWatchlist"
    check_content "src/app/core/services/watchlist.service.ts" "BehaviorSubject"
    check_content "src/app/core/services/watchlist.service.ts" "localStorage"
    check_content "src/app/core/services/watchlist.service.ts" "MAX_TOKENS = 50"
fi

echo ""
echo "🔎 Checking Watchlist Button Component..."
echo "------------------------------------------"

if [ -f "src/app/shared/components/watchlist-button/watchlist-button.component.ts" ]; then
    check_content "src/app/shared/components/watchlist-button/watchlist-button.component.ts" "WatchlistService"
    check_content "src/app/shared/components/watchlist-button/watchlist-button.component.ts" "NotificationService"
    check_content "src/app/shared/components/watchlist-button/watchlist-button.component.ts" "@Input() tokenAddress"
    check_content "src/app/shared/components/watchlist-button/watchlist-button.component.ts" "toggleWatchlist"
    check_content "src/app/shared/components/watchlist-button/watchlist-button.component.ts" "starAnimation"
fi

echo ""
echo "🔎 Checking Watchlist Page Component..."
echo "----------------------------------------"

if [ -f "src/app/features/watchlist/watchlist.page.ts" ]; then
    check_content "src/app/features/watchlist/watchlist.page.ts" "WatchlistService"
    check_content "src/app/features/watchlist/watchlist.page.ts" "ApiService"
    check_content "src/app/features/watchlist/watchlist.page.ts" "WebSocketService"
    check_content "src/app/features/watchlist/watchlist.page.ts" "forkJoin"
    check_content "src/app/features/watchlist/watchlist.page.ts" "sortTokens"
fi

echo ""
echo "🔎 Checking Route Integration..."
echo "---------------------------------"

if [ -f "src/app/app.routes.ts" ]; then
    check_content "src/app/app.routes.ts" "WatchlistPage"
    check_content "src/app/app.routes.ts" "path: 'watchlist'"
fi

echo ""
echo "🔎 Checking Navigation Integration..."
echo "--------------------------------------"

if [ -f "src/app/app.ts" ]; then
    check_content "src/app/app.ts" "label: 'Watchlist'"
    check_content "src/app/app.ts" "routerLink: '/watchlist'"
fi

echo ""
echo "🔎 Checking Token Header Integration..."
echo "----------------------------------------"

if [ -f "src/app/features/token-detail/components/token-header.component.ts" ]; then
    check_content "src/app/features/token-detail/components/token-header.component.ts" "WatchlistButtonComponent"
    check_content "src/app/features/token-detail/components/token-header.component.ts" "app-watchlist-button"
fi

echo ""
echo "📊 Checking TypeScript Compilation..."
echo "--------------------------------------"

if command -v tsc &> /dev/null; then
    echo "Running TypeScript compiler check..."
    npx tsc --noEmit 2>&1 | head -20
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo -e "${GREEN}✓${NC} TypeScript compilation check passed"
    else
        echo -e "${RED}✗${NC} TypeScript compilation errors found"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} TypeScript compiler not found, skipping"
    ((WARNINGS++))
fi

echo ""
echo "=================================================="
echo "📋 VERIFICATION SUMMARY"
echo "=================================================="
echo -e "✅ Checks Passed: ${GREEN}$(($(grep -c "✓" <<< "$(cat $0)") - ERRORS - WARNINGS))${NC}"
echo -e "❌ Errors: ${RED}${ERRORS}${NC}"
echo -e "⚠️  Warnings: ${YELLOW}${WARNINGS}${NC}"
echo "=================================================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run dev server: ng serve"
    echo "2. Follow manual test guide: WATCHLIST_TEST_GUIDE.md"
    echo "3. Take screenshots"
    echo "4. Run production build: ng build --configuration production"
    echo "5. Commit when all tests pass"
    exit 0
else
    echo -e "${RED}⚠️  Critical errors found. Please review above.${NC}"
    exit 1
fi
