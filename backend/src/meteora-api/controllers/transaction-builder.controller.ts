import { Controller, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransactionBuilderService } from '../services/transaction-builder.service';
import {
  BuildTransactionDto,
  BuildTransactionResponseDto,
  SubmitTransactionDto,
  SubmitTransactionResponseDto,
  BuildLiquidityTransactionDto,
  BuildLiquidityTransactionResponseDto,
} from '../dto/build-transaction.dto';
import { Connection, sendAndConfirmRawTransaction, PublicKey } from '@solana/web3.js';
import { MeteoraService } from '../services/meteora.service';
import DLMM from '@meteora-ag/dlmm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeteoraPool } from '../entities/meteora-pool.entity';
import { LpPosition } from '../entities/lp-position.entity';
import { FeeClaimerVault } from '../../database/entities/fee-claimer-vault.entity';

@ApiTags('Transaction Builder')
@Controller('api/v1/transaction')
export class TransactionBuilderController {
  private readonly logger = new Logger(TransactionBuilderController.name);

  // Native SOL mint
  private readonly NATIVE_SOL = new PublicKey('So11111111111111111111111111111111111111112');

  constructor(
    private transactionBuilderService: TransactionBuilderService,
    private meteoraService: MeteoraService,
    @InjectRepository(MeteoraPool)
    private poolRepository: Repository<MeteoraPool>,
    @InjectRepository(LpPosition)
    private lpPositionRepository: Repository<LpPosition>,
    @InjectRepository(FeeClaimerVault)
    private vaultRepository: Repository<FeeClaimerVault>,
  ) {}

