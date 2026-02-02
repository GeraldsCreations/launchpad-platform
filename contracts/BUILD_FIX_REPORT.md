# Solana Smart Contract Build Issue - Investigation Report

## Problem Summary
`cargo-build-sbf` fails with "blake3 v1.8.3 requires edition2024" error, blocking deployment of LaunchPad contracts to Solana devnet.

## Root Cause Analysis

### Primary Issue: Edition2024 Dependency Chain
The error wasn't directly from blake3, but from a transitive dependency chain:

```
solana-program 1.16.25 
  → ark-bn254 
    → ark-ec 
      → hashbrown 0.13.2 
        → ahash 0.8.12 
          → getrandom 0.3.4 
            → wasip2 1.0.2 
              → wit-bindgen 0.51.0 (requires edition2024)
```

**Key Finding:** `wit-bindgen 0.51.0` requires Rust edition2024, but:
- Solana's cargo-build-sbf uses platform-tools with Cargo 1.75.0
- Cargo 1.75.0 doesn't support edition2024 (needs Cargo 1.82+)
- This creates an unbuildable dependency conflict

## Solution Attempt #1: Downgrade to Anchor 0.24.2 ✅ Partial Success

###Actions Taken:
```toml
# Anchor.toml
anchor_version = "0.24.2"
solana_version = "1.14.17" # Not yet installed

# All program Cargo.toml files
anchor-lang = "0.24.2"
anchor-spl = "0.24.2"
mpl-token-metadata = "1.3.5" # For token-factory
getrandom = { version = "0.1", features = ["dummy"] } # BPF compatibility
```

### Result:
- ✅ Successfully eliminated `wit-bindgen` and `wasip2` from dependency tree
- ✅ Cargo.lock now uses older, compatible dependencies
- ❌ New issues emerged: `atty` compilation error and BPF stack overflow

### New Blockers:
1. **atty v0.2.14 compilation error:** Missing `is()` function - known bug with BPF target
2. **regex_automata stack overflow:** Stack usage (6368-7688 bytes) exceeds BPF limit (4096 bytes)

## Solution Attempt #2: Dependency Patches ⏸️ In Progress

### Attempted Fixes:
- Workspace-level `atty = "=0.2.11"` pin
- `opt-level = "z"` for size optimization  
- `indexmap` downgrade to 2.2.6 (successful)

### Status:
Compilation progresses further but still fails on:
- atty crate (BPF target incompatibility)
- regex_automata (stack size for BPF programs)

## Working Configuration Summary

### Successfully Resolved:
```toml
[workspace]
members = ["programs/pump", "programs/bonding-curve", "programs/token-factory", "programs/graduation"]
resolver = "2"

[workspace.dependencies]
atty = "=0.2.11"

[profile.release]
overflow-checks = true
lto = "fat"
codegen-units = 1
opt-level = "z"
```

### Program Dependencies (ALL programs):
```toml
[dependencies]
getrandom = { version = "0.1", features = ["dummy"] }
anchor-lang = "0.24.2"
anchor-spl = "0.24.2"
blake3 = "=1.5.1"
ahash = "=0.7.8"

# token-factory also needs:
# mpl-token-metadata = "1.3.5"
```

### Cargo.lock Status:
- ✅ No `wit-bindgen`
- ✅ No `wasip2`  
- ✅ getrandom 0.1.16 with dummy feature
- ✅ indexmap 2.2.6 (downgraded from 2.13.0)
- ❌ Still contains atty 0.2.14 (problematic)
- ❌ Still contains regex_automata (stack issues)

## Recommended Next Steps

### Option 1: Patch Problematic Crates (Most Direct)
```toml
[patch.crates-io]
atty = { git = "https://github.com/softprops/atty", branch = "master" }
# Or exclude it entirely if not needed for BPF
```

### Option 2: Strip Unnecessary Dependencies
- Audit which dependencies actually pull in atty/regex
- Consider removing dev-dependencies that aren't needed for release builds
- Use `cargo tree` to identify the chain

### Option 3: Use Docker with Frozen Environment
```dockerfile
FROM projectserum/build:v0.24.2
# Pin exact versions that are known to work
# Build in isolated environment
```

### Option 4: Manual BPF Compilation
- Bypass cargo-build-sbf entirely
- Use direct `cargo build --target bpfel-unknown-unknown --release`
- Requires installing BPF target: `rustup target add bpfel-unknown-unknown`
- Note: Failed initially due to missing BPF target in standard Rust

### Option 5: Switch to Solana 1.14.x Toolchain
Current Solana CLI: 1.18.26

Attempt to install older version:
```bash
~/.local/share/solana/install/releases/1.18.26/solana-release/bin/agave-install-init 1.14.17
# Result: "Error: Unknown release: 1.14.17"
```

May need manual installation or different approach.

## Technical Insights

### Why Cargo Patches Failed Initially:
```toml
[patch.crates-io]
wit-bindgen = "=0.16.0"  # ❌ Fails: must point to different source
getrandom = { git = "...", tag = "v0.2.17" }  # ❌ Still pulled in 0.3.4
```

Cargo patches only work when:
1. Pointing to a different source (git vs crates.io)
2. The patch version satisfies all dependency requirements
3. No transitive dependency explicitly requires the newer version

### BPF Target Limitations:
- Stack size limit: 4096 bytes
- No std library support
- Limited crate ecosystem compatibility
- Requires `dummy` feature for getrandom (no true randomness in BPF)

## Files Modified

1. `/root/.openclaw/workspace/launchpad-platform/contracts/Cargo.toml` - Workspace config
2. `/root/.openclaw/workspace/launchpad-platform/contracts/Anchor.toml` - Anchor version
3. `/root/.openclaw/workspace/launchpad-platform/contracts/programs/*/Cargo.toml` - All 4 programs
4. `/root/.openclaw/workspace/launchpad-platform/contracts/Cargo.lock` - Regenerated

## Current Rust/Solana Environment

- **Rust:** 1.75.0 (active, set via `rustup default 1.75.0`)
- **Cargo:** 1.75.0
- **Solana CLI:** 1.18.26
- **cargo-build-sbf:** 1.18.26 (uses rustc 1.75.0, cargo 1.75.0 from platform-tools)
- **Anchor:** Not properly installed (avm has issues with existing binary)

## Time Invested
~3 hours of deep investigation and systematic testing

## Success Criteria Progress
- [x] Identify root cause (wit-bindgen → edition2024)
- [x] Eliminate edition2024 dependencies  
- [x] Generate clean Cargo.lock
- [ ] Successful cargo-build-sbf compilation (blocked by atty/regex)
- [ ] Deploy .so file to Solana devnet
- [ ] Verify contract deployment

## Estimated Remaining Work
- **Option 1-2:** 1-2 hours (patch atty, strip dependencies)
- **Option 3:** 2-3 hours (Docker setup + testing)
- **Option 4-5:** 3-4 hours (toolchain changes, higher risk)

## Recommendations

**Highest ROI:** Pursue Option 1 (patch atty) + Option 2 (strip deps) in parallel:

1. Add cargo patch for atty from git master
2. Run `cargo tree -i atty` to see what requires it
3. If it's only dev/test deps, exclude from BPF builds
4. Try build again
5. If regex_automata still fails, identify and patch similarly

**Fallback:** If patches don't work within 1 hour, pivot to Docker (Option 3) with a known-good base image.

---

**Report Generated:** 2026-02-02 14:25 UTC  
**Agent:** Subagent solana-build-fix  
**Status:** In Progress - Significant progress made, clear path forward identified
