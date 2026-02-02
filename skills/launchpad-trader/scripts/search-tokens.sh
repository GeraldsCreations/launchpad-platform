#!/bin/bash
# Search tokens on LaunchPad

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/api.sh"

#######################
# Usage
#######################

usage() {
    cat << EOF
Usage: $(basename "$0") <QUERY> [OPTIONS]

Search for tokens by name, symbol, or keyword

ARGUMENTS:
    QUERY           Search query (name, symbol, or keyword)

OPTIONS:
    --limit N       Number of results (default: 10, max: 50)
    --min-mcap N    Minimum market cap in USD
    --max-mcap N    Maximum market cap in USD
    --graduated     Only graduated tokens (true/false)
    --creator TYPE  Filter by creator: human, bot, agent
    --json          Output JSON format
    --help          Show this help message

EXAMPLES:
    # Search by keyword
    $(basename "$0") "gereld"

    # Search with filters
    $(basename "$0") "bot" --min-mcap 10000 --graduated false

    # Search for AI tokens
    $(basename "$0") "AI" --creator bot --limit 20

ENVIRONMENT:
    LAUNCHPAD_API_URL       API endpoint

EOF
    exit 1
}

#######################
# Parse Arguments
#######################

if [[ $# -lt 1 ]]; then
    usage
fi

QUERY="$1"
shift

LIMIT=10
MIN_MCAP=""
MAX_MCAP=""
GRADUATED=""
CREATOR_TYPE=""
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        --min-mcap)
            MIN_MCAP="$2"
            shift 2
            ;;
        --max-mcap)
            MAX_MCAP="$2"
            shift 2
            ;;
        --graduated)
            GRADUATED="$2"
            shift 2
            ;;
        --creator)
            CREATOR_TYPE="$2"
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

if [[ -n "$GRADUATED" ]]; then
    if [[ ! "$GRADUATED" =~ ^(true|false)$ ]]; then
        log_error "Invalid graduated value: $GRADUATED (must be true or false)"
        exit $ERR_INVALID_PARAMS
    fi
fi

if [[ -n "$CREATOR_TYPE" ]]; then
    if [[ ! "$CREATOR_TYPE" =~ ^(human|bot|agent|clawdbot)$ ]]; then
        log_error "Invalid creator type: $CREATOR_TYPE"
        exit $ERR_INVALID_PARAMS
    fi
fi

#######################
# Build Query
#######################

# URL encode query
ENCODED_QUERY=$(echo "$QUERY" | jq -sRr @uri)

API_QUERY="q=$ENCODED_QUERY&limit=$LIMIT"
[[ -n "$MIN_MCAP" ]] && API_QUERY="$API_QUERY&min_mcap=$MIN_MCAP"
[[ -n "$MAX_MCAP" ]] && API_QUERY="$API_QUERY&max_mcap=$MAX_MCAP"
[[ -n "$GRADUATED" ]] && API_QUERY="$API_QUERY&graduated=$GRADUATED"
[[ -n "$CREATOR_TYPE" ]] && API_QUERY="$API_QUERY&creator_type=$CREATOR_TYPE"

#######################
# Search
#######################

log_debug "Searching for: $QUERY"

RESPONSE=$(api_get "/tokens/search?$API_QUERY") || exit $?

# Check if empty
TOKEN_COUNT=$(echo "$RESPONSE" | jq -r '.tokens | length')

if [[ "$TOKEN_COUNT" == "0" ]]; then
    log_info "No tokens found matching \"$QUERY\""
    echo ""
    exit 0
fi

#######################
# Output
#######################

if [[ "$JSON_OUTPUT" == "true" ]]; then
    echo "$RESPONSE" | jq '.'
    exit 0
fi

echo ""
echo "🔍 Search results for \"$QUERY\""
echo ""
echo "Found $TOKEN_COUNT token(s):"
echo ""

# Display each token
echo "$RESPONSE" | jq -c '.tokens[]' | nl -w2 -s'. ' | while read -r num token_json; do
    # Parse token data
    NAME=$(echo "$token_json" | jq -r '.name')
    SYMBOL=$(echo "$token_json" | jq -r '.symbol')
    ADDRESS=$(echo "$token_json" | jq -r '.address')
    PRICE=$(echo "$token_json" | jq -r '.current_price')
    MCAP=$(echo "$token_json" | jq -r '.market_cap')
    GRADUATED=$(echo "$token_json" | jq -r '.graduated')
    DESCRIPTION=$(echo "$token_json" | jq -r '.description // ""')
    
    # Format graduated badge
    GRAD_BADGE=""
    if [[ "$GRADUATED" == "true" ]]; then
        GRAD_BADGE=" ${GREEN}🎓 GRADUATED${NC}"
    fi
    
    echo -e "${num} ${YELLOW}${SYMBOL}${NC} - ${NAME}${GRAD_BADGE}"
    echo "   Price: $(format_sol "$PRICE") | MCap: $(format_usd "$MCAP")"
    
    if [[ -n "$DESCRIPTION" ]]; then
        # Truncate description to 80 chars
        DESC_SHORT=$(echo "$DESCRIPTION" | cut -c1-80)
        [[ ${#DESCRIPTION} -gt 80 ]] && DESC_SHORT="${DESC_SHORT}..."
        echo "   \"$DESC_SHORT\""
    fi
    
    echo "   Address: $ADDRESS"
    echo ""
done

log_info "Get details: launchpad info <SYMBOL>"
log_info "Buy token: launchpad buy <SYMBOL> <AMOUNT>"
echo ""
