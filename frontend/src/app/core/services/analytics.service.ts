import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { PortfolioService, TokenHolding } from '../../features/portfolio/services/portfolio.service';

export interface TradeRecord {
  id: string;
  timestamp: number;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  side: 'buy' | 'sell';
  amountSol: number;
  amountTokens: number;
  price: number;
  fee: number;
  transactionSignature?: string;
}

export interface PnLData {
  realized: number;
  unrealized: number;
  total: number;
  realizedPercent: number;
  unrealizedPercent: number;
  totalPercent: number;
}

export interface PerformanceData {
  timestamp: number;
  value: number;
  change: number;
  changePercent: number;
}

export interface TokenPerformance {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  totalInvested: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  tradeCount: number;
  avgBuyPrice: number;
  currentPrice: number;
  balance: number;
}

export interface TradingActivity {
  totalTrades: number;
  totalVolume: number;
  totalFeesPaid: number;
  buyCount: number;
  sellCount: number;
  avgTradeSize: number;
  largestTrade: number;
}

export interface AnalyticsSnapshot {
  timestamp: number;
  portfolioValue: number;
  pnl: PnLData;
  performance: PerformanceData[];
}

const TRADES_STORAGE_KEY = 'analytics_trades';
const SNAPSHOTS_STORAGE_KEY = 'analytics_snapshots';
const SNAPSHOT_INTERVAL = 3600000; // 1 hour

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private tradesSubject = new BehaviorSubject<TradeRecord[]>([]);
  public trades$ = this.tradesSubject.asObservable();

  private snapshotsSubject = new BehaviorSubject<AnalyticsSnapshot[]>([]);
  public snapshots$ = this.snapshotsSubject.asObservable();

  private pnlSubject = new BehaviorSubject<PnLData>({
    realized: 0,
    unrealized: 0,
    total: 0,
    realizedPercent: 0,
    unrealizedPercent: 0,
    totalPercent: 0
  });
  public pnl$ = this.pnlSubject.asObservable();

  private performanceSubject = new BehaviorSubject<TokenPerformance[]>([]);
  public performance$ = this.performanceSubject.asObservable();

  private activitySubject = new BehaviorSubject<TradingActivity>({
    totalTrades: 0,
    totalVolume: 0,
    totalFeesPaid: 0,
    buyCount: 0,
    sellCount: 0,
    avgTradeSize: 0,
    largestTrade: 0
  });
  public activity$ = this.activitySubject.asObservable();

  private snapshotTimer: any;

  constructor(private portfolioService: PortfolioService) {
    this.loadFromStorage();
    this.initializeSnapshots();
    this.subscribeToPortfolio();
  }

  // Load data from localStorage
  private loadFromStorage(): void {
    try {
      const tradesData = localStorage.getItem(TRADES_STORAGE_KEY);
      if (tradesData) {
        const trades: TradeRecord[] = JSON.parse(tradesData);
        this.tradesSubject.next(trades);
      }

      const snapshotsData = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (snapshotsData) {
        const snapshots: AnalyticsSnapshot[] = JSON.parse(snapshotsData);
        this.snapshotsSubject.next(snapshots);
      }
    } catch (error) {
      console.error('Failed to load analytics from storage:', error);
    }
  }

  // Save data to localStorage
  private saveToStorage(): void {
    try {
      const trades = this.tradesSubject.value;
      localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));

      const snapshots = this.snapshotsSubject.value;
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
    } catch (error) {
      console.error('Failed to save analytics to storage:', error);
    }
  }

  // Initialize periodic snapshots
  private initializeSnapshots(): void {
    // Take snapshot every hour
    this.snapshotTimer = setInterval(() => {
      this.takeSnapshot();
    }, SNAPSHOT_INTERVAL);

    // Take initial snapshot if needed
    const snapshots = this.snapshotsSubject.value;
    if (snapshots.length === 0 || Date.now() - snapshots[snapshots.length - 1].timestamp > SNAPSHOT_INTERVAL) {
      this.takeSnapshot();
    }
  }

  // Subscribe to portfolio changes and recalculate
  private subscribeToPortfolio(): void {
    combineLatest([
      this.portfolioService.holdings$,
      this.portfolioService.summary$,
      this.trades$
    ]).subscribe(([holdings, summary, trades]) => {
      this.calculatePnL(holdings, trades);
      this.calculatePerformance(holdings, trades);
      this.calculateActivity(trades);
    });
  }

  // Calculate P&L (realized + unrealized)
  private calculatePnL(holdings: TokenHolding[], trades: TradeRecord[]): void {
    let totalInvested = 0;
    let totalRealized = 0;
    let currentValue = 0;

    // Group trades by token
    const tradesByToken = new Map<string, TradeRecord[]>();
    trades.forEach(trade => {
      if (!tradesByToken.has(trade.tokenAddress)) {
        tradesByToken.set(trade.tokenAddress, []);
      }
      tradesByToken.get(trade.tokenAddress)!.push(trade);
    });

    // Calculate for each token
    holdings.forEach(holding => {
      const tokenTrades = tradesByToken.get(holding.tokenAddress) || [];
      
      let invested = 0;
      let realized = 0;
      let netBalance = 0;

      tokenTrades.forEach(trade => {
        if (trade.side === 'buy') {
          invested += trade.amountSol + trade.fee;
          netBalance += trade.amountTokens;
        } else {
          // FIFO for realized gains
          const soldValue = trade.amountSol - trade.fee;
          const costBasis = (invested / netBalance) * trade.amountTokens;
          realized += soldValue - costBasis;
          netBalance -= trade.amountTokens;
          invested -= costBasis;
        }
      });

      totalInvested += invested;
      totalRealized += realized;
      currentValue += holding.valueUSD;
    });

    const unrealized = currentValue - totalInvested;
    const total = totalRealized + unrealized;

    const realizedPercent = totalInvested > 0 ? (totalRealized / totalInvested) * 100 : 0;
    const unrealizedPercent = totalInvested > 0 ? (unrealized / totalInvested) * 100 : 0;
    const totalPercent = totalInvested > 0 ? (total / totalInvested) * 100 : 0;

    this.pnlSubject.next({
      realized: totalRealized,
      unrealized,
      total,
      realizedPercent,
      unrealizedPercent,
      totalPercent
    });
  }

  // Calculate performance by token
  private calculatePerformance(holdings: TokenHolding[], trades: TradeRecord[]): void {
    const performance: TokenPerformance[] = [];

    holdings.forEach(holding => {
      const tokenTrades = trades.filter(t => t.tokenAddress === holding.tokenAddress);
      
      let totalInvested = 0;
      let totalBought = 0;
      let buyCount = 0;

      tokenTrades.forEach(trade => {
        if (trade.side === 'buy') {
          totalInvested += trade.amountSol + trade.fee;
          totalBought += trade.amountTokens;
          buyCount++;
        }
      });

      const avgBuyPrice = totalBought > 0 ? totalInvested / totalBought : 0;
      const currentValue = holding.valueUSD;
      const pnl = currentValue - totalInvested;
      const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

      performance.push({
        tokenAddress: holding.tokenAddress,
        tokenSymbol: holding.tokenSymbol,
        tokenName: holding.tokenName,
        totalInvested,
        currentValue,
        pnl,
        pnlPercent,
        tradeCount: tokenTrades.length,
        avgBuyPrice,
        currentPrice: holding.currentPrice,
        balance: holding.balance
      });
    });

    // Sort by P&L percent (best performers first)
    performance.sort((a, b) => b.pnlPercent - a.pnlPercent);

    this.performanceSubject.next(performance);
  }

  // Calculate trading activity
  private calculateActivity(trades: TradeRecord[]): void {
    if (trades.length === 0) {
      this.activitySubject.next({
        totalTrades: 0,
        totalVolume: 0,
        totalFeesPaid: 0,
        buyCount: 0,
        sellCount: 0,
        avgTradeSize: 0,
        largestTrade: 0
      });
      return;
    }

    let totalVolume = 0;
    let totalFees = 0;
    let buyCount = 0;
    let sellCount = 0;
    let largestTrade = 0;

    trades.forEach(trade => {
      totalVolume += trade.amountSol;
      totalFees += trade.fee;
      
      if (trade.side === 'buy') {
        buyCount++;
      } else {
        sellCount++;
      }

      if (trade.amountSol > largestTrade) {
        largestTrade = trade.amountSol;
      }
    });

    const avgTradeSize = totalVolume / trades.length;

    this.activitySubject.next({
      totalTrades: trades.length,
      totalVolume,
      totalFeesPaid: totalFees,
      buyCount,
      sellCount,
      avgTradeSize,
      largestTrade
    });
  }

  // Take a snapshot of current portfolio state
  private takeSnapshot(): void {
    const holdings = this.portfolioService['holdingsSubject'].value;
    const pnl = this.pnlSubject.value;
    const portfolioValue = holdings.reduce((sum, h) => sum + h.valueUSD, 0);

    const snapshot: AnalyticsSnapshot = {
      timestamp: Date.now(),
      portfolioValue,
      pnl: { ...pnl },
      performance: []
    };

    const snapshots = [...this.snapshotsSubject.value, snapshot];
    
    // Keep last 30 days of snapshots
    const thirtyDaysAgo = Date.now() - (30 * 24 * 3600000);
    const filtered = snapshots.filter(s => s.timestamp > thirtyDaysAgo);

    this.snapshotsSubject.next(filtered);
    this.saveToStorage();
  }

  // Add a trade record
  addTrade(trade: Omit<TradeRecord, 'id'>): void {
    const newTrade: TradeRecord = {
      ...trade,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const trades = [...this.tradesSubject.value, newTrade];
    trades.sort((a, b) => b.timestamp - a.timestamp); // Most recent first

    this.tradesSubject.next(trades);
    this.saveToStorage();
  }

  // Get performance data for charting (time series)
  getPerformanceTimeSeries(timeRange: '1D' | '1W' | '1M' | 'ALL'): PerformanceData[] {
    const snapshots = this.snapshotsSubject.value;
    if (snapshots.length === 0) return [];

    const now = Date.now();
    const ranges = {
      '1D': 24 * 3600000,
      '1W': 7 * 24 * 3600000,
      '1M': 30 * 24 * 3600000,
      'ALL': Infinity
    };

    const cutoff = now - ranges[timeRange];
    const filtered = snapshots.filter(s => s.timestamp >= cutoff);

    // Generate evenly spaced data points
    const targetPoints = timeRange === '1D' ? 24 : timeRange === '1W' ? 7 : timeRange === '1M' ? 30 : filtered.length;
    
    if (filtered.length === 0) {
      // Generate mock data if no snapshots exist
      return this.generateMockPerformanceData(timeRange);
    }

    return filtered.map(snapshot => ({
      timestamp: snapshot.timestamp,
      value: snapshot.portfolioValue,
      change: snapshot.pnl.total,
      changePercent: snapshot.pnl.totalPercent
    }));
  }

  // Generate mock performance data for empty state
  private generateMockPerformanceData(timeRange: '1D' | '1W' | '1M' | 'ALL'): PerformanceData[] {
    const now = Date.now();
    const points = timeRange === '1D' ? 24 : timeRange === '1W' ? 7 : 30;
    const interval = timeRange === '1D' ? 3600000 : 24 * 3600000;

    const data: PerformanceData[] = [];
    
    for (let i = 0; i < points; i++) {
      data.push({
        timestamp: now - (points - i - 1) * interval,
        value: 0,
        change: 0,
        changePercent: 0
      });
    }

    return data;
  }

  // Get top performers (best and worst)
  getTopPerformers(count: number = 5): { best: TokenPerformance[], worst: TokenPerformance[] } {
    const all = this.performanceSubject.value;
    
    return {
      best: all.slice(0, count),
      worst: all.slice(-count).reverse()
    };
  }

  // Clear all analytics data
  clearAllData(): void {
    this.tradesSubject.next([]);
    this.snapshotsSubject.next([]);
    localStorage.removeItem(TRADES_STORAGE_KEY);
    localStorage.removeItem(SNAPSHOTS_STORAGE_KEY);
  }

  // Add demo trades for testing
  addDemoTrades(): void {
    const demoTrades: Omit<TradeRecord, 'id'>[] = [
      {
        timestamp: Date.now() - 7 * 24 * 3600000,
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        tokenName: 'Wrapped SOL',
        side: 'buy',
        amountSol: 5.0,
        amountTokens: 0.0344827,
        price: 145.0,
        fee: 0.05
      },
      {
        timestamp: Date.now() - 5 * 24 * 3600000,
        tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        tokenSymbol: 'USDC',
        tokenName: 'USD Coin',
        side: 'buy',
        amountSol: 10.0,
        amountTokens: 1000,
        price: 1.0,
        fee: 0.1
      },
      {
        timestamp: Date.now() - 3 * 24 * 3600000,
        tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        tokenSymbol: 'BONK',
        tokenName: 'Bonk',
        side: 'buy',
        amountSol: 2.5,
        amountTokens: 100000,
        price: 0.000025,
        fee: 0.025
      },
      {
        timestamp: Date.now() - 1 * 24 * 3600000,
        tokenAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
        tokenSymbol: 'JUP',
        tokenName: 'Jupiter',
        side: 'buy',
        amountSol: 3.0,
        amountTokens: 1.62162,
        price: 1.85,
        fee: 0.03
      }
    ];

    demoTrades.forEach(trade => this.addTrade(trade));
  }

  // Cleanup
  destroy(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
    }
  }
}
