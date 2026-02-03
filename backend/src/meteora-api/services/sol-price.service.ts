import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { WebsocketGateway } from '../../websocket/websocket.gateway';

export interface SolPriceData {
  price: number;
  lastUpdated: number;
  source: string;
}

@Injectable()
export class SolPriceService {
  private readonly logger = new Logger(SolPriceService.name);
  
  // Cache for 1 minute
  private cachedPrice: SolPriceData | null = null;
  private readonly CACHE_DURATION_MS = 60 * 1000; // 1 minute

  // Price update callbacks
  private priceUpdateListeners: Array<(price: SolPriceData) => void> = [];

  constructor(
    @Inject(forwardRef(() => WebsocketGateway))
    private readonly websocketGateway: WebsocketGateway,
  ) {
    // Fetch initial price on startup
    this.updateSolPrice().catch(err => 
      this.logger.error('Failed to fetch initial SOL price:', err)
    );
  }

  /**
   * Get current SOL price (with 1-minute cache)
   */
  async getSolPrice(): Promise<SolPriceData> {
    const now = Date.now();

    // Return cached price if still valid (< 1 minute old)
    if (
      this.cachedPrice &&
      now - this.cachedPrice.lastUpdated < this.CACHE_DURATION_MS
    ) {
      return this.cachedPrice;
    }

    // Cache expired or doesn't exist - fetch new price
    return await this.updateSolPrice();
  }

  /**
   * Force update SOL price (bypass cache)
   */
  async updateSolPrice(): Promise<SolPriceData> {
    try {
      // Try multiple sources for redundancy
      const price = await this.fetchFromJupiter().catch(() =>
        this.fetchFromCoinGecko().catch(() =>
          this.fetchFromBinance()
        )
      );

      const priceData: SolPriceData = {
        price,
        lastUpdated: Date.now(),
        source: 'jupiter', // Could track actual source
      };

      this.cachedPrice = priceData;
      
      // Notify all listeners (WebSocket gateway)
      this.notifyPriceUpdate(priceData);

      this.logger.log(`SOL price updated: $${price.toFixed(2)}`);

      return priceData;
    } catch (error) {
      this.logger.error('Failed to update SOL price from all sources:', error);

      // If we have cached price, return it even if stale
      if (this.cachedPrice) {
        this.logger.warn('Using stale cached SOL price');
        return this.cachedPrice;
      }

      // Fallback to reasonable default if everything fails
      const fallbackPrice: SolPriceData = {
        price: 150, // Reasonable fallback
        lastUpdated: Date.now(),
        source: 'fallback',
      };

      this.cachedPrice = fallbackPrice;
      return fallbackPrice;
    }
  }

  /**
   * Fetch SOL price from Jupiter aggregator (fastest, most accurate)
   */
  private async fetchFromJupiter(): Promise<number> {
    try {
      // Jupiter price API
      const response = await axios.get(
        'https://price.jup.ag/v4/price?ids=SOL',
        { timeout: 5000 }
      );

      if (response.data?.data?.SOL?.price) {
        return parseFloat(response.data.data.SOL.price);
      }

      throw new Error('Invalid Jupiter response format');
    } catch (error) {
      this.logger.warn('Jupiter price fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Fetch SOL price from CoinGecko (backup)
   */
  private async fetchFromCoinGecko(): Promise<number> {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
        { timeout: 5000 }
      );

      if (response.data?.solana?.usd) {
        return parseFloat(response.data.solana.usd);
      }

      throw new Error('Invalid CoinGecko response format');
    } catch (error) {
      this.logger.warn('CoinGecko price fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Fetch SOL price from Binance (backup)
   */
  private async fetchFromBinance(): Promise<number> {
    try {
      const response = await axios.get(
        'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT',
        { timeout: 5000 }
      );

      if (response.data?.price) {
        return parseFloat(response.data.price);
      }

      throw new Error('Invalid Binance response format');
    } catch (error) {
      this.logger.warn('Binance price fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Auto-update SOL price every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledPriceUpdate() {
    try {
      await this.updateSolPrice();
    } catch (error) {
      this.logger.error('Scheduled SOL price update failed:', error);
    }
  }

  /**
   * Register a price update listener (for WebSocket gateway)
   */
  onPriceUpdate(callback: (price: SolPriceData) => void) {
    this.priceUpdateListeners.push(callback);
  }

  /**
   * Notify all listeners of price update
   */
  private notifyPriceUpdate(priceData: SolPriceData) {
    // Broadcast to all WebSocket clients
    this.websocketGateway.emitSolPriceUpdate(priceData.price, priceData.source);

    // Notify registered callbacks
    for (const listener of this.priceUpdateListeners) {
      try {
        listener(priceData);
      } catch (error) {
        this.logger.error('Price update listener error:', error);
      }
    }
  }

  /**
   * Get time until next cache refresh (in seconds)
   */
  getCacheTimeRemaining(): number {
    if (!this.cachedPrice) return 0;

    const elapsed = Date.now() - this.cachedPrice.lastUpdated;
    const remaining = this.CACHE_DURATION_MS - elapsed;

    return Math.max(0, Math.floor(remaining / 1000));
  }

  /**
   * Convert SOL amount to USD
   */
  async solToUsd(solAmount: number): Promise<number> {
    const priceData = await this.getSolPrice();
    return solAmount * priceData.price;
  }

  /**
   * Convert USD amount to SOL
   */
  async usdToSol(usdAmount: number): Promise<number> {
    const priceData = await this.getSolPrice();
    return usdAmount / priceData.price;
  }
}
