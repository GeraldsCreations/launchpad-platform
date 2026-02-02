#!/bin/bash
# Sell tokens to LaunchPad bonding curve

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/api.sh"

#######################
# Usage
#######################

usage() {
    cat << EOF
Usage: $(basename "$0") <TOKEN> <AMOUNT> [OPTIONS]

Sell tokens to bonding curve

ARGUMENTS:
    TOKEN           Token symbol or address
    AMOUNT          Token amount to sell (or percentage like "25%")

OPTIONS:
    --all           Sell all holdings
    --slippage PCT  Max slippage tolerance (default: 5%)
    --min-price SOL Minimum price per token (safety check)
    --help          Show this help message

EXAMPLES:
    # Sell specific amount
    $(basename "$0") GERELD 50000

    # Sell all holdings
    $(basename "$0") GERELD --all

    # Sell percentage
    $(basename "$0") GERELD 25%

    # Sell with price protection
    $(basename "$0") GERELD 100000 --slippage 0.01 --min-price 0.0001

ENVIRONMENT:
    LAUNCHPAD_API_URL       API endpoint
    LAUNCHPAD_WALLET_PATH   Solana wallet path
    LAUNCHPAD_SLIPPAGE      Default slippage (default: 0.05)
    LAUNCHPAD_AUTO_CONFIRM  Skip confirmations (default: false)

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

AMOUNT=""
SELL_ALL=false
SLIPPAGE="$SLIPPAGE"
MIN_PRICE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --all)
            SELL_ALL=true
            shift
            ;;
        --slippage)
            SLIPPAGE="$2"
            shift 2
            ;;
        --min-price)
            MIN_PRICE="$2"
            shift 2
            ;;
        --help)
            usage
            ;;
        *)
            if [[ -z "$AMOUNT" ]]; then
                AMOUNT="$1"
                shift
            else
                log_error "Unknown option: $1"
                usage
            fi
            ;;
    esac
done

# Check that either AMOUNT or --all is specified
if [[ -z "$AMOUNT" && "$SELL_ALL" == "false" ]]; then
    log_error "Must specify amount or --all"
    usage
fi

#######################
# Validate Arguments
#######################

# Validate slippage
if ! [[ "$SLIPPAGE" =~ ^0?\.[0-9]+$ ]] || (( $(echo "$SLIPPAGE >= 1" | bc -l) )); then
    log_error "Invalid slippage: $SLIPPAGE (must be 0-1)"
    exit $ERR_INVALID_PARAMS
fi

# Validate min price
if [[ -n "$MIN_PRICE" ]]; then
    validate_sol_amount "$MIN_PRICE" || exit $?
fi

#######################
# Resolve Token
#######################

log_info "Resolving token: $TOKEN"
TOKEN_ADDRESS=$(resolve_token "$TOKEN") || exit $?

#######################
# Get Token Info
#######################

log_info "Fetching token info..."
TOKEN_INFO=$(get_token_info "$TOKEN_ADDRESS") || exit $?

TOKEN_NAME=$(echo "$TOKEN_INFO" | jq -r '.name')
TOKEN_SYMBOL=$(echo "$TOKEN_INFO" | jq -r '.symbol')
CURRENT_PRICE=$(echo "$TOKEN_INFO" | jq -r '.current_price')
MARKET_CAP=$(echo "$TOKEN_INFO" | jq -r '.market_cap')
GRADUATED=$(echo "$TOKEN_INFO" | jq -r '.graduated')

if [[ "$GRADUATED" == "true" ]]; then
    log_error "Token has graduated to Raydium"
    log_info "Trade on: https://raydium.io/swap/?inputCurrency=$TOKEN_ADDRESS"
    exit $ERR_INVALID_PARAMS
fi

#######################
# Get User Balance
#######################

WALLET_ADDRESS=$(get_wallet_address) || exit $?

log_info "Checking balance..."
BALANCE_INFO=$(api_get "/user/balance?token=$TOKEN_ADDRESS&wallet=$WALLET_ADDRESS") || exit $?
USER_BALANCE=$(echo "$BALANCE_INFO" | jq -r '.balance')

if [[ "$USER_BALANCE" == "0" || "$USER_BALANCE" == "null" ]]; then
    log_error "You don't own any $TOKEN_SYMBOL tokens"
    exit $ERR_INVALID_PARAMS
fi

#######################
# Calculate Sell Amount
#######################

if [[ "$SELL_ALL" == "true" ]]; then
    SELL_AMOUNT="$USER_BALANCE"
    log_info "Selling all holdings: $(format_number "$SELL_AMOUNT") $TOKEN_SYMBOL"
elif [[ "$AMOUNT" =~ ^([0-9]+)%$ ]]; then
    # Percentage
    PERCENTAGE="${BASH_REMATCH[1]}"
    SELL_AMOUNT=$(echo "$USER_BALANCE * $PERCENTAGE / 100" | bc -l | cut -d. -f1)
    log_info "Selling ${PERCENTAGE}%: $(format_number "$SELL_AMOUNT") $TOKEN_SYMBOL"
