#!/bin/bash
# Get detailed token information

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/api.sh"

#######################
# Usage
#######################

usage() {
    cat << EOF
Usage: $(basename "$0") <TOKEN> [OPTIONS]

Get detailed information about a token

ARGUMENTS:
    TOKEN           Token symbol or address

OPTIONS:
    --json          Output JSON format
    --holders       Show top holders
    --trades        Show recent trades
    --help          Show this help message

EXAMPLES:
    # By symbol
    $(basename "$0") GERELD

    # By address
    $(basename "$0") 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

    # With holders
    $(basename "$0") GERELD --holders

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

TOKEN="$1"
shift

JSON_OUTPUT=false
SHOW_HOLDERS=false
SHOW_TRADES=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --holders)
            SHOW_HOLDERS=true
            shift
            ;;
        --trades)
            SHOW_TRADES=true
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
# Resolve Token
#######################

log_info "Fetching token info..."
TOKEN_ADDRESS=$(resolve_token "$TOKEN") || exit $?

#######################
# Get Token Info
#######################

TOKEN_INFO=$(get_token_info "$TOKEN_ADDRESS") || exit $?

# Parse basic info
NAME=$(echo "$TOKEN_INFO" | jq -r '.name')
SYMBOL=$(echo "$TOKEN_INFO" | jq -r '.symbol')
DESCRIPTION=$(echo "$TOKEN_INFO" | jq -r '.description // ""')
IMAGE=$(echo "$TOKEN_INFO" | jq -r '.image_url // ""')
CREATOR=$(echo "$TOKEN_INFO" | jq -r '.creator')
CREATOR_TYPE=$(echo "$TOKEN_INFO" | jq -r '.creator_type // "unknown"')
BONDING_CURVE=$(echo "$TOKEN_INFO" | jq -r '.bonding_curve')
CURRENT_PRICE=$(echo "$TOKEN_INFO" | jq -r '.current_price')
MARKET_CAP=$(echo "$TOKEN_INFO" | jq -r '.market_cap')
TOTAL_SUPPLY=$(echo "$TOKEN_INFO" | jq -r '.total_supply')
HOLDER_COUNT=$(echo "$TOKEN_INFO" | jq -r '.holder_count // 0')
VOLUME_24H=$(echo "$TOKEN_INFO" | jq -r '.volume_24h // 0')
GRADUATED=$(echo "$TOKEN_INFO" | jq -r '.graduated')
GRADUATED_AT=$(echo "$TOKEN_INFO" | jq -r '.graduated_at // ""')
CREATED_AT=$(echo "$TOKEN_INFO" | jq -r '.created_at')
WEBSITE=$(echo "$TOKEN_INFO" | jq -r '.website // ""')
TWITTER=$(echo "$TOKEN_INFO" | jq -r '.twitter // ""')
TELEGRAM=$(echo "$TOKEN_INFO" | jq -r '.telegram // ""')

#######################
# Output JSON
#######################

if [[ "$JSON_OUTPUT" == "true" ]]; then
    echo "$TOKEN_INFO" | jq '.'
    exit 0
fi

#######################
# Format Creator Type
#######################

CREATOR_LABEL="Human"
CREATOR_COLOR="$NC"
case "$CREATOR_TYPE" in
    clawdbot)
        CREATOR_LABEL="ClawdBot Agent"
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

#######################
# Format Graduation Info
#######################

GRADUATION_INFO=""
if [[ "$GRADUATED" == "true" ]]; then
    GRADUATION_STATUS="${GREEN}✅ GRADUATED${NC}"
    if [[ -n "$GRADUATED_AT" ]]; then
        GRAD_TIMESTAMP=$(date -d "$GRADUATED_AT" +%s 2>/dev/null || echo "0")
        GRAD_TIME_AGO=$(format_time_ago "$GRAD_TIMESTAMP")
        GRADUATION_INFO="Graduated $GRAD_TIME_AGO to Raydium"
    else
        GRADUATION_INFO="Graduated to Raydium"
    fi
else
    GRADUATION_STATUS="${YELLOW}⏳ Bonding Curve${NC}"
    THRESHOLD=69000
    REMAINING=$(echo "$THRESHOLD - $MARKET_CAP" | bc -l)
    if (( $(echo "$REMAINING > 0" | bc -l) )); then
        GRADUATION_INFO="$(format_usd "$REMAINING") to graduation (\$69K threshold)"
    else
        GRADUATION_INFO="Ready for graduation!"
    fi
fi

#######################
# Calculate Supply %
#######################

MAX_SUPPLY=1000000000  # 1B default
SUPPLY_PCT=0
if [[ "$TOTAL_SUPPLY" != "null" && $TOTAL_SUPPLY -gt 0 ]]; then
    SUPPLY_PCT=$(echo "scale=2; $TOTAL_SUPPLY * 100 / $MAX_SUPPLY" | bc -l)
fi

#######################
# Format Created At
#######################

CREATED_TIMESTAMP=$(date -d "$CREATED_AT" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "$CREATED_AT" +%s 2>/dev/null || echo "0")
CREATED_TIME=$(format_time "$CREATED_TIMESTAMP")
CREATED_AGO=$(format_time_ago "$CREATED_TIMESTAMP")

#######################
# Display Token Info
#######################

