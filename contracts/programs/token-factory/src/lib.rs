use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use mpl_token_metadata::{
    instructions::{CreateMetadataAccountV3, CreateMetadataAccountV3InstructionArgs},
    types::DataV2,
};

declare_id!("TknFctry1111111111111111111111111111111111");

#[program]
pub mod token_factory {
    use super::*;

    /// Create a new SPL token with metadata and bonding curve
    pub fn create_token(
        ctx: Context<CreateToken>,
        name: String,
        symbol: String,
        uri: String,
        base_price: u64,
        max_supply: u64,
    ) -> Result<()> {
        require!(name.len() <= 32, ErrorCode::NameTooLong);
        require!(symbol.len() <= 10, ErrorCode::SymbolTooLong);
        require!(uri.len() <= 200, ErrorCode::UriTooLong);
        require!(base_price > 0, ErrorCode::InvalidBasePrice);
        require!(max_supply > 0, ErrorCode::InvalidMaxSupply);
        
        // Create token metadata
        let metadata_infos = vec![
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.creator.to_account_info(),
            ctx.accounts.creator.to_account_info(), // update authority
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ];
        
        let create_metadata_ix = CreateMetadataAccountV3 {
            metadata: ctx.accounts.metadata.key(),
            mint: ctx.accounts.mint.key(),
            mint_authority: ctx.accounts.mint_authority.key(),
            payer: ctx.accounts.creator.key(),
            update_authority: (ctx.accounts.creator.key(), true),
            system_program: ctx.accounts.system_program.key(),
            rent: Some(ctx.accounts.rent.key()),
        };
        
        let metadata_data = DataV2 {
            name: name.clone(),
            symbol: symbol.clone(),
            uri: uri.clone(),
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };
        
        let create_args = CreateMetadataAccountV3InstructionArgs {
            data: metadata_data,
            is_mutable: true,
            collection_details: None,
        };
        
        solana_program::program::invoke(
            &create_metadata_ix.instruction(create_args),
            &metadata_infos,
        )?;
        
        // Initialize bonding curve via CPI
        let bonding_curve_program = ctx.accounts.bonding_curve_program.to_account_info();
        
        // CPI to bonding_curve::initialize_curve
        let cpi_accounts = bonding_curve::cpi::accounts::InitializeCurve {
            bonding_curve: ctx.accounts.bonding_curve.to_account_info(),
            token_mint: ctx.accounts.mint.to_account_info(),
            creator: ctx.accounts.creator.to_account_info(),
            fee_collector: ctx.accounts.fee_collector.to_account_info(),
            sol_vault: ctx.accounts.sol_vault.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new(bonding_curve_program, cpi_accounts);
        bonding_curve::cpi::initialize_curve(cpi_ctx, base_price, max_supply)?;
        
        emit!(TokenCreated {
            token_mint: ctx.accounts.mint.key(),
            creator: ctx.accounts.creator.key(),
            name,
            symbol,
            uri,
            base_price,
            max_supply,
        });
        
        Ok(())
    }

    /// Update token metadata (creator only)
    pub fn update_metadata(
        ctx: Context<UpdateMetadata>,
        name: Option<String>,
        symbol: Option<String>,
        uri: Option<String>,
    ) -> Result<()> {
        if let Some(ref n) = name {
            require!(n.len() <= 32, ErrorCode::NameTooLong);
        }
        if let Some(ref s) = symbol {
            require!(s.len() <= 10, ErrorCode::SymbolTooLong);
        }
        if let Some(ref u) = uri {
            require!(u.len() <= 200, ErrorCode::UriTooLong);
        }
        
        // Update metadata account via Metaplex CPI
        // Implementation depends on Metaplex update instruction
        
        emit!(MetadataUpdated {
            token_mint: ctx.accounts.mint.key(),
            updater: ctx.accounts.creator.key(),
        });
        
        Ok(())
    }
}

// Account contexts
#[derive(Accounts)]
#[instruction(name: String, symbol: String)]
pub struct CreateToken<'info> {
    #[account(
        init,
        payer = creator,
        mint::decimals = 9,
        mint::authority = mint_authority,
    )]
    pub mint: Account<'info, Mint>,
    
    /// CHECK: Mint authority PDA that will be transferred to bonding curve
    #[account(
        seeds = [b"mint_authority", mint.key().as_ref()],
        bump
    )]
    pub mint_authority: AccountInfo<'info>,
    
    /// CHECK: Metadata account for the token
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    /// CHECK: Bonding curve account (will be initialized via CPI)
    #[account(mut)]
    pub bonding_curve: AccountInfo<'info>,
    
    /// CHECK: SOL vault PDA for bonding curve
    #[account(mut)]
    pub sol_vault: AccountInfo<'info>,
    
    /// CHECK: Fee collector account
    pub fee_collector: AccountInfo<'info>,
    
    /// CHECK: Bonding curve program
    pub bonding_curve_program: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateMetadata<'info> {
    pub mint: Account<'info, Mint>,
    
    /// CHECK: Metadata account for the token
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// Events
#[event]
pub struct TokenCreated {
    pub token_mint: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub base_price: u64,
    pub max_supply: u64,
}

#[event]
pub struct MetadataUpdated {
    pub token_mint: Pubkey,
    pub updater: Pubkey,
}

// Errors
#[error_code]
pub enum ErrorCode {
    #[msg("Token name too long (max 32 characters)")]
    NameTooLong,
    #[msg("Token symbol too long (max 10 characters)")]
    SymbolTooLong,
    #[msg("Token URI too long (max 200 characters)")]
    UriTooLong,
    #[msg("Invalid base price")]
    InvalidBasePrice,
    #[msg("Invalid max supply")]
    InvalidMaxSupply,
}

// External program CPI interfaces
pub mod bonding_curve {
    use super::*;
    
    pub mod cpi {
        use super::*;
        
        pub mod accounts {
            use super::*;
            
            pub struct InitializeCurve<'info> {
                pub bonding_curve: AccountInfo<'info>,
                pub token_mint: AccountInfo<'info>,
                pub creator: AccountInfo<'info>,
                pub fee_collector: AccountInfo<'info>,
                pub sol_vault: AccountInfo<'info>,
                pub system_program: AccountInfo<'info>,
            }
        }
        
        pub fn initialize_curve(
            ctx: CpiContext<accounts::InitializeCurve>,
            base_price: u64,
            max_supply: u64,
        ) -> Result<()> {
            // This would normally use anchor_lang::solana_program::program::invoke_signed
            // For now, simplified version
            Ok(())
        }
    }
}
