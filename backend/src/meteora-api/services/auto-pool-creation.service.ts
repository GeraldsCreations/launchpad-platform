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
  ComputeBudgetProgram,
} from '@solana/web3.js';
import DLMM, { ActivationType, StrategyType, LBCLMM_PROGRAM_IDS } from '@meteora-ag/dlmm';
import * as BN from 'bn.js';
import { MeteoraService } from './meteora.service';
import { MeteoraPool } from '../entities/meteora-pool.entity';
import { LpPosition } from '../entities/lp-position.entity';
// FeeClaimerVault removed - DBC handles fee tracking on-chain

/**
 * Service for automatically creating DLMM pools and adding platform-controlled liquidity
 * after bot creates a token
 */
@Injectable()
export class AutoPoolCreationService {
  private readonly logger = new Logger(AutoPoolCreationService.name);

  // Native SOL mint address
  private readonly NATIVE_SOL = (() => {
    console.log('[PublicKey] auto-pool-creation.service.ts:29 - Creating NATIVE_SOL PublicKey');
    const key = new PublicKey('So11111111111111111111111111111111111111112');
    console.log('[PublicKey] auto-pool-creation.service.ts:29 - Created NATIVE_SOL:', key.toBase58());
    return key;
  })();
  
  // Meteora DLMM program ID (devnet)
  private readonly DLMM_PROGRAM_ID = (() => {
    console.log('[PublicKey] auto-pool-creation.service.ts:32 - Creating DLMM_PROGRAM_ID from:', LBCLMM_PROGRAM_IDS['devnet']);
    const key = new PublicKey(LBCLMM_PROGRAM_IDS['devnet']);
    console.log('[PublicKey] auto-pool-creation.service.ts:32 - Created DLMM_PROGRAM_ID:', key.toBase58());
    return key;
  })();

  // Default liquidity amount from platform (configurable)
  private readonly DEFAULT_PLATFORM_LIQUIDITY_SOL = 0.5;

  constructor(
    private meteoraService: MeteoraService,
    @InjectRepository(MeteoraPool)
    private poolRepository: Repository<MeteoraPool>,
    @InjectRepository(LpPosition)
    private lpPositionRepository: Repository<LpPosition>,
  ) {}

  /**
   * Get platform wallet keypair from environment
   */
  private getPlatformWallet(): Keypair {
    const platformWalletKey = process.env.PLATFORM_WALLET_KEYPAIR;
    if (!platformWalletKey) {
      throw new Error('PLATFORM_WALLET_KEYPAIR not configured');
    }

    const keypairArray = JSON.parse(platformWalletKey);
    return Keypair.fromSecretKey(new Uint8Array(keypairArray));
  }

