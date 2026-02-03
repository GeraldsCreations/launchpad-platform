import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TokenRepository } from '../../database/repositories/token.repository';
import { Token } from '../../database/entities/token.entity';
import { CreateTokenDto } from '../dto/create-token.dto';
import { BlockchainService } from './blockchain.service';
import { PublicKey } from '@solana/web3.js';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly tokenRepository: TokenRepository,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Create a new token
   */
  async createToken(createTokenDto: CreateTokenDto): Promise<Token> {
    this.logger.log(`Creating token: ${createTokenDto.symbol}`);

    // In production, this would:
    // 1. Call Solana program to create token mint
    // 2. Initialize bonding curve
    // 3. Set metadata
    // For now, we'll simulate with a mock address

    const tokenAddress = PublicKey.unique().toBase58();
    const bondingCurve = PublicKey.unique().toBase58();

    const token = await this.tokenRepository.create({
      address: tokenAddress,
      name: createTokenDto.name,
      symbol: createTokenDto.symbol,
      description: createTokenDto.description,
      imageUrl: createTokenDto.imageUrl,
      creator: createTokenDto.creator,
      creatorType: createTokenDto.creatorType || 'human',
      bondingCurve: bondingCurve,
      currentPrice: 0.0001, // Base price
      marketCap: 0,
      totalSupply: '0',
      holderCount: 0,
      volume24h: 0,
      graduated: false,
    });

    this.logger.log(`Token created: ${token.address}`);
    return token;
  }

  /**
   * Get token by address
   */
  async getToken(address: string): Promise<Token> {
    const token = await this.tokenRepository.findByAddress(address);
    
    if (!token) {
      throw new NotFoundException(`Token ${address} not found`);
    }

    return token;
  }

  /**
   * Get trending tokens
   */
  async getTrendingTokens(limit: number = 10): Promise<Token[]> {
    return this.tokenRepository.findTrending(limit);
  }

  /**
   * Get new tokens
   */
  async getNewTokens(limit: number = 10): Promise<Token[]> {
    return this.tokenRepository.findNew(limit);
  }

  /**
   * Search tokens by name or symbol
   */
  async searchTokens(query: string, limit: number = 20): Promise<Token[]> {
    return this.tokenRepository.search(query, limit);
  }

  /**
   * Get tokens by creator
   */
  async getTokensByCreator(creator: string, limit: number = 20): Promise<Token[]> {
    return this.tokenRepository.findByCreator(creator, limit);
  }

  /**
   * Get graduated tokens
   */
  async getGraduatedTokens(limit: number = 10): Promise<Token[]> {
    return this.tokenRepository.findGraduated(limit);
  }

  /**
   * Get bot-created tokens
   */
  async getBotCreatedTokens(limit: number = 50): Promise<Token[]> {
    return this.tokenRepository.findBotCreated(limit);
  }

  /**
   * Update token price and market cap
   */
  async updateTokenPrice(address: string, price: number, marketCap: number): Promise<void> {
    await this.tokenRepository.updatePrice(address, price, marketCap);
    this.logger.debug(`Updated price for ${address}: ${price} SOL`);
  }

  /**
   * Update 24h volume
   */
  async updateVolume(address: string, volume: number): Promise<void> {
    await this.tokenRepository.updateVolume(address, volume);
  }

  /**
   * Mark token as graduated
   */
  async graduateToken(address: string): Promise<void> {
    await this.tokenRepository.markGraduated(address);
    this.logger.log(`Token graduated: ${address}`);
  }

  /**
   * Get total token count
   */
  async getTotalCount(): Promise<number> {
    return this.tokenRepository.count();
  }
}
