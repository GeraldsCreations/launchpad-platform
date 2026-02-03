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
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import DLMM, { ActivationType, StrategyType, LBCLMM_PROGRAM_IDS } from '@meteora-ag/dlmm';
import BN from 'bn.js';
import { MeteoraService } from './meteora.service';
import { MeteoraPool } from '../entities/meteora-pool.entity';
import { MeteoraTransaction, TransactionType } from '../entities/meteora-transaction.entity';
// FeeClaimerVault removed - DBC handles fee tracking on-chain
import { CreateTokenDto } from '../dto/create-token.dto';

@Injectable()
export class PoolCreationService {
  private readonly logger = new Logger(PoolCreationService.name);

  // Native SOL mint address (wrapped SOL)
  private readonly NATIVE_SOL = new PublicKey('So11111111111111111111111111111111111111112');
  
  // Meteora DLMM program ID (devnet)
  private readonly DLMM_PROGRAM_ID = new PublicKey(LBCLMM_PROGRAM_IDS['devnet']);

  constructor(
    private meteoraService: MeteoraService,
    @InjectRepository(MeteoraPool)
    private poolRepository: Repository<MeteoraPool>,
    @InjectRepository(MeteoraTransaction)
    private transactionRepository: Repository<MeteoraTransaction>,
  ) {}