else
    # Specific amount
    SELL_AMOUNT="$AMOUNT"
    validate_token_amount "$SELL_AMOUNT" || exit $?
fi

# Check sufficient balance
if [[ $SELL_AMOUNT -gt $USER_BALANCE ]]; then
    log_error "Insufficient balance"
    log_info "Trying to sell: $(format_number "$SELL_AMOUNT") $TOKEN_SYMBOL"
    log_info "Available: $(format_number "$USER_BALANCE") $TOKEN_SYMBOL"
    exit $ERR_INSUFFICIENT_BALANCE
fi

#######################
# Get Quote
#######################

log_info "Getting quote..."

QUOTE_REQUEST=$(jq -n \
    --arg token "$TOKEN_ADDRESS" \
    --arg amount "$SELL_AMOUNT" \
    '{
        token_address: $token,
        token_amount: ($amount | tonumber),
        side: "sell"
    }'
)

QUOTE=$(api_post "/trade/quote" "$QUOTE_REQUEST") || exit $?

# Parse quote
ESTIMATED_SOL=$(echo "$QUOTE" | jq -r '.sol_amount')
PRICE_PER_TOKEN=$(echo "$QUOTE" | jq -r '.price_per_token')
FEE=$(echo "$QUOTE" | jq -r '.fee')
TOTAL_SOL=$(echo "$QUOTE" | jq -r '.total_sol')
PRICE_IMPACT=$(echo "$QUOTE" | jq -r '.price_impact')

#######################
# Safety Checks
#######################

# Check min price
if [[ -n "$MIN_PRICE" ]]; then
    if (( $(echo "$PRICE_PER_TOKEN < $MIN_PRICE" | bc -l) )); then
        log_error "Price per token below minimum"
        log_info "Current: $(format_sol "$PRICE_PER_TOKEN")"
        log_info "Minimum: $(format_sol "$MIN_PRICE")"
        exit $ERR_INVALID_PARAMS
    fi
fi

#######################
# Display Summary
#######################

echo ""
log_info "Selling $TOKEN_SYMBOL ($TOKEN_NAME)"
echo ""
echo "Token: $TOKEN_SYMBOL"
echo "Current Price: $(format_sol "$CURRENT_PRICE")"
echo "Market Cap: $(format_usd "$MARKET_CAP")"
echo ""
echo "Your Sale:"
echo "  Selling: $(format_number "$SELL_AMOUNT") $TOKEN_SYMBOL"
echo "  Estimated SOL: $(format_sol "$ESTIMATED_SOL")"
echo "  Price per Token: $(format_sol "$PRICE_PER_TOKEN")"
echo "  Trading Fee (1%): $(format_sol "$FEE")"
echo "  Slippage Tolerance: $(format_percent "$SLIPPAGE")"
echo "  Price Impact: $(format_percent "$PRICE_IMPACT")"
echo ""
echo "Total Received: $(format_sol "$TOTAL_SOL")"
echo ""
echo "Remaining Balance: $(format_number $((USER_BALANCE - SELL_AMOUNT))) $TOKEN_SYMBOL"
echo ""

# Warn if high price impact
if (( $(echo "$PRICE_IMPACT > 0.05" | bc -l) )); then
    log_warning "High price impact (>5%)! Consider selling smaller amounts."
fi

#######################
# Confirm
#######################

confirm_action "Confirm sale?" || exit 0

#######################
# Execute Trade
#######################

echo ""
log_info "Executing trade..."

TRADE_REQUEST=$(jq -n \
    --arg token "$TOKEN_ADDRESS" \
    --arg tokens "$SELL_AMOUNT" \
    --arg sol "$ESTIMATED_SOL" \
    --arg wallet "$WALLET_ADDRESS" \
    --arg slippage "$SLIPPAGE" \
    '{
        token_address: $token,
        token_amount: ($tokens | tonumber),
        expected_sol: ($sol | tonumber),
        seller: $wallet,
        slippage: ($slippage | tonumber)
    }'
)

TRADE_RESULT=$(api_post "/trade/sell" "$TRADE_REQUEST") || {
    log_error "Trade failed"
    exit $ERR_TRANSACTION_FAILED
}

# Parse result
ACTUAL_TOKENS=$(echo "$TRADE_RESULT" | jq -r '.token_amount')
ACTUAL_SOL=$(echo "$TRADE_RESULT" | jq -r '.sol_amount')
TX_SIGNATURE=$(echo "$TRADE_RESULT" | jq -r '.transaction')
NEW_BALANCE=$(echo "$TRADE_RESULT" | jq -r '.new_balance')
NEW_PRICE=$(echo "$TRADE_RESULT" | jq -r '.new_price')

#######################
# Display Result
#######################

echo ""
log_success "Sale successful!"
echo ""
echo "Sold: $(format_number "$ACTUAL_TOKENS") $TOKEN_SYMBOL"
echo "Received: $(format_sol "$ACTUAL_SOL")"
echo "New Price: $(format_sol "$NEW_PRICE")"
echo "Your Balance: $(format_number "$NEW_BALANCE") $TOKEN_SYMBOL"
echo ""
echo "Transaction: https://solscan.io/tx/$TX_SIGNATURE"
echo ""
