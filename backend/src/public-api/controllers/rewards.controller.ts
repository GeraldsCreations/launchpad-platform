import { Controller, Get, Post, Param, Query, Logger } from '@nestjs/common';
import { RewardsService } from '../services/rewards.service';

@Controller('rewards')
export class RewardsController {
  private readonly logger = new Logger(RewardsController.name);

  constructor(private readonly rewardsService: RewardsService) {}

  /**
   * Get all bot creator leaderboard
   * GET /v1/rewards/leaderboard?limit=10
   */
  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    try {
      const topBots = await this.rewardsService.getTopEarners(
        parseInt(limit || '10', 10)
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
   * Get bot creator rewards
   * GET /v1/rewards/:botWallet
   */
  @Get(':botWallet')
  async getBotRewards(@Param('botWallet') botWallet: string) {
    try {
      const rewards = await this.rewardsService.getBotRewards(botWallet);
      
      return {
        success: true,
        botWallet,
        totalEarned: rewards.totalEarned,
        claimed: rewards.claimed,
        unclaimed: rewards.unclaimed,
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
   * Claim/withdraw bot creator fees
   * POST /v1/rewards/:botWallet/claim
   * 
   * Returns unsigned transaction for bot to sign
   */
  @Post(':botWallet/claim')
  async claimBotRewards(@Param('botWallet') botWallet: string) {
    try {
      this.logger.log(`Processing fee claim for bot: ${botWallet}`);
      
      const result = await this.rewardsService.buildClaimTransaction(botWallet);

      return {
        success: true,
        botWallet,
        amount: result.amount,
        amountSol: result.amountSol,
        transaction: result.transaction,
        message: 'Sign and submit this transaction to claim your fees.',
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
