import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { PlatformStats } from '../../database/entities/platform-stats.entity';
import { TokenRepository } from '../../database/repositories/token.repository';
import { TradeRepository } from '../../database/repositories/trade.repository';

export interface DashboardStats {
  totalTokens: number;
  totalTrades: number;
  totalVolume: number;
  activeTokens: number;
  graduatedTokens: number;
  volume24h: number;
  trades24h: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PlatformStats)
    private readonly statsRepository: Repository<PlatformStats>,
    private readonly tokenRepository: TokenRepository,
    private readonly tradeRepository: TradeRepository,
  ) {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const totalTokens = await this.tokenRepository.count();
    const totalTrades = await this.tradeRepository.count();
    const totalVolume = await this.tradeRepository.getTotalVolume();

    // Get 24h stats
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const volume24h = await this.tradeRepository
      .createQueryBuilder('trade')
      .select('SUM(trade.amountSol)', 'volume')
      .where('trade.timestamp > :timestamp', { timestamp: oneDayAgo })
      .getRawOne()
      .then((result) => parseFloat(result.volume) || 0);

    const trades24h = await this.tradeRepository
      .createQueryBuilder('trade')
      .where('trade.timestamp > :timestamp', { timestamp: oneDayAgo })
      .getCount();

    // Count active (non-graduated) and graduated tokens
    const activeTokens = await this.tokenRepository
      .createQueryBuilder('token')
      .where('token.graduated = :graduated', { graduated: false })
      .getCount();

    const graduatedTokens = await this.tokenRepository
      .createQueryBuilder('token')
      .where('token.graduated = :graduated', { graduated: true })
      .getCount();

    return {
      totalTokens,
      totalTrades,
      totalVolume,
      activeTokens,
      graduatedTokens,
      volume24h,
      trades24h,
    };
  }

  /**
   * Get historical stats for a date range
   */
  async getHistoricalStats(startDate: Date, endDate: Date): Promise<PlatformStats[]> {
    return this.statsRepository.find({
      where: {
        date: MoreThan(startDate),
      },
      order: {
        date: 'ASC',
      },
    });
  }

  /**
   * Record daily stats (should be run by cron job)
   */
  async recordDailyStats(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if today's stats already exist
    const existing = await this.statsRepository.findOne({ where: { date: today } });
    if (existing) {
      return;
    }

    const stats = await this.getDashboardStats();

    await this.statsRepository.save({
      date: today,
      totalTokens: stats.totalTokens,
      totalTrades: stats.totalTrades,
      totalVolume: stats.totalVolume,
      totalFees: stats.totalVolume * 0.01, // 1% fee
      activeUsers: 0, // Would need to track unique traders
      newTokens: 0, // Would need to count today's tokens
      graduatedTokens: stats.graduatedTokens,
    });
  }

  /**
   * Get top tokens by volume
   */
  async getTopTokensByVolume(limit: number = 10): Promise<any[]> {
    return this.tokenRepository
      .createQueryBuilder('token')
      .orderBy('token.volume24h', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Get top traders by volume
   */
  async getTopTraders(limit: number = 10): Promise<any[]> {
    return this.tradeRepository
      .createQueryBuilder('trade')
      .select('trade.trader', 'trader')
      .addSelect('COUNT(*)', 'tradeCount')
      .addSelect('SUM(trade.amountSol)', 'totalVolume')
      .groupBy('trade.trader')
      .orderBy('totalVolume', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}
