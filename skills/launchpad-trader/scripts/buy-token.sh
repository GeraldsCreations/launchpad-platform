#!/bin/bash
# Buy tokens from LaunchPad bonding curve

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/api.sh"

#######################
# Usage
#######################

usage() {
    cat << EOF
Usage: $(basename "$0") <TOKEN> <AMOUNT> [OPTIONS]

Buy tokens from bonding curve

ARGUMENTS:
    TOKEN           Token symbol or address
    AMOUNT          SOL amount to spend (or token amount with --tokens)

OPTIONS:
    --tokens        Specify token amount instead of SOL amount
    --slippage PCT  Max slippage tolerance (default: 5%)
    --max-price SOL Maximum price per token (safety check)
    --help          Show this help message

EXAMPLES:
    # Buy with 0.5 SOL
    $(basename "$0") GERELD 0.5

    # Buy specific token amount
    $(basename "$0") GERELD 50000 --tokens

    # Buy with slippage protection
    $(basename "$0") GERELD 1.0 --slippage 0.01 --max-price 0.00015

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

if [[ $# -lt 2 ]]; then
    usage
fi

TOKEN="$1"
AMOUNT="$2"
shift 2

USE_TOKEN_AMOUNT=false
SLIPPAGE="$SLIPPAGE"
MAX_PRICE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tokens)
            USE_TOKEN_AMOUNT=true
            shift
            ;;
        --slippage)
            SLIPPAGE="$2"
            shift 2
            ;;
        --max-price)
            MAX_PRICE="$2"
            shift 2
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

if [[ "$USE_TOKEN_AMOUNT" == "true" ]]; then
    validate_token_amount "$AMOUNT" || exit $?
else
    validate_sol_amount "$AMOUNT" || exit $?
fi

# Validate slippage
if ! [[ "$SLIPPAGE" =~ ^0?\.[0-9]+$ ]] || (( $(echo "$SLIPPAGE >= 1" | bc -l) )); then
    log_error "Invalid slippage: $SLIPPAGE (must be 0-1)"
    exit $ERR_INVALID_PARAMS
fi

# Validate max price
if [[ -n "$MAX_PRICE" ]]; then
    validate_sol_amount "$MAX_PRICE" || exit $?
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
# Get Quote
#######################

log_info "Getting quote..."

if [[ "$USE_TOKEN_AMOUNT" == "true" ]]; then
    QUOTE_REQUEST=$(jq -n \
        --arg token "$TOKEN_ADDRESS" \
        --arg amount "$AMOUNT" \
        '{
            token_address: $token,
            token_amount: ($amount | tonumber),
            side: "buy"
        }'
    )
else
    QUOTE_REQUEST=$(jq -n \
        --arg token "$TOKEN_ADDRESS" \
        --arg amount "$AMOUNT" \
        '{
            token_address: $token,
            sol_amount: ($amount | tonumber),
            side: "buy"
        }'
    )
fi

QUOTE=$(api_post "/trade/quote" "$QUOTE_REQUEST") || exit $?

# Parse quote
ESTIMATED_TOKENS=$(echo "$QUOTE" | jq -r '.token_amount')
ESTIMATED_SOL=$(echo "$QUOTE" | jq -r '.sol_amount')
PRICE_PER_TOKEN=$(echo "$QUOTE" | jq -r '.price_per_token')
FEE=$(echo "$QUOTE" | jq -r '.fee')
TOTAL_SOL=$(echo "$QUOTE" | jq -r '.total_sol')
PRICE_IMPACT=$(echo "$QUOTE" | jq -r '.price_impact')

#######################
# Safety Checks
#######################

# Check max price
if [[ -n "$MAX_PRICE" ]]; then
    if (( $(echo "$PRICE_PER_TOKEN > $MAX_PRICE" | bc -l) )); then
        log_error "Price per token exceeds maximum"
        log_info "Current: $(format_sol "$PRICE_PER_TOKEN")"
        log_info "Maximum: $(format_sol "$MAX_PRICE")"
        exit $ERR_INVALID_PARAMS
    fi
fi

# Check wallet balance
WALLET_ADDRESS=$(get_wallet_address) || exit $?
check_sol_balance "$TOTAL_SOL" || exit $?

#######################
# Display Summary
#######################

echo ""
log_info "Buying $TOKEN_SYMBOL ($TOKEN_NAME)"
echo ""
echo "Token: $TOKEN_SYMBOL"
echo "Current Price: $(format_sol "$CURRENT_PRICE")"
echo "Market Cap: $(format_usd "$MARKET_CAP")"
echo ""
echo "Your Purchase:"
echo "  Estimated Tokens: $(format_number "$ESTIMATED_TOKENS") $TOKEN_SYMBOL"
echo "  SOL Amount: $(format_sol "$ESTIMATED_SOL")"
echo "  Price per Token: $(format_sol "$PRICE_PER_TOKEN")"
echo "  Trading Fee (1%): $(format_sol "$FEE")"
echo "  Slippage Tolerance: $(format_percent "$SLIPPAGE")"
echo "  Price Impact: $(format_percent "$PRICE_IMPACT")"
echo ""
echo "Total Cost: $(format_sol "$TOTAL_SOL")"
echo ""

# Warn if high price impact
if (( $(echo "$PRICE_IMPACT > 0.05" | bc -l) )); then
    log_warning "High price impact (>5%)! Consider buying smaller amounts."
fi

#######################
# Confirm
#######################

confirm_action "Confirm purchase?" || exit 0

#######################
# Execute Trade
#######################

echo ""
log_info "Executing trade..."

TRADE_REQUEST=$(jq -n \
    --arg token "$TOKEN_ADDRESS" \
    --arg sol "$ESTIMATED_SOL" \
    --arg tokens "$ESTIMATED_TOKENS" \
    --arg wallet "$WALLET_ADDRESS" \
    --arg slippage "$SLIPPAGE" \
    '{
        token_address: $token,
        sol_amount: ($sol | tonumber),
        expected_tokens: ($tokens | tonumber),
        buyer: $wallet,
        slippage: ($slippage | tonumber)
    }'
)

TRADE_RESULT=$(api_post "/trade/buy" "$TRADE_REQUEST") || {
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
log_success "Purchase successful!"
echo ""
echo "Bought: $(format_number "$ACTUAL_TOKENS") $TOKEN_SYMBOL"
echo "Paid: $(format_sol "$ACTUAL_SOL")"
echo "New Price: $(format_sol "$NEW_PRICE")"
echo "Your Balance: $(format_number "$NEW_BALANCE") $TOKEN_SYMBOL"
echo ""
echo "Transaction: https://solscan.io/tx/$TX_SIGNATURE"
echo ""
