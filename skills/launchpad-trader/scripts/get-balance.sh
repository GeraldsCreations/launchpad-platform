#!/bin/bash
# Get token balances and portfolio

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/api.sh"

#######################
# Usage
#######################

usage() {
    cat << EOF
Usage: $(basename "$0") [TOKEN] [OPTIONS]

View your token holdings and SOL balance

ARGUMENTS:
    TOKEN           Specific token to check (optional)

OPTIONS:
    --usd           Show values in USD
    --simple        Simple output format
    --help          Show this help message

EXAMPLES:
    # All holdings
    $(basename "$0")

    # Specific token
    $(basename "$0") GERELD

    # Portfolio value in USD
    $(basename "$0") --usd

ENVIRONMENT:
    LAUNCHPAD_API_URL       API endpoint
    LAUNCHPAD_WALLET_PATH   Solana wallet path

EOF
    exit 1
}

#######################
# Parse Arguments
#######################

TOKEN=""
SHOW_USD=false
SIMPLE=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --usd)
            SHOW_USD=true
            shift
            ;;
        --simple)
            SIMPLE=true
            shift
            ;;
        --help)
            usage
            ;;
        *)
            if [[ -z "$TOKEN" ]]; then
                TOKEN="$1"
                shift
            else
                log_error "Unknown option: $1"
                usage
            fi
            ;;
    esac
done

#######################
# Get Wallet
#######################

WALLET_ADDRESS=$(get_wallet_address) || exit $?

#######################
# Get SOL Balance
#######################

SOL_BALANCE=$(get_sol_balance "$WALLET_ADDRESS") || exit $?

# Get SOL price (optional)
SOL_PRICE=200  # Default placeholder
if [[ "$SHOW_USD" == "true" ]]; then
    SOL_PRICE_RESULT=$(curl -s "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd" 2>/dev/null) || true
    if [[ -n "$SOL_PRICE_RESULT" ]]; then
        SOL_PRICE=$(echo "$SOL_PRICE_RESULT" | jq -r '.solana.usd // 200')
    fi
fi

SOL_VALUE_USD=$(echo "$SOL_BALANCE * $SOL_PRICE" | bc -l)

#######################
# Single Token Balance
#######################

if [[ -n "$TOKEN" ]]; then
    log_info "Fetching balance for $TOKEN..."
    
    TOKEN_ADDRESS=$(resolve_token "$TOKEN") || exit $?
    TOKEN_INFO=$(get_token_info "$TOKEN_ADDRESS") || exit $?
    
    TOKEN_SYMBOL=$(echo "$TOKEN_INFO" | jq -r '.symbol')
    TOKEN_NAME=$(echo "$TOKEN_INFO" | jq -r '.name')
    CURRENT_PRICE=$(echo "$TOKEN_INFO" | jq -r '.current_price')
    
    BALANCE_INFO=$(api_get "/user/balance?token=$TOKEN_ADDRESS&wallet=$WALLET_ADDRESS") || exit $?
    TOKEN_BALANCE=$(echo "$BALANCE_INFO" | jq -r '.balance // 0')
    
    if [[ "$SIMPLE" == "true" ]]; then
        echo "$TOKEN_BALANCE"
        exit 0
    fi
    
    VALUE_SOL=$(echo "$TOKEN_BALANCE * $CURRENT_PRICE" | bc -l)
    VALUE_USD=$(echo "$VALUE_SOL * $SOL_PRICE" | bc -l)
    
    echo ""
    echo "💼 $TOKEN_SYMBOL Balance"
    echo ""
    echo "Token: $TOKEN_NAME ($TOKEN_SYMBOL)"
    echo "Address: $TOKEN_ADDRESS"
    echo ""
    echo "Balance: $(format_number "$TOKEN_BALANCE") $TOKEN_SYMBOL"
    echo "Price: $(format_sol "$CURRENT_PRICE")"
    echo "Value: $(format_sol "$VALUE_SOL")"
    [[ "$SHOW_USD" == "true" ]] && echo "Value (USD): $(format_usd "$VALUE_USD")"
    echo ""
    
    exit 0
fi

#######################
# Full Portfolio
#######################

log_info "Fetching portfolio..."

PORTFOLIO=$(api_get "/user/portfolio?wallet=$WALLET_ADDRESS") || exit $?

TOKEN_COUNT=$(echo "$PORTFOLIO" | jq -r '.tokens | length')

