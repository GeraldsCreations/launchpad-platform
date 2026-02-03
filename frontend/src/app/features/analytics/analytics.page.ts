import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService, Token } from '../../core/services/api.service';
import { WalletService } from '../../core/services/wallet.service';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

interface PerformanceMetrics {
  totalValue: number;
  totalTokens: number;
  avgMarketCap: number;
  totalVolume: number;
}

interface HoldingDistribution {
  token: Token;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, ProgressSpinnerModule]
})
export class AnalyticsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  tokens: Token[] = [];
  metrics: PerformanceMetrics = {
    totalValue: 0,
    totalTokens: 0,
    avgMarketCap: 0,
    totalVolume: 0
  };
  
  topPerformers: Token[] = [];
  holdings: HoldingDistribution[] = [];
  
  chartData = {
    labels: [] as string[],
    values: [] as number[]
  };
  
  loading = true;
  walletConnected = false;
  selectedTimeframe: '1D' | '1W' | '1M' | 'ALL' = '1D';

  constructor(
    private apiService: ApiService,
    private walletService: WalletService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check wallet connection
    this.walletService.wallet$
      .pipe(takeUntil(this.destroy$))
      .subscribe((wallet) => {
        this.walletConnected = !!wallet;
      });

    this.loadAnalytics();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadAnalytics() {
    this.loading = true;
    
    try {
      // Load graduated tokens (top tokens by market cap)
      this.apiService.getGraduatedTokens(50).subscribe({
        next: (tokens) => {
          this.tokens = tokens;
          
          // Calculate metrics
          this.calculateMetrics();
          this.calculateTopPerformers();
          this.calculateHoldingsDistribution();
          this.generateChartData();
          
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading analytics:', error);
          this.loading = false;
        }
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      this.loading = false;
    }
  }

  calculateMetrics() {
    let totalValue = 0;
    let totalVolume = 0;
    
    this.tokens.forEach(token => {
      totalValue += token.market_cap || 0;
      totalVolume += token.volume_24h || 0;
    });
    
    const avgMarketCap = this.tokens.length > 0 ? totalValue / this.tokens.length : 0;
    
    this.metrics = {
      totalValue,
      totalTokens: this.tokens.length,
      avgMarketCap,
      totalVolume
    };
  }

  calculateTopPerformers() {
    // Sort by market cap (since price_change_24h is not available yet)
    this.topPerformers = [...this.tokens]
      .filter(token => token.market_cap > 0)
      .sort((a, b) => b.market_cap - a.market_cap)
      .slice(0, 5);
  }

  calculateHoldingsDistribution() {
    const total = this.tokens.reduce((sum, token) => sum + (token.market_cap || 0), 0);
    
    const colors = [
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#6366f1', // indigo
      '#14b8a6'  // teal
    ];
    
    this.holdings = this.tokens
      .filter(token => token.market_cap && token.market_cap > 0)
      .map((token, idx) => ({
        token,
        percentage: ((token.market_cap || 0) / total) * 100,
        color: colors[idx % colors.length]
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 8);
  }

  generateChartData() {
    // Mock historical data for chart (replace with real API data when available)
    const now = Date.now();
    const timeframes = {
      '1D': { points: 24, interval: 3600000 }, // hourly
      '1W': { points: 7, interval: 86400000 }, // daily
      '1M': { points: 30, interval: 86400000 }, // daily
      'ALL': { points: 12, interval: 2592000000 } // monthly
    };
    
    const config = timeframes[this.selectedTimeframe];
    const labels: string[] = [];
    const values: number[] = [];
    
    const currentValue = this.metrics.totalValue;
    const growth = 0.15; // 15% mock growth
    const startValue = currentValue / (1 + growth);
    
    for (let i = 0; i < config.points; i++) {
      const timestamp = now - (config.points - i - 1) * config.interval;
      const date = new Date(timestamp);
      
      // Format label
      if (this.selectedTimeframe === '1D') {
        labels.push(date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }));
      } else if (this.selectedTimeframe === 'ALL') {
        labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
      } else {
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
      
      // Generate smooth growth
      const progress = i / (config.points - 1);
      const value = startValue + (currentValue - startValue) * progress;
      const variance = value * 0.05 * (Math.random() - 0.5);
      values.push(value + variance);
    }
    
    values[values.length - 1] = currentValue;
    
    this.chartData = { labels, values };
  }

  selectTimeframe(timeframe: '1D' | '1W' | '1M' | 'ALL') {
    this.selectedTimeframe = timeframe;
    this.generateChartData();
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
    return value >= 0 ? 'positive' : 'negative';
  }

  getChartPath(): string {
    if (this.chartData.values.length === 0) return '';
    
    const width = 100;
    const height = 100;
    const padding = 5;
    
    const max = Math.max(...this.chartData.values);
    const min = Math.min(...this.chartData.values);
    const range = max - min || 1;
    
    const points = this.chartData.values.map((value, index) => {
      const x = padding + (index / (this.chartData.values.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((value - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }

  getChartGradientPath(): string {
    const path = this.getChartPath();
    if (!path) return '';
    
    const width = 100;
    const height = 100;
    
    return `${path} L ${width - 5},${height - 5} L 5,${height - 5} Z`;
  }

  navigateToToken(address: string) {
    this.router.navigate(['/token', address]);
  }

  connectWallet() {
    this.walletService.connect();
  }
}
