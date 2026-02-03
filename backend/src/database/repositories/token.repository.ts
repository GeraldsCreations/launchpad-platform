import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Token } from '../entities/token.entity';

@Injectable()
export class TokenRepository {
  constructor(
    @InjectRepository(Token)
    private readonly repository: Repository<Token>,
  ) {}

  createQueryBuilder(alias: string) {
    return this.repository.createQueryBuilder(alias);
  }

  async findByAddress(address: string): Promise<Token | null> {
    return this.repository.findOne({ where: { address } });
  }

  async findTrending(limit: number = 10): Promise<Token[]> {
    return this.repository.find({
      where: { graduated: false },
      order: { volume24h: 'DESC' },
      take: limit,
    });
  }

  async findNew(limit: number = 10): Promise<Token[]> {
    return this.repository.find({
      where: { graduated: false },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async search(query: string, limit: number = 20): Promise<Token[]> {
    return this.repository
      .createQueryBuilder('token')
      .where('token.name ILIKE :query OR token.symbol ILIKE :query', {
        query: `%${query}%`,
      })
      .orderBy('token.marketCap', 'DESC')
      .take(limit)
      .getMany();
  }

  async findByCreator(creator: string, limit: number = 20): Promise<Token[]> {
    return this.repository.find({
      where: { creator },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findGraduated(limit: number = 10): Promise<Token[]> {
    return this.repository.find({
      where: { graduated: true },
      order: { graduatedAt: 'DESC' },
      take: limit,
    });
  }

  async findBotCreated(limit: number = 50): Promise<Token[]> {
    return this.repository
      .createQueryBuilder('token')
      .where('token.creatorType IN (:...types)', {
        types: ['clawdbot', 'agent'],
      })
      .orderBy('token.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async updatePrice(address: string, price: number, marketCap: number): Promise<void> {
    await this.repository.update(address, {
      currentPrice: price,
      marketCap,
      updatedAt: new Date(),
    });
  }

  async updateVolume(address: string, volume: number): Promise<void> {
    await this.repository.update(address, {
      volume24h: volume,
      updatedAt: new Date(),
    });
  }

  async markGraduated(address: string): Promise<void> {
    await this.repository.update(address, {
      graduated: true,
      graduatedAt: new Date(),
    });
  }

  async create(tokenData: Partial<Token>): Promise<Token> {
    const token = this.repository.create(tokenData);
    return this.repository.save(token);
  }

  async count(): Promise<number> {
    return this.repository.count();
  }
}
