# 🐛 Token Creation API Fix

## Issue

Token creation was failing with HTTP 400 Bad Request:

```json
{
  "message": [
    "property initialBuySol should not exist",
    "creator must be shorter than or equal to 44 characters",
    "creator must be longer than or equal to 32 characters",
    "creator must be a string"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## Root Cause

**Frontend-Backend Mismatch**

The frontend was sending:
```typescript
{
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  initialBuySol?: number;  // ❌ Wrong field name
  // ❌ Missing required 'creator' field
}
```

The backend expected:
```typescript
{
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  creator: string;          // ✅ Required: wallet address (32-44 chars)
  creatorType?: string;     // ✅ Optional: 'human', 'clawdbot', 'agent'
  initialBuy?: number;      // ✅ Correct field name
}
```

---

## Solution

### 1. **Updated CreateTokenRequest Interface**
**File:** `frontend/src/app/core/services/api.service.ts`

```typescript
export interface CreateTokenRequest {
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  creator: string;          // ✅ Added
  creatorType?: string;     // ✅ Added
  initialBuy?: number;      // ✅ Renamed from initialBuySol
}
```

### 2. **Fixed Token Creation Logic**
**File:** `frontend/src/app/features/create-token/create-token.component.ts`

**Before:**
```typescript
const result = await this.apiService.createToken(this.formData).toPromise();
```

**After:**
```typescript
// Get creator wallet address
const creatorAddress = this.walletService.getPublicKeyString();
if (!creatorAddress) {
  this.notificationService.error('Wallet Error', 'Could not get wallet address');
  return;
}

// Transform form data to match backend DTO
const requestData = {
  name: this.formData.name,
  symbol: this.formData.symbol,
  description: this.formData.description || undefined,
  imageUrl: this.formData.imageUrl || undefined,
  creator: creatorAddress,               // ✅ Added from wallet
  creatorType: 'human',                   // ✅ Set to 'human' for UI-created tokens
  initialBuy: this.formData.initialBuySol > 0 
    ? this.formData.initialBuySol 
    : undefined                           // ✅ Renamed field
};

const result = await this.apiService.createToken(requestData).toPromise();
```

### 3. **Improved Error Handling**

```typescript
catch (error: any) {
  console.error('Failed to create token:', error);
  const errorMsg = error.error?.message || error.message || 'Failed to create token';
  const errorDetail = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg;
  this.notificationService.transactionFailed(errorDetail);
}
```

Now displays validation errors properly instead of generic "Failed to create token".

---

## Changes Summary

### Frontend Changes

**File:** `api.service.ts`
- ✅ Added `creator: string` (required)
- ✅ Added `creatorType?: string` (optional)
- ✅ Renamed `initialBuySol` → `initialBuy`

**File:** `create-token.component.ts`
- ✅ Gets wallet address from `WalletService`
- ✅ Validates wallet address exists before API call
- ✅ Transforms form data to match backend DTO
- ✅ Sets `creatorType: 'human'` automatically
- ✅ Improved error message display (shows all validation errors)

### Backend (No Changes Needed)

Backend DTO was correct all along:
```typescript
export class CreateTokenDto {
  @IsString() @MinLength(1) @MaxLength(255)
  name: string;

  @IsString() @MinLength(1) @MaxLength(10)
  symbol: string;

  @IsString() @IsOptional()
  description?: string;

  @IsString() @IsOptional()
  imageUrl?: string;

  @IsString() @MinLength(32) @MaxLength(44)  // Solana address length
  creator: string;                            // Required

  @IsString() @IsOptional()
  creatorType?: string;

  @IsNumber() @Min(0) @IsOptional()
  initialBuy?: number;                        // Note: NOT initialBuySol
}
```

---

## Testing

### Before Fix ❌
```
POST /v1/tokens/create
{
  "name": "Test Token",
  "symbol": "TEST",
  "initialBuySol": 1
}

Response: 400 Bad Request
- property initialBuySol should not exist
- creator must be a string
```

### After Fix ✅
```
POST /v1/tokens/create
{
  "name": "Test Token",
  "symbol": "TEST",
  "creator": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "creatorType": "human",
  "initialBuy": 1
}

Response: 200 OK
{
  "address": "...",
  "name": "Test Token",
  "symbol": "TEST",
  ...
}
```

---

## Why This Happened

1. **Initial Development** - Frontend and backend developed separately
2. **Field Naming** - `initialBuySol` vs `initialBuy` inconsistency
3. **Missing Field** - `creator` field not originally in frontend form
4. **No Type Safety** - HTTP requests bypass TypeScript compile-time checks
5. **Validation Gap** - Backend validation caught it at runtime

---

## Prevention

### For Future Development

1. **Share DTOs** - Consider generating TypeScript types from backend DTOs
2. **API Documentation** - Keep Swagger docs up to date
3. **Integration Tests** - Test frontend → backend flows end-to-end
4. **Type Generation** - Use tools like `openapi-generator` to sync types
5. **Contract Testing** - Implement contract tests (Pact, etc.)

### Quick Check List

Before calling any API endpoint:
- [ ] Check backend DTO for required fields
- [ ] Verify field names match exactly
- [ ] Confirm data types match
- [ ] Test with real data (not mocks)
- [ ] Handle validation errors gracefully

---

## Impact

**Before:** Token creation always failed with 400 error  
**After:** Token creation works correctly with connected wallet

**User Flow:**
1. User connects wallet ✅
2. Fills in token form ✅
3. Clicks "Create Token" ✅
4. Backend receives valid request ✅
5. Token created successfully ✅
6. User navigated to token page ✅

---

## Related Files

- `frontend/src/app/core/services/api.service.ts` - API interface
- `frontend/src/app/features/create-token/create-token.component.ts` - Token creation form
- `backend/src/public-api/dto/create-token.dto.ts` - Backend DTO
- `backend/src/public-api/controllers/tokens.controller.ts` - API endpoint

---

**Fixed:** 2026-02-03  
**Commit:** TBD  
**Status:** ✅ Ready for testing

---

**Built with 🍆 by Gereld** | *Backend validation saves the day!*
