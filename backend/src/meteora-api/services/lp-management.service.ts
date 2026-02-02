import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import DLMM from '@meteora-ag/dlmm';
import * as BN from 'bn.js';
import { MeteoraService } from './meteora.service';
import { LpPosition } from '../entities/lp-position.entity';
import { LpWithdrawal } from '../entities/lp-withdrawal.entity';

/**
 * Service for managing platform-controlled LP positions
 * Handles withdrawals and token sells with configurable fees
 */
@Injectable()
export class LpManagementService {
  private readonly logger = new Logger(LpManagementService.name);

  // Configurable fees (can be moved to env vars)
  private readonly LP_WITHDRAWAL_FEE_PERCENT = 10; // 10% of withdrawn LP value
  private readonly TOKEN_SELL_FEE_PERCENT = 5; // 5% of token sale proceeds

  constructor(
    private meteoraService: MeteoraService,
    @InjectRepository(LpPosition)
    private lpPositionRepository: Repository<LpPosition>,
    @InjectRepository(LpWithdrawal)
    private lpWithdrawalRepository: Repository<LpWithdrawal>,
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
   * Find LP position for a bot and pool
   */
  async findPosition(botWallet: string, poolAddress: string): Promise<LpPosition> {
    const position = await this.lpPositionRepository.findOne({
      where: {
        botWallet,
        poolAddress,
        isActive: true,
      },
    });

    if (!position) {
      throw new NotFoundException(`No active LP position found for bot ${botWallet} in pool ${poolAddress}`);
    }

    return position;
  }

  /**
   * Withdraw liquidity from pool and send to bot (minus platform fee)
   */
  async withdrawLiquidity(
    botWallet: string,
    poolAddress: string,
    percentToWithdraw: number,
  ): Promise<{
    withdrawn: number;
    platformFee: number;
    netAmount: number;
    signature: string;
  }> {
    const connection = this.meteoraService.getConnection();
    const platformWallet = this.getPlatformWallet();

    try {
      this.logger.log(`Withdrawing ${percentToWithdraw}% LP for bot ${botWallet} from pool ${poolAddress}`);

      // Find LP position
      const position = await this.findPosition(botWallet, poolAddress);

      // Calculate withdrawal amounts
      const withdrawAmount = (position.currentLiquiditySol * percentToWithdraw) / 100;
      const platformFee = (withdrawAmount * this.LP_WITHDRAWAL_FEE_PERCENT) / 100;
      const netAmount = withdrawAmount - platformFee;

      this.logger.log(`Withdrawal: ${withdrawAmount} SOL, Fee: ${platformFee} SOL, Net: ${netAmount} SOL`);

      // Get DLMM instance
      const dlmm = await DLMM.create(connection, new PublicKey(poolAddress));

      // TODO: Implement actual liquidity removal with Meteora SDK
      // Get position details
      const positionPubkey = new PublicKey(position.positionPubkey);

      // Calculate BPS for removal (10000 = 100%)
      const bpsToRemove = new BN(percentToWithdraw * 100); // Convert percent to BPS

      // TODO: Need to get fromBinId and toBinId from position
      // const activeBin = await dlmm.getActiveBin();
      // const positionBinRange = await dlmm.getPositionBinRange(positionPubkey);

      // For now, placeholder logic
      this.logger.log('TODO: Implement actual liquidity removal');
      
      // Placeholder signature
      const signature = 'placeholder_withdrawal_signature';

      // TODO: Transfer net amount to bot wallet
      // This would be a SOL transfer from platform wallet to bot wallet

      // Update position in database
      position.currentLiquiditySol -= withdrawAmount;
      position.withdrawnSol += withdrawAmount;
      position.platformFeeCollected += platformFee;

      if (position.currentLiquiditySol <= 0.001) {
        position.isActive = false;
      }

      await this.lpPositionRepository.save(position);

      // Record withdrawal
      const withdrawal = this.lpWithdrawalRepository.create({
        positionId: position.id,
        botWallet,
        requestedPercent: percentToWithdraw,
        withdrawnAmountSol: withdrawAmount,
        platformFeeSol: platformFee,
        netAmountSol: netAmount,
        signature,
      });

      await this.lpWithdrawalRepository.save(withdrawal);

      return {
        withdrawn: withdrawAmount,
        platformFee,
        netAmount,
        signature,
      };
    } catch (error) {
      this.logger.error('Failed to withdraw liquidity:', error);
      throw new Error(`LP withdrawal failed: ${error.message}`);
    }
  }

  /**
   * Sell tokens from LP position
   * Removes liquidity, swaps tokens for SOL, sends net to bot (minus fee)
   */
  async sellTokens(
    botWallet: string,
    poolAddress: string,
    tokenAmount: number,
  ): Promise<{
    tokensSwapped: number;
    solReceived: number;
    platformFee: number;
    netSol: number;
    signature: string;
  }> {
    const connection = this.meteoraService.getConnection();
    const platformWallet = this.getPlatformWallet();

    try {
      this.logger.log(`Selling ${tokenAmount} tokens for bot ${botWallet} from pool ${poolAddress}`);

      // Find LP position
      const position = await this.findPosition(botWallet, poolAddress);

      // Get DLMM instance
      const dlmm = await DLMM.create(connection, new PublicKey(poolAddress));

      // First, need to remove some liquidity to get tokens
      // This is simplified - in production you'd calculate exact liquidity to remove

      // TODO: Implement token swap logic
      // 1. Remove liquidity proportional to token amount needed
      // 2. Swap tokens for SOL using Meteora swap
      // 3. Calculate fee
      // 4. Transfer net to bot

      // Placeholder response
      const solReceived = tokenAmount * position.currentLiquiditySol; // Simplified calculation
      const platformFee = (solReceived * this.TOKEN_SELL_FEE_PERCENT) / 100;
      const netSol = solReceived - platformFee;

      this.logger.log(`Token sell: ${solReceived} SOL received, Fee: ${platformFee} SOL, Net: ${netSol} SOL`);

      // Update position
      position.platformFeeCollected += platformFee;
      await this.lpPositionRepository.save(position);

      return {
        tokensSwapped: tokenAmount,
        solReceived,
        platformFee,
        netSol,
        signature: 'placeholder_signature', // TODO: Actual signature
      };
    } catch (error) {
      this.logger.error('Failed to sell tokens:', error);
      throw new Error(`Token sell failed: ${error.message}`);
    }
  }

  /**
   * Get LP position stats for a bot
   */
  async getPositionStats(botWallet: string, poolAddress: string) {
    const position = await this.findPosition(botWallet, poolAddress);

    return {
      poolAddress: position.poolAddress,
      tokenAddress: position.tokenAddress,
      initialLiquidity: position.initialLiquiditySol,
      currentLiquidity: position.currentLiquiditySol,
      feesCollected: position.feesCollectedSol,
      withdrawn: position.withdrawnSol,
      platformFeeCollected: position.platformFeeCollected,
      isActive: position.isActive,
      createdAt: position.createdAt,
    };
  }
}
