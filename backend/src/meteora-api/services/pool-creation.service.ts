import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import DLMM, { ActivationType } from '@meteora-ag/dlmm';
import BN from 'bn.js';
import { MeteoraService } from './meteora.service';
import { MeteoraPool } from '../entities/meteora-pool.entity';
import { MeteoraTransaction, TransactionType } from '../entities/meteora-transaction.entity';
import { FeeClaimerVault } from '../../database/entities/fee-claimer-vault.entity';
import { CreateTokenDto } from '../dto/create-token.dto';

@Injectable()
export class PoolCreationService {
  private readonly logger = new Logger(PoolCreationService.name);

  // Native SOL mint address (wrapped SOL)
  private readonly NATIVE_SOL = new PublicKey('So11111111111111111111111111111111111111112');

  constructor(
    private meteoraService: MeteoraService,
    @InjectRepository(MeteoraPool)
    private poolRepository: Repository<MeteoraPool>,
    @InjectRepository(MeteoraTransaction)
    private transactionRepository: Repository<MeteoraTransaction>,
    @InjectRepository(FeeClaimerVault)
    private vaultRepository: Repository<FeeClaimerVault>,
  ) {}

  /**
   * Create a new token and Meteora DLMM pool
   */
  async createTokenAndPool(dto: CreateTokenDto) {
    const connection = this.meteoraService.getConnection();

    try {
      // In production, you'd get the creator's keypair from a wallet/signature
      // For now, we'll create a temporary keypair for testing
      const creatorKeypair = Keypair.generate();
      
      this.logger.log(`Creating token with symbol: ${dto.symbol}`);

      // Step 1: Create the token mint
      const tokenMint = await this.createTokenMint(
        connection,
        creatorKeypair,
        dto,
      );

      this.logger.log(`Token mint created: ${tokenMint.toBase58()}`);

      // Step 2: Create Meteora DLMM pool
      const { poolAddress, signature } = await this.createMeteoraPool(
        connection,
        creatorKeypair,
        tokenMint,
        dto,
      );

      this.logger.log(`Meteora pool created: ${poolAddress}`);

      // Step 3: Create fee claimer vault
      // Derive fee claimer vault PDA (Program Derived Address)
      const [feeClaimerPDA] = await PublicKey.findProgramAddress(
        [Buffer.from('fee_claimer'), new PublicKey(poolAddress).toBuffer()],
        new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'), // Meteora DLMM program
      );

      const vault = this.vaultRepository.create({
        poolAddress,
        tokenAddress: tokenMint.toBase58(),
        feeClaimerPubkey: feeClaimerPDA.toBase58(),
        totalFeesCollected: 0,
        claimedFees: 0,
        unclaimedFees: 0,
        claimCount: 0,
      });

      await this.vaultRepository.save(vault);

      this.logger.log(`Fee claimer vault created: ${vault.feeClaimerPubkey}`);

      // Step 4: Save pool to database
      const pool = new MeteoraPool();
      pool.poolAddress = poolAddress;
      pool.tokenAddress = tokenMint.toBase58();
      pool.baseTokenAddress = this.NATIVE_SOL.toBase58();
      pool.tokenName = dto.name;
      pool.tokenSymbol = dto.symbol;
      pool.creator = dto.creator;
      pool.creatorBotId = dto.creatorBotId || undefined;
      pool.creatorBotWallet = dto.creatorBotWallet || undefined;
      pool.creatorRevenueSharePercent = dto.revenueSharePercent || 50;
      pool.binStep = dto.binStep || 25;
      pool.activeId = this.calculateActiveBinId(dto.initialPrice);
      pool.currentPrice = dto.initialPrice;
      pool.volume24h = 0;
      pool.liquidity = dto.initialLiquidity;
      pool.tvl = dto.initialLiquidity * dto.initialPrice;
      pool.feeRate = dto.feeBps || 25;
      pool.platformFeesCollected = 0;
      pool.launchFeeCollected = this.meteoraService.getLaunchFee();
      pool.isActive = true;

      await this.poolRepository.save(pool);

      // Step 5: Record creation transaction
      const transaction = this.transactionRepository.create({
        signature,
        poolAddress,
        wallet: dto.creator,
        txType: TransactionType.CREATE,
        tokenAmount: 0,
        solAmount: dto.initialLiquidity + this.meteoraService.getLaunchFee(),
        price: dto.initialPrice,
        platformFee: this.meteoraService.getLaunchFee(),
        success: true,
      });

      await this.transactionRepository.save(transaction);

      return {
        success: true,
        poolAddress,
        tokenAddress: tokenMint.toBase58(),
        signature,
        launchFee: this.meteoraService.getLaunchFee(),
        message: 'Token and pool created successfully',
      };
    } catch (error) {
      this.logger.error('Failed to create token and pool:', error);
      throw new Error(`Pool creation failed: ${error.message}`);
    }
  }

