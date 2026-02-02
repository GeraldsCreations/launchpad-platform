import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getPriceOfBinByBinId } from '@meteora-ag/dlmm';
import { MeteoraService } from './meteora.service';
import { MeteoraPool } from '../entities/meteora-pool.entity';

@Injectable()
export class PriceOracleService {
  private readonly logger = new Logger(PriceOracleService.name);

  constructor(
    private meteoraService: MeteoraService,
    @InjectRepository(MeteoraPool)
    private poolRepository: Repository<MeteoraPool>,
  ) {}

  /**
   * Update prices for all active pools (runs every minute)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async updateAllPrices() {
    try {
      const activePools = await this.poolRepository.find({
        where: { isActive: true },
      });

      this.logger.log(`Updating prices for ${activePools.length} pools`);

      for (const pool of activePools) {
        try {
          await this.updatePoolPrice(pool.poolAddress);
        } catch (error) {
          this.logger.warn(
            `Failed to update price for pool ${pool.poolAddress}:`,
            error.message,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to update prices:', error);
    }
  }

  /**
   * Update price for a specific pool
   */
  async updatePoolPrice(poolAddress: string) {
    try {
      const pool = await this.poolRepository.findOne({
        where: { poolAddress },
      });

      if (!pool) {
        throw new Error('Pool not found');
      }

      // Get current price from Meteora
      const dlmm = await this.meteoraService.getDLMM(poolAddress);
      const activeBin = await dlmm.getActiveBin();
      const price = parseFloat(
        getPriceOfBinByBinId(dlmm.lbPair.binStep, Number(activeBin.binId)).toString(),
      );

      // Get liquidity info
      const poolInfo = await this.meteoraService.getPoolInfo(poolAddress);

      // Update pool
      pool.currentPrice = price;
      pool.activeId = poolInfo.activeId;
      pool.liquidity = poolInfo.liquidity.tokenX + poolInfo.liquidity.tokenY;
      pool.tvl = pool.liquidity * price;

      await this.poolRepository.save(pool);

      return {
        poolAddress,
        price,
        liquidity: pool.liquidity,
        tvl: pool.tvl,
      };
    } catch (error) {
      this.logger.error(`Failed to update pool price:`, error);
      throw error;
    }
  }

  /**
   * Get historical price data (placeholder for future implementation)
   */
  async getHistoricalPrices(
    poolAddress: string,
    timeframe: '1h' | '24h' | '7d' | '30d',
  ) {
    // TODO: Implement historical price tracking
    // For now, return current price
    const pool = await this.poolRepository.findOne({
      where: { poolAddress },
    });

    if (!pool) {
      throw new Error('Pool not found');
    }

    return {
      poolAddress,
      timeframe,
      prices: [
        {
          timestamp: new Date(),
          price: pool.currentPrice,
        },
      ],
    };
  }

  /**
   * Calculate price change percentage
   */
  async getPriceChange24h(poolAddress: string): Promise<number> {
    // TODO: Implement with historical data
    // For now, return 0
    return 0;
  }
}