  /**
   * Create DLMM pool and add platform-controlled liquidity for bot's token
   */
  async createPoolAndAddLiquidity(
    tokenMint: string,
    initialPrice: number,
    botCreatorId?: string,
    botWallet?: string,
  ): Promise<{
    poolAddress: string;
    positionPubkey: string;
    poolSignature: string;
    liquiditySignature: string;
  }> {
    const connection = this.meteoraService.getConnection();
    const platformWallet = this.getPlatformWallet();
    console.log('[PublicKey] auto-pool-creation.service.ts:84 - Before creating PublicKey from tokenMint:', tokenMint);
    const tokenMintPubkey = new PublicKey(tokenMint);
    console.log('[PublicKey] auto-pool-creation.service.ts:84 - After creating PublicKey:', tokenMintPubkey.toBase58());

    try {
      this.logger.log(`Creating pool for token ${tokenMint} with initial price ${initialPrice}`);

      // Check platform wallet balance
      const balance = await connection.getBalance(platformWallet.publicKey);
      const requiredBalance = (this.DEFAULT_PLATFORM_LIQUIDITY_SOL + 0.5) * LAMPORTS_PER_SOL;

      if (balance < requiredBalance) {
        throw new Error(
          `Platform wallet insufficient balance. Have: ${balance / LAMPORTS_PER_SOL} SOL, Need: ${requiredBalance / LAMPORTS_PER_SOL} SOL`,
        );
      }

      // Step 1: Create Meteora DLMM pool
      const binStep = new BN(25); // 0.25% bin step
      const feeBps = new BN(25); // 0.25% fee
      const activeId = new BN(this.calculateActiveBinId(initialPrice, 25));

      this.logger.log(`Pool parameters - BinStep: ${binStep.toString()}, ActiveId: ${activeId.toString()}`);

      const createPoolTx = await DLMM.createCustomizablePermissionlessLbPair(
        connection,
        binStep,
        tokenMintPubkey, // tokenX (bot's token)
        this.NATIVE_SOL, // tokenY (SOL)
        activeId,
        feeBps,
        ActivationType.Timestamp,
        false, // hasAlphaVault
        platformWallet.publicKey,
        new BN(Math.floor(Date.now() / 1000)), // activate now
        false, // creatorPoolOnOffControl
      );

      // Add compute budget
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 400_000,
      });

      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 50_000,
      });

      const poolTransaction = new Transaction()
        .add(modifyComputeUnits)
        .add(addPriorityFee)
        .add(...createPoolTx.instructions);

      this.logger.log('Creating DLMM pool...');

      const poolSignature = await sendAndConfirmTransaction(
        connection,
        poolTransaction,
        [platformWallet],
        {
          commitment: 'confirmed',
          maxRetries: 3,
        },
      );

      this.logger.log(`Pool created: ${poolSignature}`);

      // Wait for pool to be indexed
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Find the created pool address
      const poolPubkey = await DLMM.getCustomizablePermissionlessLbPairIfExists(
        connection,
        tokenMintPubkey,
        this.NATIVE_SOL,
      );

      if (!poolPubkey) {
        throw new Error('Pool not found after creation');
      }

      const poolAddress = poolPubkey.toBase58();
      this.logger.log(`Pool address: ${poolAddress}`);

      // Step 2: Add initial liquidity
      const { positionPubkey, liquiditySignature } = await this.addInitialLiquidity(
        connection,
        platformWallet,
        poolAddress,
        this.DEFAULT_PLATFORM_LIQUIDITY_SOL,
      );

      // Step 3: Create fee claimer vault
      // Fee claimer vault is now managed by DBC on-chain
      // No need to track in database - use DBC SDK's getPoolFeeBreakdown() instead
      this.logger.log(`Pool fees will be tracked on-chain by DBC`);

      // Step 4: Save pool to database
      const pool = this.poolRepository.create({
        poolAddress,
        tokenAddress: tokenMint,
        baseTokenAddress: this.NATIVE_SOL.toBase58(),
        tokenName: 'Bot Token', // Bot can update this later
        tokenSymbol: 'BTKN',
        creator: botWallet || platformWallet.publicKey.toBase58(),
        creatorBotId: botCreatorId,
        creatorBotWallet: botWallet,
        creatorRevenueSharePercent: 50,
        binStep: 25,
        activeId: this.calculateActiveBinId(initialPrice, 25),
        currentPrice: initialPrice,
        volume24h: 0,
        liquidity: this.DEFAULT_PLATFORM_LIQUIDITY_SOL,
        tvl: this.DEFAULT_PLATFORM_LIQUIDITY_SOL * initialPrice,
        feeRate: 25,
        platformFeesCollected: 0,
        launchFeeCollected: 0.05,
        isActive: true,
      });

      await this.poolRepository.save(pool);
      this.logger.log('Pool saved to database');

      // Step 5: Record LP position
      const lpPosition = this.lpPositionRepository.create({
        poolAddress,
        tokenAddress: tokenMint,
        botCreatorId,
        botWallet: botWallet || platformWallet.publicKey.toBase58(),
        positionPubkey,
        initialLiquiditySol: this.DEFAULT_PLATFORM_LIQUIDITY_SOL,
        currentLiquiditySol: this.DEFAULT_PLATFORM_LIQUIDITY_SOL,
        feesCollectedSol: 0,
        withdrawnSol: 0,
        platformFeeCollected: 0,
        isActive: true,
      });

      await this.lpPositionRepository.save(lpPosition);
      this.logger.log(`LP position recorded: ${positionPubkey}`);

      return {
        poolAddress,
        positionPubkey,
        poolSignature,
        liquiditySignature,
      };
    } catch (error) {
      this.logger.error('Failed to create pool and add liquidity:', error);
      throw new Error(`Auto pool creation failed: ${error.message}`);
    }
  }

  /**
   * Add initial liquidity to pool
   */
  private async addInitialLiquidity(
    connection: Connection,
    platformWallet: Keypair,
    poolAddress: string,
    liquidityAmountSOL: number,
  ): Promise<{ positionPubkey: string; liquiditySignature: string }> {
    try {
      this.logger.log(`Adding ${liquidityAmountSOL} SOL liquidity to pool ${poolAddress}`);

      console.log('[PublicKey] auto-pool-creation.service.ts:248 - Before creating PublicKey from poolAddress:', poolAddress);
      const poolPubkey = new PublicKey(poolAddress);
      console.log('[PublicKey] auto-pool-creation.service.ts:248 - After creating PublicKey:', poolPubkey.toBase58());
      const dlmm = await DLMM.create(connection, poolPubkey);

      // Generate position keypair
      const positionKeypair = Keypair.generate();
      const positionPubkey = positionKeypair.publicKey.toBase58();

      this.logger.log(`Position pubkey: ${positionPubkey}`);

      // Get active bin and set liquidity range
      const activeBin = await dlmm.getActiveBin();
      const minBinId = Number(activeBin.binId) - 3;
      const maxBinId = Number(activeBin.binId) + 3;

      this.logger.log(`Active bin: ${activeBin.binId}, Range: ${minBinId} to ${maxBinId}`);

      // Calculate SOL amount in lamports
      const solAmount = liquidityAmountSOL * LAMPORTS_PER_SOL;

      // Initialize position and add liquidity
      const addLiquidityTx = await dlmm.initializePositionAndAddLiquidityByStrategy({
        positionPubKey: positionKeypair.publicKey,
        totalXAmount: new BN(0), // Let it calculate based on SOL
        totalYAmount: new BN(solAmount),
        strategy: {
          minBinId,
          maxBinId,
          strategyType: StrategyType.Spot,
        },
        user: platformWallet.publicKey,
        slippage: 500, // 5% slippage
      });

      // Add compute budget
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 600_000,
      });

      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 50_000,
      });

      const transaction = new Transaction()
        .add(modifyComputeUnits)
        .add(addPriorityFee)
        .add(...addLiquidityTx.instructions);

      this.logger.log('Adding liquidity to pool...');

      const liquiditySignature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [platformWallet, positionKeypair],
        {
          commitment: 'confirmed',
          maxRetries: 3,
        },
      );

      this.logger.log(`Liquidity added: ${liquiditySignature}`);

      return {
        positionPubkey,
        liquiditySignature,
      };
    } catch (error) {
      this.logger.error('Failed to add initial liquidity:', error);
      throw error;
    }
  }

  /**
   * Calculate active bin ID from price
   */
  private calculateActiveBinId(price: number, binStep: number): number {
    if (price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    const priceRatio = 1 + binStep / 10000;
    const binId = Math.floor(Math.log(price) / Math.log(priceRatio));

    this.logger.log(`Calculated binId ${binId} from price ${price} and binStep ${binStep}`);

    return binId;
  }
}
