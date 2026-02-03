# Backend Cleanup Plan

**Date:** 2026-02-03 21:26 UTC  
**Agent:** backend-cleanup  
**Status:** In Progress

## Objectives

1. Remove unused/duplicate code
2. Reorganize auth module (verify separation)
3. Clean up DBC functions (keep what's needed by TokenService)
4. Remove admin functionality
5. Align all code with recent changes (IPFS/Pinata)

## Current Structure

```
backend/src/
├── auth/                    # Auth module (already separate)
├── public-api/              # Main API (tokens, trading)
├── private-api/             # ❌ Admin + Analytics (REMOVE)
├── meteora-api/             # DBC, pools, services
│   ├── controllers/
│   │   ├── dbc.controller.ts           # Admin endpoints (REVIEW)
│   │   ├── pools.controller.ts         # Pool stats (KEEP)
│   │   ├── sol-price.controller.ts     # Price oracle (KEEP)
│   │   ├── [removed duplicates]        # Already cleaned
│   ├── services/
│   │   ├── dbc.service.ts              # Used by TokenService (KEEP)
│   │   ├── metadata-upload.service.ts  # IPFS uploads (KEEP)
│   │   ├── [other services]            # REVIEW usage
├── chat/                    # Chat module (KEEP)
├── database/                # Database module (KEEP)
├── indexer/                 # Blockchain indexer (KEEP)
└── websocket/               # WebSocket module (KEEP)
```

## Removal Targets

### 1. Private API Module (Complete Removal)
- `private-api/controllers/admin.controller.ts` - Admin endpoints
- `private-api/controllers/analytics.controller.ts` - Analytics
- `private-api/services/admin.service.ts`
- `private-api/services/analytics.service.ts`
- `private-api/private-api.module.ts`

**Reason:** No admin functionality needed in production

### 2. DBC Controller Cleanup
- Remove admin endpoints from `dbc.controller.ts`
- Keep only what's needed by TokenService
- DBC service is used for token creation transactions

### 3. Unused Services (To Review)
- `meteora-api/services/pool-creation.service.ts` - Check if used
- `meteora-api/services/lp-management.service.ts` - Check if used
- `meteora-api/services/auto-pool-creation.service.ts` - Check if used
- `meteora-api/services/fee-collection.*.ts` - Check if used

## Auth Usage Check

**Question:** Is auth used in buy/sell/create endpoints?

**Answer (from grep):** NO
- Only `ThrottlerGuard` (rate limiting) is used
- No `AuthGuard` or JWT guards on public endpoints
- Auth module exists but may be unused

**Action:** Verify what auth is used for, consider removal if unused

## Alignment Checks

### Recent Changes to Verify:
1. ✅ IPFS uploads (Pinata, not NFT.storage)
2. ✅ FormData imports (`import * as FormData`)
3. ✅ DBC integration (working)
4. ❓ Any NFT.storage references to remove
5. ❓ Any commented-out code to clean up

## Execution Plan

1. **Create audit report** (current state)
2. **Remove private-api module** (safest - clearly unused)
3. **Clean up DBC controller** (remove admin endpoints)
4. **Review and remove unused services**
5. **Check auth usage** (remove if unused)
6. **Clean up imports and references**
7. **Test backend startup**
8. **Run build to verify**
9. **Create after-state report**
10. **Commit with detailed message**

## Success Criteria

- ✅ Backend starts without errors
- ✅ Build completes successfully
- ✅ All frontend endpoints still work
- ✅ Code is cleaner and more maintainable
- ✅ Documentation updated
- ✅ All changes committed

## Notes

- Keep commits incremental (one module at a time)
- Test after each removal
- Document breaking changes (if any)
- Update app.module.ts imports as needed
