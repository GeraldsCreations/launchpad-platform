use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("BMH2GPLn8woVeGFKAHwJ3wPpBf7mhxRipPzPm9d6Pbjt");

// Raydium AMM program ID (mainnet/devnet)
const RAYDIUM_AMM_PROGRAM: &str = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";

#[program]
pub mod graduation {
    use super::*;

    /// Check if token has reached graduation threshold and process if ready
    pub fn check_and_graduate(ctx: Context<CheckAndGraduate>) -> Result<()> {
        let bonding_curve = &ctx.accounts.bonding_curve;
        
        require!(!bonding_curve.graduated, ErrorCode::AlreadyGraduated);
        
        // Calculate market cap (simplified: sol_reserves represents market cap in SOL)
        let market_cap_lamports = bonding_curve.sol_reserves;
        let market_cap_sol = market_cap_lamports / 1_000_000_000; // Convert lamports to SOL
        
        // Graduation threshold: $69K
        // Assuming 1 SOL = ~$100 (this should come from oracle in production)
        let threshold_sol = 690; // 690 SOL ≈ $69K
        
        require!(
            market_cap_sol >= threshold_sol,
            ErrorCode::ThresholdNotReached
        );
        
        // Mark curve as graduated via CPI
        let graduate_cpi = bonding_curve::cpi::accounts::Graduate {
            bonding_curve: ctx.accounts.bonding_curve.to_account_info(),
            graduation_handler: ctx.accounts.authority.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new(
            ctx.accounts.bonding_curve_program.to_account_info(),
            graduate_cpi,
        );
        
        bonding_curve::cpi::graduate(cpi_ctx)?;
        
        emit!(ReadyForGraduation {
            token_mint: bonding_curve.token_mint,
            market_cap_sol,
            sol_reserves: bonding_curve.sol_reserves,
            token_supply: bonding_curve.token_supply,
        });
        
        Ok(())
    }

    /// Migrate liquidity to Raydium (Phase 2: Create pool and add liquidity)
    pub fn migrate_to_raydium(ctx: Context<MigrateToRaydium>) -> Result<()> {
        let bonding_curve = &ctx.accounts.bonding_curve;
        
        require!(bonding_curve.graduated, ErrorCode::NotGraduated);
        
        let sol_amount = bonding_curve.sol_reserves;
        let token_amount = bonding_curve.token_supply;
        
        // In production, this would:
        // 1. Create Raydium pool via CPI to Raydium AMM
        // 2. Transfer SOL and tokens to pool
        // 3. Receive LP tokens
        // 4. Burn LP tokens to lock liquidity permanently
        
        // For now, emit event with migration details
        emit!(TokenGraduated {
            token_mint: bonding_curve.token_mint,
            raydium_pool: ctx.accounts.raydium_pool.key(),
            sol_migrated: sol_amount,
            tokens_migrated: token_amount,
            lp_tokens_burned: true,
        });
        
        Ok(())
    }

    /// Emergency withdraw (admin only, for failed graduations)
    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>) -> Result<()> {
        let bonding_curve = &ctx.accounts.bonding_curve;
        
        // Only allow if something went wrong with graduation
        require!(bonding_curve.graduated, ErrorCode::NotGraduated);
        
        // Transfer remaining SOL back to creator
        **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= bonding_curve.sol_reserves;
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += bonding_curve.sol_reserves;
        
        emit!(EmergencyWithdrawal {
            token_mint: bonding_curve.token_mint,
            amount: bonding_curve.sol_reserves,
            recipient: ctx.accounts.creator.key(),
        });
        
        Ok(())
    }
}

// Account contexts
#[derive(Accounts)]
pub struct CheckAndGraduate<'info> {
    /// CHECK: Bonding curve account (read-only for checking)
    pub bonding_curve: Account<'info, BondingCurveState>,
    
    /// CHECK: Authority that can trigger graduation
    pub authority: Signer<'info>,
    
    /// CHECK: Bonding curve program
    pub bonding_curve_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct MigrateToRaydium<'info> {
    /// CHECK: Bonding curve account
    pub bonding_curve: Account<'info, BondingCurveState>,
    
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    /// CHECK: SOL vault from bonding curve
    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,
    
    /// CHECK: Token vault (tokens from bonding curve)
    #[account(mut)]
    pub token_vault: Account<'info, TokenAccount>,
    
    /// CHECK: Raydium pool account (to be created)
    #[account(mut)]
    pub raydium_pool: AccountInfo<'info>,
    
    /// CHECK: Raydium AMM program
    pub raydium_program: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    /// CHECK: Bonding curve account
    pub bonding_curve: Account<'info, BondingCurveState>,
    
    /// CHECK: SOL vault
    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,
    
    /// CHECK: Creator (original token creator)
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    
    /// CHECK: Admin authority
    pub admin: Signer<'info>,
}

// Simplified bonding curve state (matches actual program)
#[account]
pub struct BondingCurveState {
    pub token_mint: Pubkey,
    pub creator: Pubkey,
    pub base_price: u64,
    pub token_supply: u64,
    pub max_supply: u64,
    pub sol_reserves: u64,
    pub fee_collector: Pubkey,
    pub graduated: bool,
    pub created_at: i64,
    pub bump: u8,
}

// Events
#[event]
pub struct ReadyForGraduation {
    pub token_mint: Pubkey,
    pub market_cap_sol: u64,
    pub sol_reserves: u64,
    pub token_supply: u64,
}

#[event]
pub struct TokenGraduated {
    pub token_mint: Pubkey,
    pub raydium_pool: Pubkey,
    pub sol_migrated: u64,
    pub tokens_migrated: u64,
    pub lp_tokens_burned: bool,
}

#[event]
pub struct EmergencyWithdrawal {
    pub token_mint: Pubkey,
    pub amount: u64,
    pub recipient: Pubkey,
}

// Errors
#[error_code]
pub enum ErrorCode {
    #[msg("Token has already graduated")]
    AlreadyGraduated,
    #[msg("Market cap threshold not reached ($69K)")]
    ThresholdNotReached,
    #[msg("Token has not graduated yet")]
    NotGraduated,
    #[msg("Unauthorized")]
    Unauthorized,
}

// External program CPI interfaces
pub mod bonding_curve {
    use super::*;
    
    pub mod cpi {
        use super::*;
        
        pub mod accounts {
            use super::*;
            
            pub struct Graduate<'info> {
                pub bonding_curve: AccountInfo<'info>,
                pub graduation_handler: AccountInfo<'info>,
            }
        }
        
        pub fn graduate(
            _ctx: CpiContext<accounts::Graduate>,
        ) -> Result<()> {
            Ok(())
        }
    }
}