echo ""
echo "📊 $SYMBOL - $NAME"
echo ""
echo "Address: $TOKEN_ADDRESS"
echo "Bonding Curve: $BONDING_CURVE"
echo ""
echo -e "Creator: ${CREATOR_COLOR}${CREATOR_LABEL}${NC}"
echo "  $CREATOR"
echo ""
echo "Created: $CREATED_TIME ($CREATED_AGO)"
echo ""
echo -e "Status: $GRADUATION_STATUS"
echo "  $GRADUATION_INFO"
echo ""
echo "Market Data:"
echo "  Price: $(format_sol "$CURRENT_PRICE")"
echo "  Market Cap: $(format_usd "$MARKET_CAP")"
echo "  24h Volume: $(format_sol "$VOLUME_24H")"
echo "  Holders: $(format_number "$HOLDER_COUNT")"
echo ""

if [[ "$TOTAL_SUPPLY" != "null" && $TOTAL_SUPPLY -gt 0 ]]; then
    echo "Supply:"
    echo "  Current: $(format_number "$TOTAL_SUPPLY") / $(format_number "$MAX_SUPPLY") (${SUPPLY_PCT}%)"
    echo ""
fi

if [[ -n "$DESCRIPTION" ]]; then
    echo "Description:"
    echo "  $DESCRIPTION"
    echo ""
fi

# Social links
if [[ -n "$WEBSITE" || -n "$TWITTER" || -n "$TELEGRAM" ]]; then
    echo "Links:"
    [[ -n "$WEBSITE" ]] && echo "  Website: $WEBSITE"
    [[ -n "$TWITTER" ]] && echo "  Twitter: $TWITTER"
    [[ -n "$TELEGRAM" ]] && echo "  Telegram: $TELEGRAM"
    echo ""
fi

#######################
# Show Top Holders
#######################

if [[ "$SHOW_HOLDERS" == "true" ]]; then
    log_info "Fetching top holders..."
    
    HOLDERS=$(api_get "/tokens/$TOKEN_ADDRESS/holders?limit=10") || {
        log_warning "Could not fetch holders"
        HOLDERS=""
    }
    
    if [[ -n "$HOLDERS" ]]; then
        HOLDER_COUNT=$(echo "$HOLDERS" | jq -r '.holders | length')
        
        if [[ $HOLDER_COUNT -gt 0 ]]; then
            echo "Top Holders:"
            echo "$HOLDERS" | jq -c '.holders[]' | head -n 10 | nl -w2 -s'. ' | while read -r num holder_json; do
                WALLET=$(echo "$holder_json" | jq -r '.wallet')
                BALANCE=$(echo "$holder_json" | jq -r '.balance')
                PERCENT=$(echo "$holder_json" | jq -r '.percent')
                
                # Shorten wallet address
                WALLET_SHORT="${WALLET:0:6}...${WALLET: -4}"
                
                echo "  $num $WALLET_SHORT - $(format_number "$BALANCE") ($(format_percent "$PERCENT"))"
            done
            echo ""
        fi
    fi
fi

#######################
# Show Recent Trades
#######################

if [[ "$SHOW_TRADES" == "true" ]]; then
    log_info "Fetching recent trades..."
    
    TRADES=$(api_get "/trade/history?token=$TOKEN_ADDRESS&limit=10") || {
        log_warning "Could not fetch trades"
        TRADES=""
    }
    
    if [[ -n "$TRADES" ]]; then
        TRADE_COUNT=$(echo "$TRADES" | jq -r '.trades | length')
        
        if [[ $TRADE_COUNT -gt 0 ]]; then
            echo "Recent Trades:"
            echo "$TRADES" | jq -c '.trades[]' | head -n 10 | while read -r trade_json; do
                SIDE=$(echo "$trade_json" | jq -r '.side')
                SOL_AMOUNT=$(echo "$trade_json" | jq -r '.amount_sol')
                TOKEN_AMOUNT=$(echo "$trade_json" | jq -r '.amount_tokens')
                TIMESTAMP=$(echo "$trade_json" | jq -r '.timestamp')
                
                # Format side with color
                if [[ "$SIDE" == "buy" ]]; then
                    SIDE_LABEL="${GREEN}BUY${NC}"
                else
                    SIDE_LABEL="${RED}SELL${NC}"
                fi
                
                # Format time
                TRADE_TS=$(date -d "$TIMESTAMP" +%s 2>/dev/null || echo "0")
                TRADE_AGO=$(format_time_ago "$TRADE_TS")
                
                echo -e "  $SIDE_LABEL $(format_number "$TOKEN_AMOUNT") $SYMBOL for $(format_sol "$SOL_AMOUNT") ($TRADE_AGO)"
            done
            echo ""
        fi
    fi
fi

#######################
# Action Hints
#######################

if [[ "$GRADUATED" == "false" ]]; then
    log_info "Trade this token:"
    echo "  launchpad buy $SYMBOL <AMOUNT>"
    echo "  launchpad sell $SYMBOL <AMOUNT>"
else
    log_info "Trade on Raydium:"
    echo "  https://raydium.io/swap/?inputCurrency=$TOKEN_ADDRESS"
fi

echo ""
echo "View on LaunchPad: https://launchpad.fun/token/$TOKEN_ADDRESS"
echo ""
