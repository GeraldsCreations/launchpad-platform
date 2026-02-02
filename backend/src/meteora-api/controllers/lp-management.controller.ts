import { Controller, Post, Get, Body, Param, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LpManagementService } from '../services/lp-management.service';
import { IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// DTOs
class WithdrawLiquidityDto {
  @ApiProperty({ description: 'Bot wallet address' })
  @IsString()
  botWallet: string;

  @ApiProperty({ description: 'Pool address' })
  @IsString()
  poolAddress: string;

  @ApiProperty({ description: 'Percentage of LP to withdraw (1-100)', example: 50 })
  @IsNumber()
  @Min(1)
  @Max(100)
  percent: number;
}

class SellTokensDto {
  @ApiProperty({ description: 'Bot wallet address' })
  @IsString()
  botWallet: string;

  @ApiProperty({ description: 'Pool address' })
  @IsString()
  poolAddress: string;

  @ApiProperty({ description: 'Amount of tokens to sell', example: 1000000 })
  @IsNumber()
  @Min(0.000001)
  tokenAmount: number;
}

@ApiTags('LP Management')
@Controller('api/v1/lp')
export class LpManagementController {
  private readonly logger = new Logger(LpManagementController.name);

  constructor(private lpManagementService: LpManagementService) {}

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw liquidity from platform-controlled position' })
  @ApiResponse({ status: 201, description: 'Liquidity withdrawn successfully' })
  async withdrawLiquidity(@Body() dto: WithdrawLiquidityDto) {
    try {
      this.logger.log(`LP withdrawal request: ${dto.percent}% from ${dto.poolAddress} for ${dto.botWallet}`);

      const result = await this.lpManagementService.withdrawLiquidity(
        dto.botWallet,
        dto.poolAddress,
        dto.percent,
      );

      return {
        success: true,
        ...result,
        message: `Withdrew ${dto.percent}% of LP. Net amount after ${result.platformFee.toFixed(4)} SOL fee: ${result.netAmount.toFixed(4)} SOL`,
      };
    } catch (error) {
      this.logger.error('LP withdrawal failed:', error);
      throw new HttpException(
        `Withdrawal failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sell')
  @ApiOperation({ summary: 'Sell tokens from platform-controlled LP position' })
  @ApiResponse({ status: 201, description: 'Tokens sold successfully' })
  async sellTokens(@Body() dto: SellTokensDto) {
    try {
      this.logger.log(`Token sell request: ${dto.tokenAmount} tokens from ${dto.poolAddress} for ${dto.botWallet}`);

      const result = await this.lpManagementService.sellTokens(
        dto.botWallet,
        dto.poolAddress,
        dto.tokenAmount,
      );

      return {
        success: true,
        ...result,
        message: `Sold ${result.tokensSwapped} tokens for ${result.solReceived.toFixed(4)} SOL. Net after ${result.platformFee.toFixed(4)} SOL fee: ${result.netSol.toFixed(4)} SOL`,
      };
    } catch (error) {
      this.logger.error('Token sell failed:', error);
      throw new HttpException(
        `Sell failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('position/:botWallet/:poolAddress')
  @ApiOperation({ summary: 'Get LP position stats for a bot' })
  @ApiResponse({ status: 200, description: 'Position stats retrieved' })
  async getPositionStats(
    @Param('botWallet') botWallet: string,
    @Param('poolAddress') poolAddress: string,
  ) {
    try {
      const stats = await this.lpManagementService.getPositionStats(botWallet, poolAddress);

      return {
        success: true,
        position: stats,
      };
    } catch (error) {
      this.logger.error('Failed to get position stats:', error);
      throw new HttpException(
        `Failed to retrieve stats: ${error.message}`,
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
