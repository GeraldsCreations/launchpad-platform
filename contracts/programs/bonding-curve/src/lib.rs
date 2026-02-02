use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn, Transfer};

declare_id!("BondCrv11111111111111111111111111111111111");

#[program]
pub mod bonding_curve {
    use super::*;

    /// Initialize a new bonding curve for a token
    pub fn initialize_curve(
        ctx: Context<InitializeCurve>,
        base_price: u64,
        max_supply: u64,
    ) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(base_price > 0, ErrorCode::InvalidBasePrice);
        require!(max_supply > 0, ErrorCode::InvalidMaxSupply);
        
        curve.token_mint = ctx.accounts.token_mint.key();
        curve.creator = ctx.accounts.creator.key();
        curve.base_price = base_price;
        curve.token_supply = 0;
        curve.max_supply = max_supply;
        curve.sol_reserves = 0;
        curve.fee_collector = ctx.accounts.fee_collector.key();
        curve.graduated = false;
        curve.created_at = Clock::get()?.unix_timestamp;
        curve.bump = ctx.bumps.bonding_curve;
        
        emit!(CurveInitialized {
            token_mint: curve.token_mint,
            creator: curve.creator,
            base_price,
            max_supply,
        });
        
        Ok(())
    }

    /// Buy tokens with SOL
    pub fn buy(ctx: Context<Buy>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(!curve.graduated, ErrorCode::CurveGraduated);
        require!(sol_amount > 0, ErrorCode::InvalidAmount);
        
        // Calculate fee (1%)
        let fee = sol_amount.checked_div(100).ok_or(ErrorCode::MathOverflow)?;
        let sol_after_fee = sol_amount.checked_sub(fee).ok_or(ErrorCode::MathOverflow)?;
        
        // Calculate tokens to mint based on bonding curve formula
        let tokens_to_mint = calculate_buy_tokens(
            curve.token_supply,
            curve.max_supply,
            curve.base_price,
            sol_after_fee,
        )?;
        
        require!(tokens_to_mint >= min_tokens_out, ErrorCode::SlippageExceeded);
        require!(
            curve.token_supply.checked_add(tokens_to_mint).ok_or(ErrorCode::MathOverflow)? <= curve.max_supply,
            ErrorCode::MaxSupplyExceeded
        );
        
        // Transfer SOL from buyer to curve
        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.sol_vault.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(transfer_ctx, sol_after_fee)?;
        
        // Transfer fee to fee collector
        let fee_transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.fee_collector.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(fee_transfer_ctx, fee)?;
        
        // Mint tokens to buyer
        let seeds = &[
            b"bonding_curve",
            curve.token_mint.as_ref(),
            &[curve.bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds,
        );
        token::mint_to(mint_ctx, tokens_to_mint)?;
        
        // Update curve state
        curve.token_supply = curve.token_supply.checked_add(tokens_to_mint).ok_or(ErrorCode::MathOverflow)?;
        curve.sol_reserves = curve.sol_reserves.checked_add(sol_after_fee).ok_or(ErrorCode::MathOverflow)?;
        
        emit!(TokensBought {
            buyer: ctx.accounts.buyer.key(),
            token_mint: curve.token_mint,
            sol_amount,
            tokens_received: tokens_to_mint,
            fee,
        });
        
        Ok(())
    }

    /// Sell tokens for SOL
    pub fn sell(ctx: Context<Sell>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(!curve.graduated, ErrorCode::CurveGraduated);
        require!(token_amount > 0, ErrorCode::InvalidAmount);
        require!(token_amount <= curve.token_supply, ErrorCode::InsufficientSupply);
        
        // Calculate SOL to return based on bonding curve formula
        let sol_to_return = calculate_sell_sol(
            curve.token_supply,
            curve.max_supply,
            curve.base_price,
            token_amount,
        )?;
        
        // Calculate fee (1%)
        let fee = sol_to_return.checked_div(100).ok_or(ErrorCode::MathOverflow)?;
        let sol_after_fee = sol_to_return.checked_sub(fee).ok_or(ErrorCode::MathOverflow)?;
        
        require!(sol_after_fee >= min_sol_out, ErrorCode::SlippageExceeded);
        require!(sol_to_return <= curve.sol_reserves, ErrorCode::InsufficientReserves);
        
        // Burn tokens from seller
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.seller_token_account.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        );
        token::burn(burn_ctx, token_amount)?;
        
        // Transfer SOL from vault to seller
        let seeds = &[
            b"bonding_curve",
            curve.token_mint.as_ref(),
            &[curve.bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= sol_after_fee;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += sol_after_fee;
        
        // Transfer fee to fee collector
        **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= fee;
        **ctx.accounts.fee_collector.to_account_info().try_borrow_mut_lamports()? += fee;
        
        // Update curve state
        curve.token_supply = curve.token_supply.checked_sub(token_amount).ok_or(ErrorCode::MathOverflow)?;
        curve.sol_reserves = curve.sol_reserves.checked_sub(sol_to_return).ok_or(ErrorCode::MathOverflow)?;
        
        emit!(TokensSold {
            seller: ctx.accounts.seller.key(),
            token_mint: curve.token_mint,
            tokens_sold: token_amount,
            sol_received: sol_after_fee,
            fee,
        });
        
        Ok(())
    }

    /// Get current token price
    pub fn get_price(ctx: Context<GetPrice>) -> Result<u64> {
        let curve = &ctx.accounts.bonding_curve;
        calculate_current_price(curve.token_supply, curve.max_supply, curve.base_price)
    }

    /// Mark curve as graduated (called by graduation handler)
    pub fn graduate(ctx: Context<Graduate>) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(!curve.graduated, ErrorCode::AlreadyGraduated);
        
        curve.graduated = true;
        
        emit!(CurveGraduated {
            token_mint: curve.token_mint,
            final_supply: curve.token_supply,
            sol_reserves: curve.sol_reserves,
        });
        
        Ok(())
    }
}

