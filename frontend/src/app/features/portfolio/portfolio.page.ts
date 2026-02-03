import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PortfolioService, TokenHolding, PortfolioSummary } from './services/portfolio.service';
import { PortfolioCardComponent } from './components/portfolio-card.component';
import { PullToRefreshDirective } from '../../shared/directives/pull-to-refresh.directive';
import { SwipeDirective } from '../../shared/directives/swipe.directive';
import { LongPressDirective } from '../../shared/directives/long-press.directive';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    PortfolioCardComponent,
    PullToRefreshDirective,
    SwipeDirective,
    LongPressDirective
  ],
  templateUrl: './portfolio.page.html',
  styleUrls: ['./portfolio.page.scss']
})
export class PortfolioPage implements OnInit, OnDestroy {
  holdings: TokenHolding[] = [];
  summary: PortfolioSummary = {
    totalValueUSD: 0,
    totalChange24h: 0,
    totalChangePercent24h: 0,
    tokenCount: 0,
    lastUpdated: Date.now()
  };

  refreshing = false;
  Math = Math;

  private destroy$ = new Subject<void>();

  constructor(private portfolioService: PortfolioService) {}

  ngOnInit(): void {
    this.portfolioService.holdings$.pipe(takeUntil(this.destroy$)).subscribe(holdings => {
      this.holdings = holdings;
    });

    this.portfolioService.summary$.pipe(takeUntil(this.destroy$)).subscribe(summary => {
      this.summary = summary;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.refreshing = true;
    this.portfolioService.refresh();
    setTimeout(() => { this.refreshing = false; }, 1000);
  }

  addDemoTokens(): void {
    this.portfolioService.addDemoTokens();
  }

  onTradeClick(tokenAddress: string): void {
    console.log('Navigate to token:', tokenAddress);
  }

  onSwipeLeft(holding: TokenHolding): void {
    // Show delete/remove action
    if (confirm(`Remove ${holding.tokenName} from portfolio?`)) {
      console.log('Removing token:', holding.tokenAddress);
      // Implement actual removal logic
    }
  }

  onSwipeRight(holding: TokenHolding): void {
    // Show edit action
    console.log('Edit token:', holding.tokenAddress);
    // Could open an edit modal or navigate to token detail
  }

  onLongPress(holding: TokenHolding): void {
    // Show quick actions menu
    console.log('Quick actions for:', holding.tokenAddress);
    // Could show a context menu with options like:
    // - View details
    // - Trade
    // - Add to watchlist
    // - Remove from portfolio
  }

  formatValue(value: number): string {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
