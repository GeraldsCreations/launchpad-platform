import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { WalletService } from '../../core/services/wallet.service';
import { AnalyticsService, PnLData, TokenPerformance, TradingActivity, PerformanceData } from '../../core/services/analytics.service';
import { PortfolioService, PortfolioSummary } from '../portfolio/services/portfolio.service';
import { PerformanceChartComponent } from './components/performance-chart/performance-chart.component';
import { TopPerformersComponent } from './components/top-performers/top-performers.component';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PerformanceChartComponent,
    TopPerformersComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalyticsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Portfolio summary
  portfolioSummary: PortfolioSummary = {
    totalValueUSD: 0,
    totalChange24h: 0,
    totalChangePercent24h: 0,
    tokenCount: 0,
    lastUpdated: Date.now()
  };

  // P&L data
  pnlData: PnLData = {
    realized: 0,
    unrealized: 0,
    total: 0,
    realizedPercent: 0,
    unrealizedPercent: 0,
    totalPercent: 0
  };

  // Performance data
  performanceData: PerformanceData[] = [];
  topPerformers: TokenPerformance[] = [];
  worstPerformers: TokenPerformance[] = [];

  // Trading activity
  tradingActivity: TradingActivity = {
    totalTrades: 0,
    totalVolume: 0,
    totalFeesPaid: 0,
    buyCount: 0,
    sellCount: 0,
    avgTradeSize: 0,
    largestTrade: 0
  };

  // UI state
  loading = true;
  walletConnected = false;
  selectedTimeframe: '1D' | '1W' | '1M' | 'ALL' = '1W';
  hasData = false;

  // Animated counters
  animatedTotalValue = 0;
  animatedPnL = 0;

  constructor(
    private analyticsService: AnalyticsService,
    private portfolioService: PortfolioService,
    private walletService: WalletService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Check wallet connection
    this.walletService.wallet$
      .pipe(takeUntil(this.destroy$))
      .subscribe((wallet) => {
        this.walletConnected = !!wallet;
        this.cdr.markForCheck();
      });

    // Subscribe to all analytics data
    this.subscribeToAnalytics();

    this.loading = false;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToAnalytics(): void {
    // Portfolio summary
    this.portfolioService.summary$
      .pipe(takeUntil(this.destroy$))
      .subscribe(summary => {
        this.portfolioSummary = summary;
        this.animateValue(this.animatedTotalValue, summary.totalValueUSD, (val) => {
          this.animatedTotalValue = val;
          this.cdr.markForCheck();
        });
        this.checkHasData();
        this.cdr.markForCheck();
      });

    // P&L data
    this.analyticsService.pnl$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pnl => {
        this.pnlData = pnl;
        this.animateValue(this.animatedPnL, pnl.total, (val) => {
          this.animatedPnL = val;
          this.cdr.markForCheck();
        });
        this.cdr.markForCheck();
      });

    // Performance data
    this.analyticsService.performance$
      .pipe(takeUntil(this.destroy$))
      .subscribe(performance => {
        const { best, worst } = this.analyticsService.getTopPerformers(5);
        this.topPerformers = best;
        this.worstPerformers = worst;
        this.checkHasData();
        this.cdr.markForCheck();
      });

    // Trading activity
    this.analyticsService.activity$
      .pipe(takeUntil(this.destroy$))
      .subscribe(activity => {
        this.tradingActivity = activity;
        this.checkHasData();
        this.cdr.markForCheck();
      });

    // Update chart data when timeframe changes
    this.updateChartData();
  }

  private checkHasData(): void {
    this.hasData = this.portfolioSummary.tokenCount > 0 || this.tradingActivity.totalTrades > 0;
  }

  private animateValue(start: number, end: number, callback: (val: number) => void, duration: number = 800): void {
    const startTime = performance.now();
    const diff = end - start;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
      const current = start + diff * easeOut;

      callback(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  selectTimeframe(timeframe: '1D' | '1W' | '1M' | 'ALL'): void {
    this.selectedTimeframe = timeframe;
    this.updateChartData();
  }

  private updateChartData(): void {
    this.performanceData = this.analyticsService.getPerformanceTimeSeries(this.selectedTimeframe);
    this.cdr.markForCheck();
  }

  navigateToToken(address: string): void {
    this.router.navigate(['/token', address]);
  }

  connectWallet(): void {
    this.walletService.connect();
  }

  addDemoData(): void {
    this.portfolioService.addDemoTokens();
    this.analyticsService.addDemoTrades();
  }

  formatCurrency(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return '$' + (value / 1000000).toFixed(2) + 'M';
    } else if (Math.abs(value) >= 1000) {
      return '$' + (value / 1000).toFixed(2) + 'K';
    }
    return '$' + value.toFixed(2);
  }

  formatPercent(value: number): string {
    return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
  }

  getChangeClass(value: number): string {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }

  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }
}