if [[ "$SIMPLE" == "true" ]]; then
    echo "SOL: $SOL_BALANCE"
    echo "$PORTFOLIO" | jq -r '.tokens[] | "\(.symbol): \(.balance)"'
    exit 0
fi

#######################
# Display Portfolio
#######################

echo ""
echo "💼 Your Portfolio"
echo ""
echo "Wallet: $WALLET_ADDRESS"
echo ""
echo "SOL Balance: $(format_sol "$SOL_BALANCE")"
[[ "$SHOW_USD" == "true" ]] && echo "SOL Value: $(format_usd "$SOL_VALUE_USD")"
echo ""

if [[ "$TOKEN_COUNT" == "0" ]]; then
    echo "No token holdings found."
    echo ""
    exit 0
fi

echo "Token Holdings:"
echo "┌─────────────┬──────────────┬────────────────┬────────────┬─────────────┐"
echo "│ Symbol      │ Balance      │ Current Price  │ Value (SOL)│ PnL         │"
echo "├─────────────┼──────────────┼────────────────┼────────────┼─────────────┤"

TOTAL_VALUE=0
TOTAL_COST=0

echo "$PORTFOLIO" | jq -c '.tokens[]' | while read -r token; do
    SYMBOL=$(echo "$token" | jq -r '.symbol')
    BALANCE=$(echo "$token" | jq -r '.balance')
    PRICE=$(echo "$token" | jq -r '.current_price')
    COST_BASIS=$(echo "$token" | jq -r '.cost_basis // 0')
    
    VALUE=$(echo "$BALANCE * $PRICE" | bc -l)
    COST=$(echo "$BALANCE * $COST_BASIS" | bc -l)
    PNL=$(echo "$VALUE - $COST" | bc -l)
    
    # Format PnL with color
    PNL_FORMATTED=$(format_sol "$PNL")
    if (( $(echo "$PNL > 0" | bc -l) )); then
        PNL_FORMATTED="${GREEN}+${PNL_FORMATTED}${NC}"
    elif (( $(echo "$PNL < 0" | bc -l) )); then
        PNL_FORMATTED="${RED}${PNL_FORMATTED}${NC}"
    fi
    
    printf "│ %-11s │ %12s │ %14s │ %10s │ %11s │\n" \
        "$SYMBOL" \
        "$(format_number "$BALANCE")" \
        "$(format_sol "$PRICE")" \
        "$(printf "%.2f" "$VALUE")" \
        "$PNL_FORMATTED"
    
    TOTAL_VALUE=$(echo "$TOTAL_VALUE + $VALUE" | bc -l)
    TOTAL_COST=$(echo "$TOTAL_COST + $COST" | bc -l)
done

echo "└─────────────┴──────────────┴────────────────┴────────────┴─────────────┘"
echo ""

TOTAL_PNL=$(echo "$TOTAL_VALUE - $TOTAL_COST" | bc -l)
TOTAL_PNL_PCT=0
if (( $(echo "$TOTAL_COST > 0" | bc -l) )); then
    TOTAL_PNL_PCT=$(echo "($TOTAL_VALUE - $TOTAL_COST) / $TOTAL_COST" | bc -l)
fi

echo "Total Token Value: $(format_sol "$TOTAL_VALUE")"
[[ "$SHOW_USD" == "true" ]] && echo "Total Value (USD): $(format_usd $(echo "$TOTAL_VALUE * $SOL_PRICE" | bc -l))"

if (( $(echo "$TOTAL_COST > 0" | bc -l) )); then
    PNL_COLOR="$NC"
    PNL_SIGN=""
    if (( $(echo "$TOTAL_PNL > 0" | bc -l) )); then
        PNL_COLOR="$GREEN"
        PNL_SIGN="+"
    elif (( $(echo "$TOTAL_PNL < 0" | bc -l) )); then
        PNL_COLOR="$RED"
    fi
    
    echo -e "Total PnL: ${PNL_COLOR}${PNL_SIGN}$(format_sol "$TOTAL_PNL") ($(format_percent "$TOTAL_PNL_PCT"))${NC}"
fi

GRAND_TOTAL=$(echo "$SOL_BALANCE + $TOTAL_VALUE" | bc -l)
echo ""
echo "Portfolio Value: $(format_sol "$GRAND_TOTAL")"
[[ "$SHOW_USD" == "true" ]] && echo "Portfolio Value (USD): $(format_usd $(echo "$GRAND_TOTAL * $SOL_PRICE" | bc -l))"
echo ""
