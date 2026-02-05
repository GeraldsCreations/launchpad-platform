import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
  Connection,
  PublicKey,
  Keypair,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import BN from 'bn.js';
import { MeteoraService } from './meteora.service';
import { MeteoraPool } from '../entities/meteora-pool.entity';
import { MeteoraTransaction, TransactionType } from '../entities/meteora-transaction.entity';
import { BuyTokenDto, SellTokenDto } from '../dto/trade.dto';

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);

  constructor(
    private meteoraService: MeteoraService,
    @InjectRepository(MeteoraPool)
    private poolRepository: Repository<MeteoraPool>,
    @InjectRepository(MeteoraTransaction)
    private transactionRepository: Repository<MeteoraTransaction>,
  ) {}

  /**
   * Buy tokens through Meteora pool
   */
  async buyTokens(dto: BuyTokenDto) {
    const connection = this.meteoraService.getConnection();

    try {
      // Get pool from database
      const pool = await this.poolRepository.findOne({
        where: { poolAddress: dto.poolAddress },
      });

      if (!pool) {
        throw new NotFoundException('Pool not found');
      }

      // In production, you'd get the user's keypair from wallet signature
      const userKeypair = Keypair.generate();

      this.logger.log(
        `Buying tokens from pool ${dto.poolAddress} with ${dto.solAmount} SOL`,
      );

      // Get DLMM instance
      const dlmm = await this.meteoraService.getDLMM(dto.poolAddress);

      // Calculate amount to swap (including platform fee)
      const platformFee = this.meteoraService.calculatePlatformFee(dto.solAmount);
      const actualSwapAmount = dto.solAmount - platformFee;

      // Convert SOL to lamports
      const amountInLamports = new BN(
        actualSwapAmount * LAMPORTS_PER_SOL,
      );

      // Get swap quote
      const slippageBps = new BN((dto.slippage || 0.05) * 10000);
      
      // Fetch bin arrays for the swap
      const binArrays = await dlmm.getBinArrayForSwap(true);
      
      const swapQuote = await dlmm.swapQuote(
        amountInLamports,
        true, // swapForY (buy token)
        slippageBps,
        binArrays,
      );

      this.logger.log(
        `Swap quote: ${Number(swapQuote.outAmount) / 10 ** dlmm.tokenY.mint.decimals} tokens`,
      );

      // Create swap transaction
      console.log('[PublicKey] trading.service.ts:90 - Before creating PublicKey from dto.poolAddress:', dto.poolAddress);
      const lbPairPubkey = new PublicKey(dto.poolAddress);
      console.log('[PublicKey] trading.service.ts:90 - After creating PublicKey:', lbPairPubkey.toBase58());
      
      const swapTx = await dlmm.swap({
        inToken: dlmm.tokenX.publicKey,
        binArraysPubkey: swapQuote.binArraysPubkey,
        inAmount: amountInLamports,
        lbPair: lbPairPubkey,
        user: userKeypair.publicKey,
        minOutAmount: swapQuote.minOutAmount,
        outToken: dlmm.tokenY.publicKey,
      });

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        swapTx,
        [userKeypair],
        { commitment: 'confirmed' },
      );

      // Calculate amounts
      const tokenAmount = Number(swapQuote.outAmount) / 10 ** dlmm.tokenY.mint.decimals;
      const currentPrice = dto.solAmount / tokenAmount;

      // Update pool stats
      pool.currentPrice = currentPrice;
      pool.volume24h = Number(pool.volume24h) + dto.solAmount;
      pool.platformFeesCollected = Number(pool.platformFeesCollected) + platformFee;
      await this.poolRepository.save(pool);

      // Record transaction
      const transaction = this.transactionRepository.create({
        signature,
        poolAddress: dto.poolAddress,
        wallet: dto.wallet,
        txType: TransactionType.BUY,
        tokenAmount,
        solAmount: dto.solAmount,
        price: currentPrice,
        platformFee,
        success: true,
      });

      await this.transactionRepository.save(transaction);

      return {
        success: true,
        signature,
        tokenAmount,
        solAmount: dto.solAmount,
        price: currentPrice,
        platformFee,
        message: 'Tokens purchased successfully',
      };
    } catch (error) {
      this.logger.error('Failed to buy tokens:', error);

      // Record failed transaction
      await this.transactionRepository.save({
        signature: 'failed',
        poolAddress: dto.poolAddress,
        wallet: dto.wallet,
        txType: TransactionType.BUY,
        tokenAmount: 0,
        solAmount: dto.solAmount,
        price: 0,
        platformFee: 0,
        success: false,
        error: error.message,
      });

      throw new Error(`Buy transaction failed: ${error.message}`);
    }
  }

  /**
   * Sell tokens through Meteora pool
   */
  async sellTokens(dto: SellTokenDto) {
    const connection = this.meteoraService.getConnection();

    try {
      // Get pool from database
      const pool = await this.poolRepository.findOne({
        where: { poolAddress: dto.poolAddress },
      });

      if (!pool) {
        throw new NotFoundException('Pool not found');
      }

      // In production, you'd get the user's keypair from wallet signature
      const userKeypair = Keypair.generate();

      this.logger.log(
        `Selling ${dto.tokenAmount} tokens from pool ${dto.poolAddress}`,
      );

      // Get DLMM instance
      const dlmm = await this.meteoraService.getDLMM(dto.poolAddress);

      // Convert token amount
      const amountInTokens = new BN(
        dto.tokenAmount * 10 ** dlmm.tokenY.mint.decimals,
      );

      // Get swap quote
      const slippageBps = new BN((dto.slippage || 0.05) * 10000);
      
      // Fetch bin arrays for the swap
      const binArrays = await dlmm.getBinArrayForSwap(false);
      
      const swapQuote = await dlmm.swapQuote(
        amountInTokens,
        false, // swapForY (sell token)
        slippageBps,
        binArrays,
      );

      const solAmount = Number(swapQuote.outAmount) / LAMPORTS_PER_SOL;

      this.logger.log(`Swap quote: ${solAmount} SOL`);

      // Create swap transaction
      console.log('[PublicKey] trading.service.ts:215 - Before creating PublicKey from dto.poolAddress:', dto.poolAddress);
      const lbPairPubkey2 = new PublicKey(dto.poolAddress);
      console.log('[PublicKey] trading.service.ts:215 - After creating PublicKey:', lbPairPubkey2.toBase58());
      
      const swapTx = await dlmm.swap({
        inToken: dlmm.tokenY.publicKey,
        binArraysPubkey: swapQuote.binArraysPubkey,
        inAmount: amountInTokens,
        lbPair: lbPairPubkey2,
        user: userKeypair.publicKey,
        minOutAmount: swapQuote.minOutAmount,
        outToken: dlmm.tokenX.publicKey,
      });

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        swapTx,
        [userKeypair],
        { commitment: 'confirmed' },
      );

      // Calculate platform fee
      const platformFee = this.meteoraService.calculatePlatformFee(solAmount);
      const actualSolReceived = solAmount - platformFee;
      const currentPrice = solAmount / dto.tokenAmount;

      // Update pool stats
      pool.currentPrice = currentPrice;
      pool.volume24h = Number(pool.volume24h) + solAmount;
      pool.platformFeesCollected = Number(pool.platformFeesCollected) + platformFee;
      await this.poolRepository.save(pool);

      // Record transaction
      const transaction = this.transactionRepository.create({
        signature,
        poolAddress: dto.poolAddress,
        wallet: dto.wallet,
        txType: TransactionType.SELL,
        tokenAmount: dto.tokenAmount,
        solAmount: actualSolReceived,
        price: currentPrice,
        platformFee,
        success: true,
      });

      await this.transactionRepository.save(transaction);

      return {
        success: true,
        signature,
        tokenAmount: dto.tokenAmount,
        solAmount: actualSolReceived,
        price: currentPrice,
        platformFee,
        message: 'Tokens sold successfully',
      };
    } catch (error) {
      this.logger.error('Failed to sell tokens:', error);

      // Record failed transaction
      await this.transactionRepository.save({
        signature: 'failed',
        poolAddress: dto.poolAddress,
        wallet: dto.wallet,
        txType: TransactionType.SELL,
        tokenAmount: dto.tokenAmount,
        solAmount: 0,
        price: 0,
        platformFee: 0,
        success: false,
        error: error.message,
      });

      throw new Error(`Sell transaction failed: ${error.message}`);
    }
  }

  /**
   * Get 24h volume for a pool
   */
  async get24hVolume(poolAddress: string): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const transactions = await this.transactionRepository.find({
      where: {
        poolAddress,
        createdAt: MoreThan(oneDayAgo),
        success: true,
      },
    });

    return transactions.reduce((sum, tx) => sum + Number(tx.solAmount), 0);
  }
}
