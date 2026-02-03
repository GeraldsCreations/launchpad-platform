import { Controller, Get } from '@nestjs/common';
import { SolPriceService, SolPriceData } from '../services/sol-price.service';

@Controller('sol-price')
export class SolPriceController {
  constructor(private solPriceService: SolPriceService) {}

  /**
   * Get current SOL/USD price (1-minute cache)
   * GET /api/v1/sol-price
   */
  @Get()
  async getSolPrice(): Promise<{
    success: boolean;
    data: SolPriceData;
    cacheTimeRemaining: number;
  }> {
    const priceData = await this.solPriceService.getSolPrice();
    const cacheTimeRemaining = this.solPriceService.getCacheTimeRemaining();

    return {
      success: true,
      data: priceData,
      cacheTimeRemaining, // Seconds until next refresh
    };
  }

  /**
   * Force refresh SOL price (bypass cache)
   * GET /api/v1/sol-price/refresh
   */
  @Get('refresh')
  async refreshSolPrice(): Promise<{
    success: boolean;
    data: SolPriceData;
    message: string;
  }> {
    const priceData = await this.solPriceService.updateSolPrice();

    return {
      success: true,
      data: priceData,
      message: 'SOL price refreshed successfully',
    };
  }

  /**
   * Convert SOL to USD
   * GET /api/v1/sol-price/convert?sol=10
   */
  @Get('convert')
  async convertSolToUsd(sol: number): Promise<{
    success: boolean;
    sol: number;
    usd: number;
    price: number;
  }> {
    const priceData = await this.solPriceService.getSolPrice();
    const usd = sol * priceData.price;

    return {
      success: true,
      sol,
      usd,
      price: priceData.price,
    };
  }
}
