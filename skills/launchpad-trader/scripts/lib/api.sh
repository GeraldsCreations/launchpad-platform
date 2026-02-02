#!/bin/bash
# LaunchPad API Integration Library
# Common functions for API calls, error handling, and response parsing

set -euo pipefail

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
CONFIG_FILE="${SKILL_DIR}/config/api.config.json"

# Default configuration
API_URL="${LAUNCHPAD_API_URL:-https://api.launchpad.fun/v1}"
API_KEY="${LAUNCHPAD_API_KEY:-}"
RPC_URL="${LAUNCHPAD_RPC_URL:-https://api.mainnet-beta.solana.com}"
WALLET_PATH="${LAUNCHPAD_WALLET_PATH:-$HOME/.config/solana/launchpad-bot.json}"
SLIPPAGE="${LAUNCHPAD_SLIPPAGE:-0.05}"
AUTO_CONFIRM="${LAUNCHPAD_AUTO_CONFIRM:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Error codes
ERR_API_CONNECTION=1
ERR_API_RESPONSE=2
ERR_INVALID_PARAMS=3
ERR_INSUFFICIENT_BALANCE=4
ERR_TRANSACTION_FAILED=5
ERR_WALLET_ERROR=6
ERR_NOT_FOUND=7

#######################
# Logging Functions
#######################

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1" >&2
}

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo -e "${MAGENTA}[DEBUG]${NC} $1" >&2
    fi
}

#######################
# HTTP Functions
#######################

# Make API request with retry logic
# Usage: api_request METHOD PATH [DATA]
api_request() {
    local method="$1"
    local path="$2"
    local data="${3:-}"
    local url="${API_URL}${path}"
    local max_retries=3
    local retry_delay=2
    local attempt=1

    log_debug "API Request: $method $url"
    [[ -n "$data" ]] && log_debug "Request body: $data"

    while [[ $attempt -le $max_retries ]]; do
        local response
        local http_code
        local temp_file=$(mktemp)

        # Build curl command
        local curl_cmd=(
            curl -s -w "\n%{http_code}"
            -X "$method"
            -H "Content-Type: application/json"
            -H "Accept: application/json"
        )

        # Add API key if configured
        [[ -n "$API_KEY" ]] && curl_cmd+=(-H "Authorization: Bearer $API_KEY")

        # Add data for POST/PUT/PATCH
        [[ -n "$data" ]] && curl_cmd+=(-d "$data")

        # Add URL
        curl_cmd+=("$url")

        # Execute request
        local output
        output=$("${curl_cmd[@]}" 2>"$temp_file")
        local curl_exit=$?

        # Parse response
        http_code=$(echo "$output" | tail -n1)
        response=$(echo "$output" | sed '$d')

        log_debug "HTTP Status: $http_code"
        log_debug "Response: $response"

        # Check for curl errors
        if [[ $curl_exit -ne 0 ]]; then
            local error_msg=$(cat "$temp_file")
            rm -f "$temp_file"
            
            if [[ $attempt -lt $max_retries ]]; then
                log_warning "Connection failed (attempt $attempt/$max_retries): $error_msg"
                log_info "Retrying in ${retry_delay}s..."
                sleep "$retry_delay"
                ((attempt++))
                ((retry_delay*=2))  # Exponential backoff
                continue
            else
                log_error "API connection failed after $max_retries attempts"
                return $ERR_API_CONNECTION
            fi
        fi

        rm -f "$temp_file"

        # Check HTTP status code
        case "$http_code" in
            200|201|202)
                echo "$response"
                return 0
                ;;
            400)
                local error_msg=$(echo "$response" | jq -r '.error // .message // "Bad request"')
                log_error "Invalid request: $error_msg"
                return $ERR_INVALID_PARAMS
                ;;
            404)
                local error_msg=$(echo "$response" | jq -r '.error // .message // "Not found"')
                log_error "Not found: $error_msg"
                return $ERR_NOT_FOUND
                ;;
            429)
                if [[ $attempt -lt $max_retries ]]; then
                    log_warning "Rate limited (attempt $attempt/$max_retries)"
                    log_info "Retrying in ${retry_delay}s..."
                    sleep "$retry_delay"
                    ((attempt++))
                    ((retry_delay*=2))
                    continue
                else
                    log_error "Rate limited after $max_retries attempts"
                    return $ERR_API_RESPONSE
                fi
                ;;
            500|502|503|504)
                if [[ $attempt -lt $max_retries ]]; then
                    log_warning "Server error $http_code (attempt $attempt/$max_retries)"
                    log_info "Retrying in ${retry_delay}s..."
                    sleep "$retry_delay"
                    ((attempt++))
                    ((retry_delay*=2))
                    continue
                else
                    log_error "Server error after $max_retries attempts"
                    return $ERR_API_RESPONSE
                fi
                ;;
            *)
                local error_msg=$(echo "$response" | jq -r '.error // .message // "Unknown error"')
                log_error "API error ($http_code): $error_msg"
                return $ERR_API_RESPONSE
                ;;
        esac
    done
}

