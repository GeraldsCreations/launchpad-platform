import { Controller, Get, Post, Param, Query, Logger, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Wallet } from '../../auth/decorators/wallet.decorator';
import { RewardsService } from '../services/rewards.service';

@ApiTags('Rewards')
@Controller('rewards')
export class RewardsController {
  private readonly logger = new Logger(RewardsController.name);

  constructor(private readonly rewardsService: RewardsService) {}

  /**
   * Get leaderboard - Top earning bot creators
   * GET /v1/rewards/leaderboard?limit=10
   */
  @Get('leaderboard')
  @ApiOperation({ summary: 'Get top earning bot creators' })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved successfully' })
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
  @ApiOperation({ summary: 'Get bot creator earnings' })
  @ApiResponse({ status: 200, description: 'Rewards retrieved successfully' })
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
   * Requires authentication - creator wallet must match authenticated wallet
   * Returns unsigned transaction for creator to sign
   * Uses DBC's native CreatorService.claimCreatorTradingFee()
   */
  @Post('pool/:poolAddress/claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Claim creator fees from pool (requires auth)' })
  @ApiResponse({ status: 200, description: 'Claim transaction built successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - auth token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - creator wallet must match authenticated wallet' })
  @ApiResponse({ status: 404, description: 'Pool not found or no claimable fees' })
  async claimPoolFees(
    @Param('poolAddress') poolAddress: string,
    @Query('creatorWallet') creatorWallet: string,
    @Wallet() authenticatedWallet: string,
  ) {
    try {
      if (!creatorWallet) {
        return {
          success: false,
          error: 'creatorWallet query parameter required',
        };
      }

      // Verify authenticated wallet matches creator wallet
      if (creatorWallet.toLowerCase() !== authenticatedWallet.toLowerCase()) {
        throw new UnauthorizedException(
          'Creator wallet must match authenticated wallet'
        );
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
