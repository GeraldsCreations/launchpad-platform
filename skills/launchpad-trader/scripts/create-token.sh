#!/bin/bash
# Create new token on LaunchPad

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/api.sh"

#######################
# Usage
#######################

usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

Create a new token on LaunchPad with bonding curve

OPTIONS:
    --name NAME              Token name (required)
    --symbol SYMBOL          Token symbol, 3-10 chars (required)
    --description DESC       Token description (optional)
    --image URL              Image URL (optional)
    --initial-buy AMOUNT     Initial SOL buy amount (optional, 0-10 SOL)
    --help                   Show this help message

EXAMPLES:
    # Basic token creation
    $(basename "$0") --name "Gereld Bot" --symbol "GERELD"

    # With description and image
    $(basename "$0") \\
        --name "Gereld Bot" \\
        --symbol "GERELD" \\
        --description "AI Company Manager" \\
        --image "https://example.com/gereld.png" \\
        --initial-buy 1.0

ENVIRONMENT:
    LAUNCHPAD_API_URL       API endpoint (default: https://api.launchpad.fun/v1)
    LAUNCHPAD_WALLET_PATH   Solana wallet path (required)
    LAUNCHPAD_AUTO_CONFIRM  Skip confirmations (default: false)

EOF
    exit 1
}

#######################
# Parse Arguments
#######################

NAME=""
SYMBOL=""
DESCRIPTION=""
IMAGE=""
INITIAL_BUY="0"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --name)
            NAME="$2"
            shift 2
            ;;
        --symbol)
            SYMBOL="$2"
            shift 2
            ;;
        --description)
            DESCRIPTION="$2"
            shift 2
            ;;
        --image)
            IMAGE="$2"
            shift 2
            ;;
        --initial-buy)
            INITIAL_BUY="$2"
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

if [[ -z "$NAME" ]]; then
    log_error "Token name is required"
    usage
fi

if [[ -z "$SYMBOL" ]]; then
    log_error "Token symbol is required"
    usage
fi

# Validate symbol length
if [[ ${#SYMBOL} -lt 3 || ${#SYMBOL} -gt 10 ]]; then
    log_error "Symbol must be 3-10 characters"
    exit $ERR_INVALID_PARAMS
fi

# Validate symbol format (alphanumeric, uppercase recommended)
if [[ ! "$SYMBOL" =~ ^[A-Z0-9]+$ ]]; then
    log_warning "Symbol should be uppercase alphanumeric characters"
fi

# Validate initial buy amount
if [[ -n "$INITIAL_BUY" ]]; then
    validate_sol_amount "$INITIAL_BUY" || exit $?
    
    if (( $(echo "$INITIAL_BUY > 10" | bc -l) )); then
        log_error "Initial buy amount cannot exceed 10 SOL"
        exit $ERR_INVALID_PARAMS
    fi
fi

#######################
# Check Wallet
#######################

WALLET_ADDRESS=$(get_wallet_address) || exit $?
log_info "Using wallet: $WALLET_ADDRESS"

# Check balance (need SOL for transaction + initial buy)
REQUIRED_SOL=$(echo "$INITIAL_BUY + 0.1" | bc -l)  # 0.1 SOL for fees
check_sol_balance "$REQUIRED_SOL" || exit $?

#######################
# Build Request
#######################

REQUEST=$(jq -n \
    --arg name "$NAME" \
    --arg symbol "$SYMBOL" \
    --arg description "$DESCRIPTION" \
    --arg image "$IMAGE" \
    --arg creator "$WALLET_ADDRESS" \
    --arg initial_buy "$INITIAL_BUY" \
    '{
        name: $name,
        symbol: $symbol,
        description: $description,
        image: $image,
        creator: $creator,
        initial_buy_sol: ($initial_buy | tonumber)
    } | with_entries(select(.value != "" and .value != null))'
)

#######################
# Display Summary
#######################

echo ""
log_info "Creating token on LaunchPad..."
echo ""
echo "Token Details:"
echo "  Name: $NAME"
echo "  Symbol: $SYMBOL"
[[ -n "$DESCRIPTION" ]] && echo "  Description: $DESCRIPTION"
[[ -n "$IMAGE" ]] && echo "  Image: $IMAGE"
echo "  Creator: $WALLET_ADDRESS"
echo ""
echo "Bonding Curve:"
echo "  Initial Price: 0.0001 SOL"
echo "  Max Supply: 1,000,000,000 tokens"
echo "  Graduation Threshold: \$69,000"
echo ""

if (( $(echo "$INITIAL_BUY > 0" | bc -l) )); then
    echo "Initial Buy:"
    echo "  Amount: $(format_sol "$INITIAL_BUY")"
    echo "  Estimated Tokens: ~$(format_number $(echo "$INITIAL_BUY / 0.0001" | bc -l | cut -d. -f1))"
    echo ""
fi

TOTAL_COST=$(echo "$INITIAL_BUY + 0.02" | bc -l)  # Add estimated tx fee
echo "Estimated Cost: $(format_sol "$TOTAL_COST")"
echo ""

#######################
# Confirm
#######################

confirm_action "Create token?" || exit 0

#######################
# Create Token
#######################

echo ""
log_info "Submitting transaction..."

RESPONSE=$(api_post "/tokens/create" "$REQUEST") || exit $?

# Parse response
TOKEN_ADDRESS=$(echo "$RESPONSE" | jq -r '.token_address')
CURVE_ADDRESS=$(echo "$RESPONSE" | jq -r '.bonding_curve')
TX_SIGNATURE=$(echo "$RESPONSE" | jq -r '.transaction')
INITIAL_PRICE=$(echo "$RESPONSE" | jq -r '.initial_price')
TOKEN_BALANCE=$(echo "$RESPONSE" | jq -r '.token_balance // 0')

if [[ -z "$TOKEN_ADDRESS" || "$TOKEN_ADDRESS" == "null" ]]; then
    log_error "Failed to create token"
    echo "$RESPONSE" | jq '.' >&2
    exit $ERR_API_RESPONSE
fi

#######################
# Display Result
#######################

echo ""
log_success "Token created successfully!"
echo ""
echo "Token Address: $TOKEN_ADDRESS"
echo "Symbol: $SYMBOL"
echo "Bonding Curve: $CURVE_ADDRESS"
echo "Initial Price: $(format_sol "$INITIAL_PRICE")"

if [[ "$TOKEN_BALANCE" != "0" && "$TOKEN_BALANCE" != "null" ]]; then
    echo "Your Balance: $(format_number "$TOKEN_BALANCE") $SYMBOL"
fi

echo ""
echo "Transaction: https://solscan.io/tx/$TX_SIGNATURE"
echo "View Token: https://launchpad.fun/token/$TOKEN_ADDRESS"
echo ""

log_info "Share your token on social media to attract buyers!"
echo ""
