#!/bin/bash
# List trending tokens on LaunchPad

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/api.sh"

#######################
# Usage
#######################

usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

List trending tokens by volume

OPTIONS:
    --limit N       Number of results (default: 10, max: 50)
    --period TIME   Time period: 1h, 24h, 7d (default: 24h)
    --json          Output JSON format
    --help          Show this help message

EXAMPLES:
    # Top 10 trending (24h)
    $(basename "$0")

    # Top 20 trending
    $(basename "$0") --limit 20

    # Trending in last hour
    $(basename "$0") --period 1h

ENVIRONMENT:
    LAUNCHPAD_API_URL       API endpoint

EOF
    exit 1
}

#######################
# Parse Arguments
#######################

LIMIT=10
PERIOD="24h"
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        --period)
            PERIOD="$2"
            shift 2
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

#######################
# Validate Arguments
#######################

if ! [[ "$LIMIT" =~ ^[0-9]+$ ]] || [[ $LIMIT -lt 1 ]] || [[ $LIMIT -gt 50 ]]; then
    log_error "Invalid limit: $LIMIT (must be 1-50)"
    exit $ERR_INVALID_PARAMS
fi

if [[ ! "$PERIOD" =~ ^(1h|24h|7d)$ ]]; then
    log_error "Invalid period: $PERIOD (must be 1h, 24h, or 7d)"
    exit $ERR_INVALID_PARAMS
fi

#######################
# Fetch Trending Tokens
#######################

log_debug "Fetching trending tokens (period: $PERIOD, limit: $LIMIT)..."

RESPONSE=$(api_get "/tokens/trending?limit=$LIMIT&period=$PERIOD") || exit $?

# Check if empty
TOKEN_COUNT=$(echo "$RESPONSE" | jq -r '.tokens | length')

if [[ "$TOKEN_COUNT" == "0" ]]; then
    log_info "No trending tokens found"
    exit 0
fi

#######################
# Output
#######################

if [[ "$JSON_OUTPUT" == "true" ]]; then
    echo "$RESPONSE" | jq '.'
    exit 0
fi

# Period label
PERIOD_LABEL="24h"
case "$PERIOD" in
    1h) PERIOD_LABEL="1 hour" ;;
    24h) PERIOD_LABEL="24 hours" ;;
    7d) PERIOD_LABEL="7 days" ;;
esac

echo ""
echo "🔥 Trending Tokens ($PERIOD_LABEL volume)"
echo ""

# Display each token
echo "$RESPONSE" | jq -c '.tokens[]' | head -n "$LIMIT" | nl -w2 -s'. ' | while read -r num token_json; do
    # Parse token data
    NAME=$(echo "$token_json" | jq -r '.name')
    SYMBOL=$(echo "$token_json" | jq -r '.symbol')
    ADDRESS=$(echo "$token_json" | jq -r '.address')
    PRICE=$(echo "$token_json" | jq -r '.current_price')
    MCAP=$(echo "$token_json" | jq -r '.market_cap')
    VOLUME=$(echo "$token_json" | jq -r '.volume')
    GRADUATED=$(echo "$token_json" | jq -r '.graduated')
    CREATOR_TYPE=$(echo "$token_json" | jq -r '.creator_type // "unknown"')
    
    # Format graduated badge
    GRAD_BADGE=""
    if [[ "$GRADUATED" == "true" ]]; then
        GRAD_BADGE=" ${GREEN}🎓 GRADUATED${NC}"
    fi
    
    # Format creator badge
    CREATOR_BADGE=""
    case "$CREATOR_TYPE" in
        clawdbot)
            CREATOR_BADGE=" ${CYAN}🤖 ClawdBot${NC}"
            ;;
        agent)
            CREATOR_BADGE=" ${MAGENTA}🤖 AI Agent${NC}"
            ;;
    esac
    
    echo -e "${num} ${YELLOW}${SYMBOL}${NC} - ${NAME}${GRAD_BADGE}${CREATOR_BADGE}"
    echo "   Price: $(format_sol "$PRICE") | MCap: $(format_usd "$MCAP") | Vol: $(format_sol "$VOLUME")"
    echo "   Address: $ADDRESS"
    echo ""
done

log_info "View token details: launchpad info <SYMBOL>"
echo ""
