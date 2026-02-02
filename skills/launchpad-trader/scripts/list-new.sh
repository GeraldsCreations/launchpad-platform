#!/bin/bash
# List new tokens on LaunchPad

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/api.sh"

#######################
# Usage
#######################

usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

List recently created tokens

OPTIONS:
    --limit N            Number of results (default: 10, max: 50)
    --creator-type TYPE  Filter by creator: human, bot, agent
    --json               Output JSON format
    --help               Show this help message

EXAMPLES:
    # Latest 10 tokens
    $(basename "$0")

    # Latest 20 tokens
    $(basename "$0") --limit 20

    # Only bot-created tokens
    $(basename "$0") --creator-type bot

ENVIRONMENT:
    LAUNCHPAD_API_URL       API endpoint

EOF
    exit 1
}

#######################
# Parse Arguments
#######################

LIMIT=10
CREATOR_TYPE=""
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        --creator-type)
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

if [[ -n "$CREATOR_TYPE" ]]; then
    if [[ ! "$CREATOR_TYPE" =~ ^(human|bot|agent|clawdbot)$ ]]; then
        log_error "Invalid creator type: $CREATOR_TYPE (must be human, bot, agent, or clawdbot)"
        exit $ERR_INVALID_PARAMS
    fi
fi

#######################
# Fetch New Tokens
#######################

log_debug "Fetching new tokens (limit: $LIMIT)..."

QUERY="limit=$LIMIT"
[[ -n "$CREATOR_TYPE" ]] && QUERY="$QUERY&creator_type=$CREATOR_TYPE"

RESPONSE=$(api_get "/tokens/new?$QUERY") || exit $?

# Check if empty
TOKEN_COUNT=$(echo "$RESPONSE" | jq -r '.tokens | length')

if [[ "$TOKEN_COUNT" == "0" ]]; then
    log_info "No new tokens found"
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
echo "🆕 New Tokens"
echo ""

# Display each token
echo "$RESPONSE" | jq -c '.tokens[]' | head -n "$LIMIT" | nl -w2 -s'. ' | while read -r num token_json; do
    # Parse token data
    NAME=$(echo "$token_json" | jq -r '.name')
    SYMBOL=$(echo "$token_json" | jq -r '.symbol')
    ADDRESS=$(echo "$token_json" | jq -r '.address')
    PRICE=$(echo "$token_json" | jq -r '.current_price')
    MCAP=$(echo "$token_json" | jq -r '.market_cap')
    CREATED_AT=$(echo "$token_json" | jq -r '.created_at')
    CREATOR_TYPE=$(echo "$token_json" | jq -r '.creator_type // "unknown"')
    DESCRIPTION=$(echo "$token_json" | jq -r '.description // ""')
    
    # Format creator type
    CREATOR_LABEL="Human"
    CREATOR_COLOR="$NC"
    case "$CREATOR_TYPE" in
        clawdbot)
            CREATOR_LABEL="ClawdBot"
            CREATOR_COLOR="$CYAN"
            ;;
        agent)
            CREATOR_LABEL="AI Agent"
            CREATOR_COLOR="$MAGENTA"
            ;;
        bot)
            CREATOR_LABEL="Bot"
            CREATOR_COLOR="$BLUE"
            ;;
    esac
    
    # Convert timestamp to "time ago"
    TIMESTAMP=$(date -d "$CREATED_AT" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "$CREATED_AT" +%s 2>/dev/null || echo "0")
    TIME_AGO=$(format_time_ago "$TIMESTAMP")
    
    echo -e "${num} ${YELLOW}${SYMBOL}${NC} - ${NAME} ${BLUE}($TIME_AGO)${NC}"
    echo -e "   Creator: ${CREATOR_COLOR}${CREATOR_LABEL}${NC}"
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

log_info "Buy tokens: launchpad buy <SYMBOL> <AMOUNT>"
echo ""
