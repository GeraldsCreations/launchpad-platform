import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { tokenDetailAnimations } from '../token-detail.animations';
import { Subject, takeUntil } from 'rxjs';

export interface Trade {
  id: number;
  transactionSignature: string;
  tokenAddress: string;
  trader: string;
  side: 'buy' | 'sell';
  amountSol: number;
  amountTokens: number;
  price: number;
  fee: number;
  timestamp: string;
}

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule, CardModule, BadgeModule, ButtonModule],
  animations: tokenDetailAnimations,
  template: `
    <div class="activity-feed" [@cardSlideIn]>
      <p-card>
        <ng-template pTemplate="header">
          <div class="flex items-center justify-between p-4 border-b border-gray-700">
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-semibold text-white">Live Activity</h3>
              @if (isLive) {
                <div class="flex items-center gap-1">
                  <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span class="text-xs text-green-500 font-medium">LIVE</span>
                </div>
              }
            </div>
            <div class="text-sm text-gray-400">
              {{ trades.length }} trades
            </div>
          </div>
        </ng-template>

        <!-- Trades List -->
        <div class="trades-container custom-scrollbar">
          @if (trades.length > 0) {
            <div class="space-y-2">
              @for (trade of trades; track trade.id) {
                <div 
                  class="trade-item p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                  [@tradeFadeIn]
                  (click)="viewTrader(trade.trader)">
                  
                  <div class="flex items-center justify-between mb-2">
                    <!-- Left: Buy/Sell Badge -->
                    <div class="flex items-center gap-2">
                      <p-badge 
                        [value]="trade.side.toUpperCase()"
                        [styleClass]="trade.side === 'buy' ? 'bg-green-500' : 'bg-red-500'">
                      </p-badge>
                      <span class="text-xs text-gray-400 font-mono">
                        {{ truncateAddress(trade.trader) }}
                      </span>
                    </div>

                    <!-- Right: Time Ago -->
                    <span class="text-xs text-gray-500">
                      {{ formatTimeAgo(trade.timestamp) }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between">
                    <!-- Amount & Price -->
                    <div class="flex flex-col">
                      <span class="text-sm font-semibold text-white">
                        {{ formatTokenAmount(trade.amountTokens) }} {{ tokenSymbol }}
                      </span>
                      <span class="text-xs text-gray-400">
                        @ {{ formatPrice(trade.price) }} SOL
                      </span>
                    </div>

                    <!-- SOL Amount -->
                    <div class="text-right">
                      <span 
                        class="text-sm font-bold"
                        [class.text-green-400]="trade.side === 'buy'"
                        [class.text-red-400]="trade.side === 'sell'">
                        {{ trade.side === 'buy' ? '+' : '-' }}{{ trade.amountSol.toFixed(4) }} SOL
                      </span>
                    </div>
                  </div>

                  <!-- Large Trade Indicator -->
                  @if (trade.amountSol >= 1) {
                    <div class="mt-2 flex items-center gap-1">
                      <i class="pi pi-star-fill text-xs text-yellow-500"></i>
                      <span class="text-xs text-yellow-500 font-medium">Large Trade</span>
                    </div>
                  }

                </div>
              }
            </div>
          } @else if (loading) {
            <!-- Loading Skeletons -->
            <div class="space-y-2">
              @for (i of [1,2,3,4,5]; track i) {
                <div class="skeleton-item p-3 bg-gray-800/30 rounded-lg animate-pulse">
                  <div class="flex items-center justify-between mb-2">
                    <div class="h-6 w-16 bg-gray-700 rounded"></div>
                    <div class="h-4 w-12 bg-gray-700 rounded"></div>
                  </div>
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="h-4 w-32 bg-gray-700 rounded mb-1"></div>
                      <div class="h-3 w-24 bg-gray-700 rounded"></div>
                    </div>
                    <div class="h-5 w-20 bg-gray-700 rounded"></div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- Empty State -->
            <div class="empty-state flex flex-col items-center justify-center py-12 text-center">
              <i class="pi pi-chart-line text-4xl text-gray-600 mb-4"></i>
              <p class="text-gray-400 text-lg font-medium mb-2">No trades yet</p>
              <p class="text-gray-500 text-sm">
                Be the first to trade {{ tokenSymbol }}!
              </p>
            </div>
          }
        </div>

        <!-- View All Button -->
        @if (trades.length >= maxTrades) {
          <div class="mt-4 pt-4 border-t border-gray-700">
            <p-button 
              label="View All Trades"
              icon="pi pi-external-link"
              (onClick)="viewAllTrades()"
              styleClass="p-button-outlined p-button-sm w-full">
            </p-button>
          </div>
        }

      </p-card>
    </div>
  `,
  styles: [`
    .activity-feed {
      height: 100%;
    }

    .trades-container {
      max-height: 600px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(168, 85, 247, 0.3);
      border-radius: 3px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(168, 85, 247, 0.5);
    }

    .trade-item {
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }

    .trade-item:hover {
      border-color: rgba(168, 85, 247, 0.3);
      box-shadow: 0 4px 12px rgba(168, 85, 247, 0.1);
      transform: translateX(2px);
    }

    @media (max-width: 768px) {
      .trades-container {
        max-height: 400px;
      }
    }
  `]
})
export class ActivityFeedComponent implements OnInit, OnDestroy {
  @Input() tokenSymbol: string = '';
  @Input() tokenAddress: string = '';

  trades: Trade[] = [];
  loading: boolean = true;
  isLive: boolean = true;
  maxTrades: number = 50;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Simulate loading (replace with real data)
    setTimeout(() => {
      this.loading = false;
    }, 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Add a new trade to the feed
   * Called by parent component when WebSocket receives new trade
   */
  addTrade(trade: Trade): void {
    // Add to beginning of array
    this.trades.unshift(trade);

    // Limit to max trades for performance
    if (this.trades.length > this.maxTrades) {
      this.trades = this.trades.slice(0, this.maxTrades);
    }

    // Show notification for large trades
    if (trade.amountSol >= 1) {
      this.showLargeTradeNotification(trade);
    }
  }

  /**
   * Update existing trades (batch update)
   */
  setTrades(trades: Trade[]): void {
    this.trades = trades.slice(0, this.maxTrades);
    this.loading = false;
  }

  private showLargeTradeNotification(trade: Trade): void {
    // Optional: Show toast notification for large trades
    console.log('Large trade detected:', trade);
  }

  viewTrader(traderAddress: string): void {
    // Open Solscan for trader address
    window.open(`https://solscan.io/account/${traderAddress}?cluster=devnet`, '_blank');
  }

  viewAllTrades(): void {
    // Navigate to full trades history page
    console.log('View all trades for token:', this.tokenAddress);
  }

  formatTimeAgo(timestamp: string | number): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHour > 0) return `${diffHour}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    if (diffSec > 0) return `${diffSec}s ago`;
    return 'just now';
  }

  formatTokenAmount(amount: number): string {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    }
    return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  formatPrice(price: number | null | undefined): string {
    if (price === null || price === undefined || price === 0) return '0.00';
    if (price < 0.0001) return price.toFixed(8);
    if (price < 1) return price.toFixed(6);
    return price.toFixed(4);
  }

  truncateAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }
}