  /**
   * Create a new token and Meteora DLMM pool
   */
  async createTokenAndPool(dto: CreateTokenDto) {
    const connection = this.meteoraService.getConnection();

    try {
      // Load platform wallet from environment
      const platformWalletKey = process.env.PLATFORM_WALLET_KEYPAIR;
      if (!platformWalletKey) {
        throw new Error('PLATFORM_WALLET_KEYPAIR not configured');
      }
      
      const keypairArray = JSON.parse(platformWalletKey);
      const creatorKeypair = Keypair.fromSecretKey(new Uint8Array(keypairArray));
      
      this.logger.log(`Creating token with symbol: ${dto.symbol} using platform wallet: ${creatorKeypair.publicKey.toBase58()}`);

      // Check balance
      const balance = await connection.getBalance(creatorKeypair.publicKey);
      const requiredBalance = (dto.initialLiquidity + 0.5) * LAMPORTS_PER_SOL; // Liquidity + fees
      
      if (balance < requiredBalance) {
        throw new Error(`Insufficient balance. Have: ${balance / LAMPORTS_PER_SOL} SOL, Need: ${requiredBalance / LAMPORTS_PER_SOL} SOL`);
      }

      this.logger.log(`Platform wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);

      // Step 1: Create the token mint
      const tokenMint = await this.createTokenMint(
        connection,
        creatorKeypair,
        dto,
      );

      this.logger.log(`Token mint created: ${tokenMint.toBase58()}`);

      // Step 2: Create Meteora DLMM pool
      const { poolAddress, signature: createPoolSig } = await this.createMeteoraPool(
        connection,
        creatorKeypair,
        tokenMint,
        dto,
      );

      this.logger.log(`Meteora pool created: ${poolAddress}`);

      // Step 3: Add initial liquidity
      const liquiditySig = await this.addInitialLiquidity(
        connection,
        creatorKeypair,
        poolAddress,
        tokenMint,
        dto.initialLiquidity,
      );

      this.logger.log(`Initial liquidity added: ${liquiditySig}`);

      // Step 4: Create fee claimer vault
      // Fee claimer vault is now managed by DBC on-chain
      // No need to track in database - use DBC SDK's getPoolFeeBreakdown() instead
      this.logger.log(`Pool fees will be tracked on-chain by DBC`);

      // Step 5: Save pool to database
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
      pool.activeId = this.calculateActiveBinId(dto.initialPrice, dto.binStep || 25);
      pool.currentPrice = dto.initialPrice;
      pool.volume24h = 0;
      pool.liquidity = dto.initialLiquidity;
      pool.tvl = dto.initialLiquidity * dto.initialPrice;
      pool.feeRate = dto.feeBps || 25;
      pool.platformFeesCollected = 0;
      pool.launchFeeCollected = 0.05; // ~0.05 SOL for transaction fees
      pool.isActive = true;

      await this.poolRepository.save(pool);

      // Step 6: Record creation transaction
      const transaction = this.transactionRepository.create({
        signature: createPoolSig,
        poolAddress,
        wallet: dto.creator,
        txType: TransactionType.CREATE,
        tokenAmount: 0,
        solAmount: dto.initialLiquidity + 0.05,
        price: dto.initialPrice,
        platformFee: 0.05,
        success: true,
      });

      await this.transactionRepository.save(transaction);

      return {
        success: true,
        poolAddress,
        tokenAddress: tokenMint.toBase58(),
        signature: createPoolSig,
        liquiditySignature: liquiditySig,
        launchFee: 0.05,
        message: 'Token and pool created successfully',
      };
    } catch (error) {
      this.logger.error('Failed to create token and pool:', error);
      throw new Error(`Pool creation failed: ${error.message}`);
    }
  }

  /**
   * Create token mint with initial supply
   */
  private async createTokenMint(
    connection: Connection,
    payer: Keypair,
    dto: CreateTokenDto,
  ): Promise<PublicKey> {
    try {
      this.logger.log('Creating SPL token mint...');
      
      // Create mint with 9 decimals (standard for SPL tokens)
      const mint = await createMint(
        connection,
        payer,
        payer.publicKey, // mint authority
        null, // freeze authority (none)
        9, // decimals
        undefined, // keypair (auto-generate)
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID,
      );

      this.logger.log(`Mint created: ${mint.toBase58()}`);

      // Create token account for platform wallet
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        payer.publicKey,
        false, // allowOwnerOffCurve
        'confirmed',
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID,
      );

      this.logger.log(`Token account created: ${tokenAccount.address.toBase58()}`);

      // Mint initial supply (1 billion tokens)
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

      this.logger.log(`Minted ${initialSupply.toString()} tokens to platform wallet`);

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
  ): Promise<{ poolAddress: string; signature: string }> {
    try {
      this.logger.log('Creating Meteora DLMM pool...');
      
      const binStep = new BN(dto.binStep || 25);
      const feeBps = new BN(dto.feeBps || 25);
      const activeId = new BN(this.calculateActiveBinId(dto.initialPrice, dto.binStep || 25));

      this.logger.log(`Pool parameters - BinStep: ${binStep.toString()}, FeeBps: ${feeBps.toString()}, ActiveId: ${activeId.toString()}`);

      // Create customizable permissionless LB pair
      // tokenX = new token, tokenY = SOL (native)
      const createPoolTx = await DLMM.createCustomizablePermissionlessLbPair(
        connection,
        binStep,
        tokenMint, // tokenX (the new token)
        this.NATIVE_SOL, // tokenY (SOL)
        activeId,
        feeBps,
        ActivationType.Timestamp, // Activate immediately
        false, // hasAlphaVault
        creator.publicKey,
        new BN(Math.floor(Date.now() / 1000)), // activationPoint (now)
        false, // creatorPoolOnOffControl
      );

      // Add compute budget to avoid transaction failures
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 400_000,
      });

      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 50_000,
      });

      // Combine instructions
      const transaction = new Transaction()
        .add(modifyComputeUnits)
        .add(addPriorityFee)
        .add(...createPoolTx.instructions);

      // Sign and send transaction
      this.logger.log('Sending pool creation transaction...');
      
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [creator],
        {
          commitment: 'confirmed',
          maxRetries: 3,
        },
      );

      this.logger.log(`Pool creation tx: ${signature}`);

      // Wait a moment for the pool to be indexed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Find the created pool address
      const poolPubkey = await DLMM.getCustomizablePermissionlessLbPairIfExists(
        connection,
        tokenMint,
        this.NATIVE_SOL,
      );

      if (!poolPubkey) {
        throw new Error('Pool not found after creation');
      }

      const poolAddress = poolPubkey.toBase58();
      this.logger.log(`Pool address retrieved: ${poolAddress}`);

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
   * Add initial liquidity to the pool
   */
  private async addInitialLiquidity(
    connection: Connection,
    payer: Keypair,
    poolAddress: string,
    tokenMint: PublicKey,
    liquidityAmountSOL: number,
  ): Promise<string> {
    try {
      this.logger.log(`Adding ${liquidityAmountSOL} SOL initial liquidity...`);

      // Get DLMM instance
      const dlmm = await DLMM.create(connection, new PublicKey(poolAddress));

      // Generate position keypair
      const positionKeypair = Keypair.generate();
      this.logger.log(`Position pubkey: ${positionKeypair.publicKey.toBase58()}`);

      // Calculate token amounts
      // We're providing SOL (tokenY), so calculate how many tokens (tokenX) to provide
      const solAmount = liquidityAmountSOL * LAMPORTS_PER_SOL;
      
      // For initial liquidity, we'll use a spot concentration strategy
      // This puts all liquidity in bins around the active bin
      const activeBin = await dlmm.getActiveBin();
      const minBinId = Number(activeBin.binId) - 3; // 3 bins below
      const maxBinId = Number(activeBin.binId) + 3; // 3 bins above

      this.logger.log(`Active bin: ${activeBin.binId}, Range: ${minBinId} to ${maxBinId}`);

      // Initialize position and add liquidity using balanced strategy
      const addLiquidityTx = await dlmm.initializePositionAndAddLiquidityByStrategy({
        positionPubKey: positionKeypair.publicKey,
        totalXAmount: new BN(0), // We'll let it calculate based on SOL
        totalYAmount: new BN(solAmount),
        strategy: {
          minBinId,
          maxBinId,
          strategyType: StrategyType.Spot,
        },
        user: payer.publicKey,
        slippage: 500, // 5% slippage tolerance
      });

      // Add compute budget
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 600_000,
      });

      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 50_000,
      });

      // Combine instructions
      const transaction = new Transaction()
        .add(modifyComputeUnits)
        .add(addPriorityFee)
        .add(...addLiquidityTx.instructions);

      this.logger.log('Sending liquidity transaction...');

      // Sign and send
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, positionKeypair],
        {
          commitment: 'confirmed',
          maxRetries: 3,
        },
      );

      this.logger.log(`Liquidity added: ${signature}`);

      return signature;
    } catch (error) {
      this.logger.error('Failed to add initial liquidity:', error);
      throw error;
    }
  }

  /**
   * Calculate active bin ID from price
   * Formula: binId = floor(log(price) / log(1 + binStep/10000))
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