  /**
   * Create token mint
   */
  private async createTokenMint(
    connection: Connection,
    payer: Keypair,
    dto: CreateTokenDto,
  ): Promise<PublicKey> {
    try {
      // Create mint with 9 decimals (standard for SPL tokens)
      const mint = await createMint(
        connection,
        payer,
        payer.publicKey,
        payer.publicKey,
        9, // decimals
        undefined,
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID,
      );

      // Create token account for creator
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        payer.publicKey,
        false,
        'confirmed',
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID,
      );

      // Mint initial supply (e.g., 1 billion tokens)
      const initialSupply = new BN(1_000_000_000).mul(new BN(10).pow(new BN(9)));
      await mintTo(
        connection,
        payer,
        mint,
        tokenAccount.address,
        payer,
        BigInt(initialSupply.toString()),
        [],
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID,
      );

      return mint;
    } catch (error) {
      this.logger.error('Failed to create token mint:', error);
      throw error;
    }
  }

  /**
   * Create Meteora DLMM pool
   */
  private async createMeteoraPool(
    connection: Connection,
    creator: Keypair,
    tokenMint: PublicKey,
    dto: CreateTokenDto,
  ) {
    try {
      const binStep = new BN(dto.binStep || 25);
      const feeBps = new BN(dto.feeBps || 25);
      const activeId = new BN(this.calculateActiveBinId(dto.initialPrice));

      // Create customizable permissionless LB pair
      const createPoolTx = await DLMM.createCustomizablePermissionlessLbPair(
        connection,
        binStep,
        tokenMint, // tokenX (the new token)
        this.NATIVE_SOL, // tokenY (SOL)
        activeId,
        feeBps,
        ActivationType.Timestamp,
        false, // hasAlphaVault
        creator.publicKey,
        new BN(Math.floor(Date.now() / 1000)), // Activate immediately
        false, // creatorPoolOnOffControl
      );

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        createPoolTx,
        [creator],
        {
          commitment: 'confirmed',
        },
      );

      // Derive pool address
      // Note: In production, you'd parse the transaction to get the actual pool address
      // For now, we'll use a placeholder approach
      const poolAddress = await this.findPoolAddress(
        connection,
        tokenMint,
        this.NATIVE_SOL,
      );

      return {
        poolAddress,
        signature,
      };
    } catch (error) {
      this.logger.error('Failed to create Meteora pool:', error);
      throw error;
    }
  }

  /**
   * Calculate active bin ID from price
   */
  private calculateActiveBinId(price: number): number {
    // Convert price to bin ID using Meteora's formula
    // binId = floor(log(price) / log(1 + binStep/10000))
    // For simplicity, using a basic formula
    const binStep = 25;
    const priceRatio = 1 + binStep / 10000;
    const binId = Math.floor(Math.log(price) / Math.log(priceRatio));
    return binId;
  }

  /**
   * Find pool address (helper method)
   */
  private async findPoolAddress(
    connection: Connection,
    tokenX: PublicKey,
    tokenY: PublicKey,
  ): Promise<string> {
    try {
      // Use Meteora SDK to find the pool
      const poolPubkey = await DLMM.getCustomizablePermissionlessLbPairIfExists(
        connection,
        tokenX,
        tokenY,
      );

      if (poolPubkey) {
        return poolPubkey.toBase58();
      }

      throw new Error('Pool address not found after creation');
    } catch (error) {
      this.logger.error('Failed to find pool address:', error);
      throw error;
    }
  }
}