  @Post('build')
  @ApiOperation({ summary: 'Build unsigned token+pool creation transaction for bot to sign' })
  @ApiResponse({ status: 201, type: BuildTransactionResponseDto })
  async buildTransaction(@Body() dto: BuildTransactionDto): Promise<BuildTransactionResponseDto> {
    try {
      this.logger.log(`Building token+pool transaction for bot: ${dto.creatorBotId}, symbol: ${dto.symbol}`);

      const { transaction, tokenMint } = 
        await this.transactionBuilderService.buildTokenCreationTransaction(dto);

      return {
        transaction,
        tokenMint,
        message: `Sign this transaction with your wallet (${dto.creator}). This creates the token mint. After submission, call /build-pool to create the pool.`,
      };
    } catch (error) {
      this.logger.error('Failed to build transaction:', error);
      throw new HttpException(
        `Transaction build failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit signed transaction and trigger pool creation' })
  @ApiResponse({ status: 201, type: SubmitTransactionResponseDto })
  async submitTransaction(@Body() dto: SubmitTransactionDto): Promise<SubmitTransactionResponseDto> {
    try {
      this.logger.log(`Submitting signed transaction for mint: ${dto.tokenMint}`);

      // Verify the signed transaction
      const isValid = await this.transactionBuilderService.verifySignedTransaction(
        dto.signedTransaction,
        dto.tokenMint,
      );

      if (!isValid) {
        throw new Error('Invalid transaction signature');
      }

      // Broadcast transaction to network
      const connection = this.meteoraService.getConnection();
      const transactionBuffer = Buffer.from(dto.signedTransaction, 'base64');

      this.logger.log('Broadcasting transaction to Solana network...');

      const signature = await sendAndConfirmRawTransaction(
        connection,
        transactionBuffer,
        {
          commitment: 'confirmed',
          maxRetries: 3,
        },
      );

      this.logger.log(`Token+Pool created successfully! Signature: ${signature}`);

      // Wait a moment for pool to be indexed
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Find the created pool address
      const poolPubkey = await DLMM.getCustomizablePermissionlessLbPairIfExists(
        connection,
        new PublicKey(dto.tokenMint),
        this.NATIVE_SOL,
      );

      if (!poolPubkey) {
        throw new Error('Pool not found after creation. Please retry.');
      }

      const poolAddress = poolPubkey.toBase58();
      this.logger.log(`Pool found: ${poolAddress}`);

      // Save pool to database (without LP yet)
      const pool = this.poolRepository.create({
        poolAddress,
        tokenAddress: dto.tokenMint,
        baseTokenAddress: this.NATIVE_SOL.toBase58(),
        tokenName: 'Bot Token',
        tokenSymbol: 'BTKN',
        creator: dto.creator,
        creatorBotId: dto.creatorBotId,
        creatorBotWallet: dto.creator,
        creatorRevenueSharePercent: 50,
        binStep: 25,
        activeId: this.calculateActiveBinId(dto.initialPrice, 25),
        currentPrice: dto.initialPrice,
        volume24h: 0,
        liquidity: 0, // Will be set after liquidity is added
        tvl: 0,
        feeRate: 25,
        platformFeesCollected: 0,
        launchFeeCollected: 0.05,
        isActive: true,
      });

      await this.poolRepository.save(pool);

      return {
        success: true,
        signature,
        tokenMint: dto.tokenMint,
        poolAddress,
        message: 'Token and pool created successfully!',
        nextSteps: `Now call POST /api/v1/transaction/build-liquidity with poolAddress: ${poolAddress} to build liquidity transaction. You will need ${dto.liquidityAmount} SOL to add liquidity.`,
      };
    } catch (error) {
      this.logger.error('Failed to submit transaction:', error);
      throw new HttpException(
        `Transaction submission failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('build-pool-and-liquidity')
  @ApiOperation({ summary: 'Build unsigned pool creation + liquidity transaction (bot pays, platform owns LP)' })
  @ApiResponse({ status: 201 })
  async buildPoolAndLiquidityTransaction(
    @Body() dto: {
      tokenMint: string;
      initialPrice: number;
      liquidityAmount: number;
      botWallet: string;
      creatorBotId: string;
    },
  ) {
    try {
      this.logger.log(`Building pool + liquidity transaction for token ${dto.tokenMint}`);

      const { transaction, poolAddress, positionPubkey } = 
        await this.transactionBuilderService.buildPoolAndLiquidityTransaction(
          dto.tokenMint,
          dto.initialPrice,
          dto.liquidityAmount,
          dto.botWallet,
        );

      return {
        transaction,
        poolAddress,
        positionPubkey,
        message: `Sign this transaction with your wallet. Creates pool + adds ${dto.liquidityAmount} SOL liquidity. Bot pays, platform owns LP.`,
      };
    } catch (error) {
      this.logger.error('Failed to build pool + liquidity transaction:', error);
      throw new HttpException(
        `Pool + liquidity transaction build failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('submit-pool-and-liquidity')
  @ApiOperation({ summary: 'Submit signed pool + liquidity transaction' })
  @ApiResponse({ status: 201 })
  async submitPoolAndLiquidityTransaction(@Body() dto: {
    signedTransaction: string;
    poolAddress: string;
    tokenMint: string;
    positionPubkey: string;
    botWallet: string;
    initialPrice: number;
    liquidityAmount: number;
    creatorBotId: string;
  }) {
    try {
      this.logger.log(`Submitting liquidity transaction for pool ${dto.poolAddress}`);

      const connection = this.meteoraService.getConnection();
      const transactionBuffer = Buffer.from(dto.signedTransaction, 'base64');

      const signature = await sendAndConfirmRawTransaction(
        connection,
        transactionBuffer,
        {
          commitment: 'confirmed',
          maxRetries: 3,
        },
      );

      this.logger.log(`Pool + Liquidity created! Signature: ${signature}`);

      // Create pool record (pool was just created in this tx)
      const pool = this.poolRepository.create({
        poolAddress: dto.poolAddress,
        tokenAddress: dto.tokenMint,
        baseTokenAddress: this.NATIVE_SOL.toBase58(),
        tokenName: 'Bot Token', // TODO: Get from token metadata
        tokenSymbol: 'BTKN', // TODO: Get from token metadata
        creator: dto.botWallet,
        creatorBotId: dto.creatorBotId,
        creatorBotWallet: dto.botWallet,
        creatorRevenueSharePercent: 50,
        binStep: 25,
        activeId: this.calculateActiveBinId(dto.initialPrice, 25),
        currentPrice: dto.initialPrice,
        volume24h: 0,
        liquidity: dto.liquidityAmount,
        tvl: dto.liquidityAmount * dto.initialPrice,
        feeRate: 25,
        platformFeesCollected: 0,
        launchFeeCollected: 0,
        isActive: true,
      });

      await this.poolRepository.save(pool);

      // Create LP position record
      const lpPosition = this.lpPositionRepository.create({
        poolAddress: dto.poolAddress,
        tokenAddress: dto.tokenMint,
        botCreatorId: dto.creatorBotId,
        botWallet: dto.botWallet,
        positionPubkey: dto.positionPubkey,
        initialLiquiditySol: dto.liquidityAmount,
        currentLiquiditySol: dto.liquidityAmount,
        feesCollectedSol: 0,
        withdrawnSol: 0,
        platformFeeCollected: 0,
        isActive: true,
      });

      await this.lpPositionRepository.save(lpPosition);

      // Create fee claimer vault
      // TODO: Derive proper PDA
      const vault = this.vaultRepository.create({
        poolAddress: dto.poolAddress,
        tokenAddress: dto.tokenMint,
        feeClaimerPubkey: 'pending',
        totalFeesCollected: 0,
        claimedFees: 0,
        unclaimedFees: 0,
        claimCount: 0,
      });

      await this.vaultRepository.save(vault);

      return {
        success: true,
        signature,
        poolAddress: dto.poolAddress,
        positionPubkey: dto.positionPubkey,
        message: 'Pool created + liquidity added successfully! Platform now owns the LP position.',
        nextSteps: `Token launch complete! You can withdraw or sell LP via /api/v1/lp/withdraw or /api/v1/lp/sell`,
      };
    } catch (error) {
      this.logger.error('Failed to submit liquidity transaction:', error);
      throw new HttpException(
        `Liquidity submission failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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

    return binId;
  }
}