# GET request
api_get() {
    api_request "GET" "$1"
}

# POST request
api_post() {
    local path="$1"
    local data="$2"
    api_request "POST" "$path" "$data"
}

# PUT request
api_put() {
    local path="$1"
    local data="$2"
    api_request "PUT" "$path" "$data"
}

#######################
# Wallet Functions
#######################

# Get wallet public key
get_wallet_address() {
    if [[ ! -f "$WALLET_PATH" ]]; then
        log_error "Wallet not found: $WALLET_PATH"
        return $ERR_WALLET_ERROR
    fi

    solana-keygen pubkey "$WALLET_PATH" 2>/dev/null || {
        log_error "Failed to read wallet"
        return $ERR_WALLET_ERROR
    }
}

# Get SOL balance
get_sol_balance() {
    local wallet="${1:-$(get_wallet_address)}"
    
    solana balance "$wallet" --url "$RPC_URL" 2>/dev/null | \
        awk '{print $1}' || {
        log_error "Failed to fetch SOL balance"
        return $ERR_WALLET_ERROR
    }
}

# Check if wallet has sufficient SOL
check_sol_balance() {
    local required_sol="$1"
    local current_balance=$(get_sol_balance)
    
    if (( $(echo "$current_balance < $required_sol" | bc -l) )); then
        log_error "Insufficient SOL balance"
        log_info "Required: ${required_sol} SOL"
        log_info "Available: ${current_balance} SOL"
        return $ERR_INSUFFICIENT_BALANCE
    fi
    
    return 0
}

#######################
# Formatting Functions
#######################

# Format number with thousand separators
format_number() {
    local num="$1"
    printf "%'d" "$num" 2>/dev/null || echo "$num"
}

# Format SOL amount
format_sol() {
    local amount="$1"
    printf "%.4f SOL" "$amount"
}

# Format USD amount
format_usd() {
    local amount="$1"
    printf "\$%'.2f" "$amount"
}

# Format percentage
format_percent() {
    local value="$1"
    printf "%.2f%%" "$(echo "$value * 100" | bc -l)"
}

# Format timestamp to human readable
format_time() {
    local timestamp="$1"
    date -d "@$timestamp" "+%Y-%m-%d %H:%M:%S UTC" 2>/dev/null || \
        date -r "$timestamp" "+%Y-%m-%d %H:%M:%S UTC" 2>/dev/null || \
        echo "$timestamp"
}

# Format time ago (relative)
format_time_ago() {
    local timestamp="$1"
    local now=$(date +%s)
    local diff=$((now - timestamp))
    
    if [[ $diff -lt 60 ]]; then
        echo "${diff} seconds ago"
    elif [[ $diff -lt 3600 ]]; then
        echo "$((diff / 60)) minutes ago"
    elif [[ $diff -lt 86400 ]]; then
        echo "$((diff / 3600)) hours ago"
    else
        echo "$((diff / 86400)) days ago"
    fi
}

