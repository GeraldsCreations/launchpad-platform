import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PoolCreationService } from '../services/pool-creation.service';
import { PriceOracleService } from '../services/price-oracle.service';
import { MeteoraService } from '../services/meteora.service';
import { MeteoraPool } from '../entities/meteora-pool.entity';
import {
  CreateTokenDto,
  CreateTokenResponseDto,
} from '../dto/create-token.dto';
import {
  PoolInfoDto,
  TokenInfoDto,
  TrendingTokenDto,
} from '../dto/pool-info.dto';

@ApiTags('Meteora Tokens')
@Controller('api/v1/tokens')
export class TokensController {
  constructor(
    private poolCreationService: PoolCreationService,
    private priceOracleService: PriceOracleService,
    private meteoraService: MeteoraService,
    @InjectRepository(MeteoraPool)
    private poolRepository: Repository<MeteoraPool>,
  ) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new token and Meteora pool' })
  @ApiResponse({
    status: 201,
    description: 'Token and pool created successfully',
    type: CreateTokenResponseDto,
  })
  async createToken(
    @Body() dto: CreateTokenDto,
  ): Promise<CreateTokenResponseDto> {
    return await this.poolCreationService.createTokenAndPool(dto);
  }

  // IMPORTANT: Specific routes must come BEFORE wildcard routes!

  @Get('trending')
  @ApiOperation({ summary: 'Get trending tokens' })
  @ApiResponse({
    status: 200,
    description: 'Trending tokens retrieved',
    type: TrendingTokenDto,
  })
  async getTrendingTokens(
    @Query('limit') limit: number = 10,
  ): Promise<TrendingTokenDto> {
    const pools = await this.poolRepository.find({
      where: { isActive: true },
      order: { volume24h: 'DESC' },
      take: limit,
    });

    const tokens = await Promise.all(
      pools.map(async (pool) => {
        const priceChange24h = await this.priceOracleService.getPriceChange24h(
          pool.poolAddress,
        );

        return {
          address: pool.tokenAddress,
          name: pool.tokenName,
          symbol: pool.tokenSymbol,
          poolAddress: pool.poolAddress,
          currentPrice: Number(pool.currentPrice),
          volume24h: Number(pool.volume24h),
          liquidity: Number(pool.liquidity),
          priceChange24h,
          createdAt: pool.createdAt,
        };
      }),
    );

    return {
      tokens,
      total: tokens.length,
    };
  }

  @Get('new')
  @ApiOperation({ summary: 'Get newly created tokens' })
  @ApiResponse({
    status: 200,
    description: 'New tokens retrieved',
    type: TrendingTokenDto,
  })
  async getNewTokens(
    @Query('limit') limit: number = 10,
  ): Promise<TrendingTokenDto> {
    const pools = await this.poolRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    const tokens = await Promise.all(
      pools.map(async (pool) => {
        const priceChange24h = await this.priceOracleService.getPriceChange24h(
          pool.poolAddress,
        );

        return {
          address: pool.tokenAddress,
          name: pool.tokenName,
          symbol: pool.tokenSymbol,
          poolAddress: pool.poolAddress,
          currentPrice: Number(pool.currentPrice),
          volume24h: Number(pool.volume24h),
          liquidity: Number(pool.liquidity),
          priceChange24h,
          createdAt: pool.createdAt,
        };
      }),
    );

    return {
      tokens,
      total: tokens.length,
    };
  }

  // Wildcard route MUST be last!
  @Get(':address')
  @ApiOperation({ summary: 'Get token information' })
  @ApiResponse({
    status: 200,
    description: 'Token information retrieved',
    type: TokenInfoDto,
  })
  async getToken(@Param('address') address: string): Promise<TokenInfoDto> {
    const pool = await this.poolRepository.findOne({
      where: { tokenAddress: address },
    });

    if (!pool) {
      throw new Error('Token not found');
    }

    const priceChange24h = await this.priceOracleService.getPriceChange24h(
      pool.poolAddress,
    );

    return {
      address: pool.tokenAddress,
      name: pool.tokenName,
      symbol: pool.tokenSymbol,
      poolAddress: pool.poolAddress,
      currentPrice: Number(pool.currentPrice),
      volume24h: Number(pool.volume24h),
      liquidity: Number(pool.liquidity),
      priceChange24h,
      createdAt: pool.createdAt,
    };
  }
}