// Helper functions for bonding curve calculations
fn calculate_buy_tokens(
    current_supply: u64,
    max_supply: u64,
    base_price: u64,
    sol_amount: u64,
) -> Result<u64> {
    // Simplified bonding curve: price = base_price * (1 + supply/max_supply)^2
    // For buy: integrate to find tokens that can be bought with given SOL
    
    // Using approximation for integration
    let mut tokens = 0u64;
    let mut remaining_sol = sol_amount;
    let mut supply = current_supply;
    
    // Buy in small increments to approximate the integral
    let increment = max_supply / 10000; // 0.01% increments
    
    while remaining_sol > 0 && supply < max_supply {
        let price = calculate_current_price(supply, max_supply, base_price)?;
        let cost = price.checked_mul(increment).ok_or(ErrorCode::MathOverflow)?
            .checked_div(1_000_000_000).ok_or(ErrorCode::MathOverflow)?; // Normalize
        
        if cost > remaining_sol {
            // Buy partial increment
            let partial = remaining_sol.checked_mul(1_000_000_000).ok_or(ErrorCode::MathOverflow)?
                .checked_div(price).ok_or(ErrorCode::MathOverflow)?;
            tokens = tokens.checked_add(partial).ok_or(ErrorCode::MathOverflow)?;
            break;
        }
        
        tokens = tokens.checked_add(increment).ok_or(ErrorCode::MathOverflow)?;
        supply = supply.checked_add(increment).ok_or(ErrorCode::MathOverflow)?;
        remaining_sol = remaining_sol.checked_sub(cost).ok_or(ErrorCode::MathOverflow)?;
    }
    
    Ok(tokens)
}

fn calculate_sell_sol(
    current_supply: u64,
    max_supply: u64,
    base_price: u64,
    token_amount: u64,
) -> Result<u64> {
    // Reverse of buy calculation
    let mut sol = 0u64;
    let mut remaining_tokens = token_amount;
    let mut supply = current_supply;
    
    let increment = max_supply / 10000;
    
    while remaining_tokens > 0 && supply > 0 {
        let price = calculate_current_price(supply, max_supply, base_price)?;
        
        if remaining_tokens < increment {
            let partial_sol = price.checked_mul(remaining_tokens).ok_or(ErrorCode::MathOverflow)?
                .checked_div(1_000_000_000).ok_or(ErrorCode::MathOverflow)?;
            sol = sol.checked_add(partial_sol).ok_or(ErrorCode::MathOverflow)?;
            break;
        }
        
        let value = price.checked_mul(increment).ok_or(ErrorCode::MathOverflow)?
            .checked_div(1_000_000_000).ok_or(ErrorCode::MathOverflow)?;
        
        sol = sol.checked_add(value).ok_or(ErrorCode::MathOverflow)?;
        supply = supply.checked_sub(increment).ok_or(ErrorCode::MathOverflow)?;
        remaining_tokens = remaining_tokens.checked_sub(increment).ok_or(ErrorCode::MathOverflow)?;
    }
    
    Ok(sol)
}

