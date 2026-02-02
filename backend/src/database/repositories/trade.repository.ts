import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Trade } from '../entities/trade.entity';

@Injectable()
export class TradeRepository {
  constructor(
    @InjectRepository(Trade)
    private readonly repository: Repository<Trade>,
  ) {}

  createQueryBuilder(alias: string) {
    return this.repository.createQueryBuilder(alias);
  }

  async findBySignature(signature: string): Promise<Trade | null> {
    return this.repository.findOne({ where: { transactionSignature: signature } });
  }

  async findByToken(tokenAddress: string, limit: number = 50): Promise<Trade[]> {
    return this.repository.find({
      where: { tokenAddress },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async findByTrader(trader: string, limit: number = 50): Promise<Trade[]> {
    return this.repository.find({
      where: { trader },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async findRecent(limit: number = 50): Promise<Trade[]> {
    return this.repository.find({
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['token'],
    });
  }

  async get24hVolume(tokenAddress: string): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await this.repository
      .createQueryBuilder('trade')
      .select('SUM(trade.amountSol)', 'volume')
      .where('trade.tokenAddress = :tokenAddress', { tokenAddress })
      .andWhere('trade.timestamp > :timestamp', { timestamp: oneDayAgo })
      .getRawOne();

    return parseFloat(result.volume) || 0;
  }

  async create(tradeData: Partial<Trade>): Promise<Trade> {
    const trade = this.repository.create(tradeData);
    return this.repository.save(trade);
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  async getTotalVolume(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('trade')
      .select('SUM(trade.amountSol)', 'totalVolume')
      .getRawOne();

    return parseFloat(result.totalVolume) || 0;
  }
}