#######################
# Confirmation Functions
#######################

# Ask for user confirmation
confirm_action() {
    local prompt="$1"
    local default="${2:-n}"  # Default to 'no'
    
    # Skip confirmation if auto-confirm enabled
    if [[ "$AUTO_CONFIRM" == "true" ]]; then
        log_debug "Auto-confirm enabled, proceeding..."
        return 0
    fi
    
    # Determine prompt suffix
    local suffix="[y/N]"
    [[ "$default" == "y" ]] && suffix="[Y/n]"
    
    # Ask user
    echo -en "${CYAN}${prompt} ${suffix}:${NC} "
    read -r response
    
    # Handle empty response (use default)
    [[ -z "$response" ]] && response="$default"
    
    # Check response
    case "$response" in
        [Yy]|[Yy][Ee][Ss])
            return 0
            ;;
        *)
            log_info "Action cancelled"
            return 1
            ;;
    esac
}

#######################
# Token Functions
#######################

# Resolve token symbol to address
resolve_token() {
    local token="$1"
    
    # If already an address (44 chars), return it
    if [[ ${#token} -eq 44 ]]; then
        echo "$token"
        return 0
    fi
    
    # Search by symbol
    local response=$(api_get "/tokens/search?q=$token" 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        log_error "Failed to resolve token: $token"
        return $ERR_NOT_FOUND
    fi
    
    # Extract first matching token address
    local address=$(echo "$response" | jq -r '.tokens[0].address // empty')
    
    if [[ -z "$address" ]]; then
        log_error "Token not found: $token"
        return $ERR_NOT_FOUND
    fi
    
    echo "$address"
    return 0
}

# Get token info
get_token_info() {
    local token="$1"
    local address=$(resolve_token "$token") || return $?
    
    api_get "/tokens/$address"
}

#######################
# Price Calculation Functions
#######################

# Calculate buy price with slippage
calculate_buy_price_with_slippage() {
    local base_price="$1"
    local slippage="${2:-$SLIPPAGE}"
    
    echo "$base_price * (1 + $slippage)" | bc -l
}

# Calculate sell price with slippage
calculate_sell_price_with_slippage() {
    local base_price="$1"
    local slippage="${2:-$SLIPPAGE}"
    
    echo "$base_price * (1 - $slippage)" | bc -l
}

# Calculate trading fee (1%)
calculate_fee() {
    local amount="$1"
    echo "$amount * 0.01" | bc -l
}

#######################
# Validation Functions
#######################

# Validate SOL amount
validate_sol_amount() {
    local amount="$1"
    
    # Check if numeric
    if ! [[ "$amount" =~ ^[0-9]+\.?[0-9]*$ ]]; then
        log_error "Invalid SOL amount: $amount"
        return $ERR_INVALID_PARAMS
    fi
    
    # Check if positive
    if (( $(echo "$amount <= 0" | bc -l) )); then
        log_error "SOL amount must be positive"
        return $ERR_INVALID_PARAMS
    fi
    
    return 0
}

# Validate token amount
validate_token_amount() {
    local amount="$1"
    
    # Check if numeric
    if ! [[ "$amount" =~ ^[0-9]+$ ]]; then
        log_error "Invalid token amount: $amount"
        return $ERR_INVALID_PARAMS
    fi
    
    # Check if positive
    if [[ $amount -le 0 ]]; then
        log_error "Token amount must be positive"
        return $ERR_INVALID_PARAMS
    fi
    
    return 0
}

#######################
# Export Functions
#######################

export -f log_info log_success log_warning log_error log_debug
export -f api_request api_get api_post api_put
export -f get_wallet_address get_sol_balance check_sol_balance
export -f format_number format_sol format_usd format_percent format_time format_time_ago
export -f confirm_action
export -f resolve_token get_token_info
export -f calculate_buy_price_with_slippage calculate_sell_price_with_slippage calculate_fee
export -f validate_sol_amount validate_token_amount
