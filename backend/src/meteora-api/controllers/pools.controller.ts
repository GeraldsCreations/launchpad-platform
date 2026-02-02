import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeteoraService } from '../services/meteora.service';
import { PriceOracleService } from '../services/price-oracle.service';
import { MeteoraPool } from '../entities/meteora-pool.entity';
import { PoolInfoDto } from '../dto/pool-info.dto';

@ApiTags('Meteora Pools')
@Controller('api/v1/pool')
export class PoolsController {
  constructor(
    private meteoraService: MeteoraService,
    private priceOracleService: PriceOracleService,
    @InjectRepository(MeteoraPool)
    private poolRepository: Repository<MeteoraPool>,
  ) {}

  @Get(':address')
  @ApiOperation({ summary: 'Get pool information' })
  @ApiResponse({
    status: 200,
    description: 'Pool information retrieved',
    type: PoolInfoDto,
  })
  async getPool(@Param('address') address: string): Promise<PoolInfoDto> {
    // Get from database
    const pool = await this.poolRepository.findOne({
      where: { poolAddress: address },
    });

    if (!pool) {
      throw new Error('Pool not found');
    }

    // Get live data from Meteora
    const poolInfo = await this.meteoraService.getPoolInfo(address);

    // Update if needed
    if (Math.abs(poolInfo.currentPrice - Number(pool.currentPrice)) > 0.01) {
      await this.priceOracleService.updatePoolPrice(address);
    }

    return {
      poolAddress: pool.poolAddress,
      tokenAddress: pool.tokenAddress,
      tokenName: pool.tokenName,
      tokenSymbol: pool.tokenSymbol,
      baseTokenAddress: pool.baseTokenAddress,
      currentPrice: poolInfo.currentPrice,
      liquidity: poolInfo.liquidity.tokenX + poolInfo.liquidity.tokenY,
      tvl: Number(pool.tvl),
      volume24h: Number(pool.volume24h),
      feeRate: Number(pool.feeRate),
      binStep: poolInfo.binStep,
      activeId: poolInfo.activeId,
      creator: pool.creator,
      createdAt: pool.createdAt,
    };
  }

  @Get(':address/stats')
  @ApiOperation({ summary: 'Get pool statistics' })
  async getPoolStats(@Param('address') address: string) {
    const pool = await this.poolRepository.findOne({
      where: { poolAddress: address },
      relations: ['transactions'],
    });

    if (!pool) {
      throw new Error('Pool not found');
    }

    const totalTrades = pool.transactions.length;
    const totalVolume = pool.transactions.reduce(
      (sum, tx) => sum + Number(tx.solAmount),
      0,
    );

    return {
      poolAddress: address,
      totalTrades,
      totalVolume,
      platformFeesCollected: Number(pool.platformFeesCollected),
      launchFeeCollected: Number(pool.launchFeeCollected),
      volume24h: Number(pool.volume24h),
      liquidity: Number(pool.liquidity),
      tvl: Number(pool.tvl),
    };
  }
}
