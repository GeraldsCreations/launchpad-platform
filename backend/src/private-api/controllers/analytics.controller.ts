import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService, DashboardStats } from '../services/analytics.service';
import { PlatformStats } from '../../database/entities/platform-stats.entity';

@ApiTags('analytics')
@Controller('analytics')
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getDashboard(): Promise<DashboardStats> {
    return this.analyticsService.getDashboardStats();
  }

  @Get('historical')
  @ApiOperation({ summary: 'Get historical statistics' })
  @ApiQuery({ name: 'startDate', required: true, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, type: String, example: '2024-01-31' })
  @ApiResponse({ status: 200, description: 'Historical stats' })
  async getHistorical(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<PlatformStats[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.analyticsService.getHistoricalStats(start, end);
  }

  @Get('top-tokens')
  @ApiOperation({ summary: 'Get top tokens by volume' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Top tokens' })
  async getTopTokens(@Query('limit') limit?: number): Promise<any[]> {
    return this.analyticsService.getTopTokensByVolume(limit || 10);
  }

  @Get('top-traders')
  @ApiOperation({ summary: 'Get top traders by volume' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Top traders' })
  async getTopTraders(@Query('limit') limit?: number): Promise<any[]> {
    return this.analyticsService.getTopTraders(limit || 10);
  }
}
