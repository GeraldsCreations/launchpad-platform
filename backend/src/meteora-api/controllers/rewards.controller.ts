import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { FeeCollectionService } from '../services/fee-collection.service';

@Controller('v1/rewards')
export class RewardsController {
  constructor(private feeCollectionService: FeeCollectionService) {}

  /**
   * Get bot's rewards
   * GET /api/v1/rewards/:botId
   */
  @Get(':botId')
  async getBotRewards(@Param('botId') botId: string) {
    const rewards = await this.feeCollectionService.getBotRewards(botId);

    return {
      success: true,
      data: rewards,
    };
  }

  /**
   * Claim bot rewards
   * POST /api/v1/rewards/:botId/claim
   */
  @Post(':botId/claim')
  async claimRewards(
    @Param('botId') botId: string,
    @Body() body: { botWallet: string },
  ) {
    const result = await this.feeCollectionService.claimBotRewards(
      botId,
      body.botWallet,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get bot leaderboard
   * GET /api/v1/rewards/leaderboard
   */
  @Get('leaderboard/top')
  async getLeaderboard(@Query('limit') limit?: number) {
    const leaderboard = await this.feeCollectionService.getBotLeaderboard(
      limit ? parseInt(limit.toString()) : 10,
    );

    return {
      success: true,
      data: leaderboard,
    };
  }

  /**
   * Get platform stats
   * GET /api/v1/rewards/stats/platform
   */
  @Get('stats/platform')
  async getPlatformStats() {
    const stats = await this.feeCollectionService.getPlatformStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Trigger fee collection manually (admin only)
   * POST /api/v1/rewards/collect
   */
  @Post('collect')
  async collectFees() {
    const result = await this.feeCollectionService.collectAllFees();

    return {
      success: true,
      data: result,
      message: `Collected fees from ${result.collected} vaults`,
    };
  }
}
