import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FeeCollectionService } from './fee-collection.service';

@Injectable()
export class FeeCollectionScheduler {
  private readonly logger = new Logger(FeeCollectionScheduler.name);

  constructor(private feeCollectionService: FeeCollectionService) {}

  /**
   * Collect fees every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleFeeCollection() {
    this.logger.log('Running scheduled fee collection...');

    try {
      const result = await this.feeCollectionService.collectAllFees();

      this.logger.log(
        `Fee collection completed: ${result.collected}/${result.poolsProcessed} vaults, ${result.totalAmount.toFixed(4)} SOL collected`,
      );
    } catch (error) {
      this.logger.error('Fee collection job failed:', error);
    }
  }

  /**
   * Log platform stats every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async logPlatformStats() {
    try {
      const stats = await this.feeCollectionService.getPlatformStats();

      this.logger.log('=== Platform Stats ===');
      this.logger.log(`Total Fees Collected: ${stats.totalFeesCollected.toFixed(4)} SOL`);
      this.logger.log(`Total Vaults: ${stats.totalVaults}`);
      this.logger.log(`Bot Rewards (Total): ${stats.totalBotRewards.toFixed(4)} SOL`);
      this.logger.log(`Bot Rewards (Claimed): ${stats.totalClaimed.toFixed(4)} SOL`);
      this.logger.log(`Bot Rewards (Unclaimed): ${stats.totalUnclaimed.toFixed(4)} SOL`);
      this.logger.log('====================');
    } catch (error) {
      this.logger.error('Failed to log platform stats:', error);
    }
  }
}