fn calculate_current_price(supply: u64, max_supply: u64, base_price: u64) -> Result<u64> {
    // price = base_price * (1 + supply/max_supply)^2
    let ratio = (supply as u128).checked_mul(1_000_000).ok_or(ErrorCode::MathOverflow)?
        .checked_div(max_supply as u128).ok_or(ErrorCode::MathOverflow)?;
    
    let one_plus_ratio = 1_000_000u128.checked_add(ratio).ok_or(ErrorCode::MathOverflow)?;
    let squared = one_plus_ratio.checked_mul(one_plus_ratio).ok_or(ErrorCode::MathOverflow)?
        .checked_div(1_000_000).ok_or(ErrorCode::MathOverflow)?;
    
    let price = (base_price as u128).checked_mul(squared).ok_or(ErrorCode::MathOverflow)?
        .checked_div(1_000_000).ok_or(ErrorCode::MathOverflow)?;
    
    Ok(price as u64)
}

// Account contexts
#[derive(Accounts)]
pub struct InitializeCurve<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurve::INIT_SPACE,
        seeds = [b"bonding_curve", token_mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    /// CHECK: Fee collector account
    pub fee_collector: AccountInfo<'info>,
    
    /// CHECK: SOL vault PDA
    #[account(
        mut,
        seeds = [b"sol_vault", token_mint.key().as_ref()],
        bump
    )]
    pub sol_vault: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(
        mut,
        seeds = [b"bonding_curve", token_mint.key().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        mut,
        constraint = buyer_token_account.mint == token_mint.key()
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: SOL vault PDA
    #[account(
        mut,
        seeds = [b"sol_vault", token_mint.key().as_ref()],
        bump
    )]
    pub sol_vault: AccountInfo<'info>,
    
    /// CHECK: Fee collector account
    #[account(mut)]
    pub fee_collector: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(
        mut,
        seeds = [b"bonding_curve", token_mint.key().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub seller: Signer<'info>,
    
    #[account(
        mut,
        constraint = seller_token_account.mint == token_mint.key()
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: SOL vault PDA
    #[account(
        mut,
        seeds = [b"sol_vault", token_mint.key().as_ref()],
        bump
    )]
    pub sol_vault: AccountInfo<'info>,
    
    /// CHECK: Fee collector account
    #[account(mut)]
    pub fee_collector: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetPrice<'info> {
    #[account(
        seeds = [b"bonding_curve", bonding_curve.token_mint.as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
}

#[derive(Accounts)]
pub struct Graduate<'info> {
    #[account(
        mut,
        seeds = [b"bonding_curve", bonding_curve.token_mint.as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    /// CHECK: Only graduation handler can call
    pub graduation_handler: Signer<'info>,
}

// State
#[account]
#[derive(InitSpace)]
pub struct BondingCurve {
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
pub struct CurveInitialized {
    pub token_mint: Pubkey,
    pub creator: Pubkey,
    pub base_price: u64,
    pub max_supply: u64,
}

#[event]
pub struct TokensBought {
    pub buyer: Pubkey,
    pub token_mint: Pubkey,
    pub sol_amount: u64,
    pub tokens_received: u64,
    pub fee: u64,
}

#[event]
pub struct TokensSold {
    pub seller: Pubkey,
    pub token_mint: Pubkey,
    pub tokens_sold: u64,
    pub sol_received: u64,
    pub fee: u64,
}

#[event]
pub struct CurveGraduated {
    pub token_mint: Pubkey,
    pub final_supply: u64,
    pub sol_reserves: u64,
}

// Errors
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid base price")]
    InvalidBasePrice,
    #[msg("Invalid max supply")]
    InvalidMaxSupply,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Curve has graduated")]
    CurveGraduated,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Max supply exceeded")]
    MaxSupplyExceeded,
    #[msg("Insufficient supply")]
    InsufficientSupply,
    #[msg("Insufficient reserves")]
    InsufficientReserves,
    #[msg("Already graduated")]
    AlreadyGraduated,
}
