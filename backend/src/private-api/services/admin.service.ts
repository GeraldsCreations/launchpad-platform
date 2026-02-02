import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { IndexerService } from '../../indexer/indexer.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly indexerService: IndexerService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  /**
   * Create API key for a user
   */
  async createApiKey(wallet: string, tier: string = 'free'): Promise<string> {
    let user = await this.userRepository.findOne({ where: { wallet } });

    const apiKey = this.generateApiKey();

    if (user) {
      user.apiKey = apiKey;
      user.apiTier = tier;
      user.lastActiveAt = new Date();
    } else {
      user = this.userRepository.create({
        wallet,
        apiKey,
        apiTier: tier,
        rateLimit: this.getRateLimitForTier(tier),
      });
    }

    await this.userRepository.save(user);
    this.logger.log(`API key created for ${wallet} (${tier})`);

    return apiKey;
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(wallet: string): Promise<void> {
    await this.userRepository.update({ wallet }, { apiKey: null });
    this.logger.log(`API key revoked for ${wallet}`);
  }

  /**
   * Get user by API key
   */
  async getUserByApiKey(apiKey: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { apiKey } });
  }

  /**
   * Update user tier
   */
  async updateUserTier(wallet: string, tier: string): Promise<void> {
    const rateLimit = this.getRateLimitForTier(tier);
    await this.userRepository.update({ wallet }, { apiTier: tier, rateLimit });
    this.logger.log(`User ${wallet} upgraded to ${tier}`);
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<any> {
    const indexerStatus = this.indexerService.getStatus();
    const wsStats = this.websocketGateway.getStats();

    return {
      indexer: indexerStatus,
      websocket: wsStats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Restart indexer
   */
  async restartIndexer(): Promise<void> {
    this.logger.log('Restarting indexer...');
    await this.indexerService.stop();
    await this.indexerService.start();
    this.logger.log('Indexer restarted');
  }

  /**
   * Generate random API key
   */
  private generateApiKey(): string {
    return `lp_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Get rate limit for tier
   */
  private getRateLimitForTier(tier: string): number {
    const limits = {
      free: 100,
      starter: 1000,
      pro: 10000,
    };
    return limits[tier] || 100;
  }
}
