import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RewardsService } from '../../public-api/services/rewards.service';

@Injectable()
export class FeeCollectionScheduler {
  private readonly logger = new Logger(FeeCollectionScheduler.name);

  constructor(private readonly rewardsService: RewardsService) {}

  /**
   * Automated platform fee collection
   * Runs every hour to claim platform's share from all DBC pools
   * Uses DBC's PartnerService.claimPartnerTradingFee()
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleFeeCollection() {
    this.logger.log('⏰ Starting automated platform fee collection...');

    try {
      const result = await this.rewardsService.claimAllPlatformFees();

      this.logger.log(
        `✅ Platform fee collection complete: ${result.poolsProcessed} pools checked, ${result.totalClaimed} SOL claimed (${result.signatures.length} transactions)`,
      );
    } catch (error) {
      this.logger.error('❌ Platform fee collection failed:', error);
    }
  }

  /**
   * Log platform stats every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async logPlatformStats() {
    this.logger.log('📊 Platform fee collection stats...');
    // Stats are logged during collection
  }
}
