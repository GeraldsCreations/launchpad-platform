import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, debounceTime } from 'rxjs/operators';
import { WebSocketService, PriceUpdateEvent } from '../../../core/services/websocket.service';

export interface TokenHolding {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenLogo?: string;
  balance: number;
  decimals: number;
  // Live price data
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  // Calculated values
  valueUSD: number;
  // UI state
  loading: boolean;
  priceFlash?: 'up' | 'down' | null;
}

export interface PortfolioSummary {
  totalValueUSD: number;
  totalChange24h: number;
  totalChangePercent24h: number;
  tokenCount: number;
  lastUpdated: number;
}

const STORAGE_KEY = 'portfolio_holdings';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private holdingsSubject = new BehaviorSubject<TokenHolding[]>([]);
  public holdings$ = this.holdingsSubject.asObservable();

  private summarySubject = new BehaviorSubject<PortfolioSummary>({
    totalValueUSD: 0,
    totalChange24h: 0,
    totalChangePercent24h: 0,
    tokenCount: 0,
    lastUpdated: Date.now()
  });
  public summary$ = this.summarySubject.asObservable();

  private priceUpdateTimers = new Map<string, number>();

  constructor(private wsService: WebSocketService) {
    this.loadFromStorage();
    this.subscribeToLivePrices();
  }

  // Load holdings from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const holdings: TokenHolding[] = JSON.parse(stored);
        this.holdingsSubject.next(holdings);
        this.calculateSummary();
      }
    } catch (error) {
      console.error('Failed to load portfolio from storage:', error);
    }
  }

  // Save holdings to localStorage
  private saveToStorage(): void {
    try {
      const holdings = this.holdingsSubject.value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
    } catch (error) {
      console.error('Failed to save portfolio to storage:', error);
    }
  }

  // Subscribe to live price updates for all holdings
  private subscribeToLivePrices(): void {
    this.holdings$.subscribe(holdings => {
      holdings.forEach(holding => {
        // Subscribe to price updates for each token
        this.wsService.subscribeToToken(holding.tokenAddress).subscribe({
          next: (update) => {
            if (update.event === 'price_update') {
              this.updateTokenPrice(holding.tokenAddress, update as PriceUpdateEvent);
            }
          },
          error: (error) => {
            console.error(`WebSocket error for ${holding.tokenAddress}:`, error);
          }
        });
      });
    });
  }

  // Update token price with debouncing (max 1 update/sec per token)
  private updateTokenPrice(tokenAddress: string, update: PriceUpdateEvent): void {
    const now = Date.now();
    const lastUpdate = this.priceUpdateTimers.get(tokenAddress) || 0;
    
    // Debounce: max 1 update per second per token
    if (now - lastUpdate < 1000) {
      return;
    }

    this.priceUpdateTimers.set(tokenAddress, now);

    const holdings = this.holdingsSubject.value;
    const updatedHoldings = holdings.map(holding => {
      if (holding.tokenAddress === tokenAddress) {
        const oldPrice = holding.currentPrice;
        const newPrice = update.price;
        
        // Calculate new USD value
        const valueUSD = holding.balance * newPrice;
        
        // Determine flash direction
        let priceFlash: 'up' | 'down' | null = null;
        if (newPrice > oldPrice) {
          priceFlash = 'up';
        } else if (newPrice < oldPrice) {
          priceFlash = 'down';
        }

        // Clear flash after animation
        if (priceFlash) {
          setTimeout(() => {
            this.clearPriceFlash(tokenAddress);
          }, 500);
        }

        return {
          ...holding,
          currentPrice: newPrice,
          valueUSD,
          priceFlash,
          loading: false
        };
      }
      return holding;
    });

    this.holdingsSubject.next(updatedHoldings);
    this.calculateSummary();
    this.saveToStorage();
  }

  // Clear price flash indicator
  private clearPriceFlash(tokenAddress: string): void {
    const holdings = this.holdingsSubject.value;
    const updated = holdings.map(h => 
      h.tokenAddress === tokenAddress ? { ...h, priceFlash: null } : h
    );
    this.holdingsSubject.next(updated);
  }

  // Calculate portfolio summary
  private calculateSummary(): void {
    const holdings = this.holdingsSubject.value;
    
    const totalValueUSD = holdings.reduce((sum, h) => sum + h.valueUSD, 0);
    const totalChange24h = holdings.reduce((sum, h) => {
      const change = h.valueUSD * (h.priceChangePercent24h / 100);
      return sum + change;
    }, 0);
    const totalChangePercent24h = totalValueUSD > 0 
      ? (totalChange24h / totalValueUSD) * 100 
      : 0;

    this.summarySubject.next({
      totalValueUSD,
      totalChange24h,
      totalChangePercent24h,
      tokenCount: holdings.length,
      lastUpdated: Date.now()
    });
  }

  // Add a token to portfolio
  addToken(holding: Omit<TokenHolding, 'loading' | 'priceFlash'>): void {
    const holdings = this.holdingsSubject.value;
    
    // Check if token already exists
    const exists = holdings.find(h => h.tokenAddress === holding.tokenAddress);
    if (exists) {
      console.warn('Token already in portfolio:', holding.tokenAddress);
      return;
    }

    const newHolding: TokenHolding = {
      ...holding,
      loading: true,
      priceFlash: null
    };

    this.holdingsSubject.next([...holdings, newHolding]);
    this.saveToStorage();
    this.calculateSummary();
  }

  // Remove a token from portfolio
  removeToken(tokenAddress: string): void {
    const holdings = this.holdingsSubject.value;
    const filtered = holdings.filter(h => h.tokenAddress !== tokenAddress);
    this.holdingsSubject.next(filtered);
    this.saveToStorage();
    this.calculateSummary();
  }

  // Update token balance
  updateBalance(tokenAddress: string, balance: number): void {
    const holdings = this.holdingsSubject.value;
    const updated = holdings.map(h => {
      if (h.tokenAddress === tokenAddress) {
        return {
          ...h,
          balance,
          valueUSD: balance * h.currentPrice
        };
      }
      return h;
    });
    this.holdingsSubject.next(updated);
    this.saveToStorage();
    this.calculateSummary();
  }

  // Clear all holdings
  clearPortfolio(): void {
    this.holdingsSubject.next([]);
    this.saveToStorage();
    this.calculateSummary();
  }

  // Refresh portfolio (re-fetch balances)
  refresh(): void {
    // Trigger re-calculation
    this.calculateSummary();
    
    // Mark all as loading
    const holdings = this.holdingsSubject.value.map(h => ({ ...h, loading: true }));
    this.holdingsSubject.next(holdings);
    
    // Simulate loading complete after 1 second
    setTimeout(() => {
      const updated = this.holdingsSubject.value.map(h => ({ ...h, loading: false }));
      this.holdingsSubject.next(updated);
    }, 1000);
  }

  // Add demo tokens for testing
  addDemoTokens(): void {
    const demoTokens: Omit<TokenHolding, 'loading' | 'priceFlash'>[] = [
      {
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenName: 'Wrapped SOL',
        tokenSymbol: 'SOL',
        tokenLogo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        balance: 10.5,
        decimals: 9,
        currentPrice: 145.50,
        priceChange24h: 5.25,
        priceChangePercent24h: 3.75,
        valueUSD: 10.5 * 145.50
      },
      {
        tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        tokenName: 'USD Coin',
        tokenSymbol: 'USDC',
        tokenLogo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        balance: 1000,
        decimals: 6,
        currentPrice: 1.00,
        priceChange24h: 0.01,
        priceChangePercent24h: 0.01,
        valueUSD: 1000
      },
      {
        tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        tokenName: 'Bonk',
        tokenSymbol: 'BONK',
        tokenLogo: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
        balance: 1000000,
        decimals: 5,
        currentPrice: 0.00002450,
        priceChange24h: -0.00000120,
        priceChangePercent24h: -4.67,
        valueUSD: 1000000 * 0.00002450
      },
      {
        tokenAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
        tokenName: 'Jupiter',
        tokenSymbol: 'JUP',
        tokenLogo: 'https://static.jup.ag/jup/icon.png',
        balance: 250,
        decimals: 6,
        currentPrice: 1.85,
        priceChange24h: 0.15,
        priceChangePercent24h: 8.82,
        valueUSD: 250 * 1.85
      },
      {
        tokenAddress: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
        tokenName: 'Marinade Staked SOL',
        tokenSymbol: 'mSOL',
        tokenLogo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
        balance: 5.25,
        decimals: 9,
        currentPrice: 158.20,
        priceChange24h: 4.10,
        priceChangePercent24h: 2.66,
        valueUSD: 5.25 * 158.20
      }
    ];

    demoTokens.forEach(token => this.addToken(token));
  }
}
