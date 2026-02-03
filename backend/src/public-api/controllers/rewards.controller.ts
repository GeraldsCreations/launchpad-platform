import { Controller, Get, Post, Param, Query, Logger } from '@nestjs/common';
import { RewardsService } from '../services/rewards.service';

@Controller('rewards')
export class RewardsController {
  private readonly logger = new Logger(RewardsController.name);

  constructor(private readonly rewardsService: RewardsService) {}

  /**
   * Get leaderboard - Top earning bot creators
   * GET /v1/rewards/leaderboard?limit=10
   */
  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    try {
      const topBots = await this.rewardsService.getTopEarners(
        parseInt(limit || '10', 10),
      );

      return {
        success: true,
        bots: topBots,
      };
    } catch (error) {
      this.logger.error('Failed to get leaderboard:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get bot creator's claimable fees across all pools
   * GET /v1/rewards/bot/:botWallet
   */
  @Get('bot/:botWallet')
  async getBotRewards(@Param('botWallet') botWallet: string) {
    try {
      const rewards = await this.rewardsService.getBotRewards(botWallet);

      return {
        success: true,
        botWallet,
        totalClaimable: rewards.totalClaimable,
        pools: rewards.pools,
      };
    } catch (error) {
      this.logger.error('Failed to get bot rewards:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Claim creator fees from a specific pool
   * POST /v1/rewards/pool/:poolAddress/claim
   * 
   * Body: { creatorWallet: "ABC123..." }
   * 
   * Returns unsigned transaction for creator to sign
   * Uses DBC's native CreatorService.claimCreatorTradingFee()
   */
  @Post('pool/:poolAddress/claim')
  async claimPoolFees(
    @Param('poolAddress') poolAddress: string,
    @Query('creatorWallet') creatorWallet: string,
  ) {
    try {
      if (!creatorWallet) {
        return {
          success: false,
          error: 'creatorWallet query parameter required',
        };
      }

      this.logger.log(`Processing fee claim for pool: ${poolAddress}, creator: ${creatorWallet}`);

      const result = await this.rewardsService.buildClaimTransaction(
        poolAddress,
        creatorWallet,
      );

      return {
        success: true,
        poolAddress,
        creatorWallet,
        estimatedAmount: result.estimatedAmount,
        transaction: result.transaction,
        message: 'Sign and submit this transaction to claim your creator fees from DBC.',
      };
    } catch (error) {
      this.logger.error('Failed to build claim transaction:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
