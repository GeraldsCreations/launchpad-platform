import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Subject, takeUntil } from 'rxjs';

// Services
import { ApiService, Token } from '../../core/services/api.service';
import { TokenWebSocketService } from './services/token-websocket.service';
import { NotificationService } from '../../core/services/notification.service';

// Components
import { TokenHeaderComponent } from './components/token-header.component';
import { TokenInfoCardComponent } from './components/token-info-card.component';
import { LiveChartComponent } from './components/live-chart.component';
import { TradeInterfaceComponent } from './components/trade-interface.component';
import { ActivityFeedComponent, Trade } from './components/activity-feed.component';

// Animations
import { tokenDetailAnimations } from './token-detail.animations';

@Component({
  selector: 'app-token-detail',
  standalone: true,
  imports: [
    CommonModule,
    ProgressSpinnerModule,
    TokenHeaderComponent,
    TokenInfoCardComponent,
    LiveChartComponent,
    TradeInterfaceComponent,
    ActivityFeedComponent
  ],
  animations: tokenDetailAnimations,
  template: `
    <!-- Loading State -->
    @if (loading) {
      <div class="flex justify-center items-center min-h-screen bg-gray-900">
        <div class="text-center">
          <p-progressSpinner styleClass="w-16 h-16"></p-progressSpinner>
          <p class="text-gray-400 mt-4">Loading token details...</p>
        </div>
      </div>
    }
    
    <!-- Error State -->
    @else if (error) {
      <div class="flex justify-center items-center min-h-screen bg-gray-900">
        <div class="text-center max-w-md">
          <i class="pi pi-exclamation-triangle text-6xl text-red-500 mb-4"></i>
          <h2 class="text-2xl font-bold text-white mb-2">Token Not Found</h2>
          <p class="text-gray-400 mb-6">{{ error }}</p>
          <button 
            (click)="goBack()"
            class="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-colors">
            Go Back
          </button>
        </div>
      </div>
    }
    
    <!-- Main Content -->
    @else if (token) {
      <div class="token-detail-page min-h-screen bg-gray-900">
        
        <!-- Fixed Header -->
        <app-token-header
          [tokenName]="token.name"
          [tokenSymbol]="token.symbol"
          [tokenAddress]="token.address"
          [tokenImage]="token.image_url || ''"
          [currentPrice]="currentPrice"
          [priceChange24h]="priceChange24h"
          [graduated]="token.graduated"
          [canTrade]="true"
          [isLive]="isLive"
          [creatorType]="token.creator_type"
          (buyClicked)="scrollToTrade('buy')"
          (sellClicked)="scrollToTrade('sell')">
        </app-token-header>

        <!-- Main Content Grid -->
        <div class="max-w-7xl mx-auto px-4 py-6">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <!-- Left Column: Token Info Card (Sticky) -->
            <div class="lg:col-span-3">
              <app-token-info-card
                [tokenName]="token.name"
                [tokenSymbol]="token.symbol"
                [tokenAddress]="token.address"
                [tokenImage]="token.image_url || ''"
                [currentPrice]="currentPrice"
                [marketCap]="token.market_cap"
                [volume24h]="token.volume_24h"
                [holderCount]="token.holder_count"
                [totalSupply]="token.total_supply"
                [dbcProgress]="dbcProgress"
                [graduated]="token.graduated"
                [description]="token.description || ''"
                [creatorAddress]="token.creator"
                [createdAt]="token.created_at"
                [dlmmAddress]="''">
              </app-token-info-card>
            </div>

            <!-- Middle Column: Chart & Activity Feed -->
            <div class="lg:col-span-6 space-y-6">
              
              <!-- Live Chart -->
              <app-live-chart
                [tokenAddress]="token.address"
                #liveChart>
              </app-live-chart>

              <!-- Activity Feed -->
              <app-activity-feed
                [tokenSymbol]="token.symbol"
                [tokenAddress]="token.address"
                #activityFeed>
              </app-activity-feed>

            </div>

            <!-- Right Column: Trade Interface (Sticky) -->
            <div class="lg:col-span-3">
              <div class="sticky top-28">
                <app-trade-interface
                  [tokenAddress]="token.address"
                  [tokenSymbol]="token.symbol"
                  [currentPrice]="currentPrice"
                  #tradeInterface>
                </app-trade-interface>
              </div>
            </div>

          </div>
        </div>

      </div>
    }
  `,
  styles: [`
    .token-detail-page {
      min-height: 100vh;
      background: linear-gradient(180deg, #0a0a0f 0%, #111118 100%);
    }

    /* Mobile: Stack layout */
    @media (max-width: 1024px) {
      .grid {
        grid-template-columns: 1fr !important;
      }
    }

    /* Smooth scroll behavior */
    html {
      scroll-behavior: smooth;
    }
  `]
})
export class TokenDetailComponent implements OnInit, OnDestroy {
  @ViewChild('liveChart') liveChart?: LiveChartComponent;
  @ViewChild('activityFeed') activityFeed?: ActivityFeedComponent;
  @ViewChild('tradeInterface') tradeInterface?: TradeInterfaceComponent;

  token: Token | null = null;
  currentPrice: number = 0;
  priceChange24h: number | null = null;
  dbcProgress: number | null = null;
  isLive: boolean = false;
  loading: boolean = true;
  error: string = '';
  
  private tokenAddress: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private tokenWsService: TokenWebSocketService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Get token address from route
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.tokenAddress = params['address'];
      
      if (!this.tokenAddress) {
        this.error = 'No token address provided';
        this.loading = false;
        return;
      }

      this.loadTokenData();
    });
  }

  ngOnDestroy(): void {
    this.tokenWsService.unsubscribeFromToken();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load initial token data from API
   */
  private loadTokenData(): void {
    this.loading = true;
    this.error = '';

    this.apiService.getToken(this.tokenAddress)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (token) => {
          this.token = token;
          this.currentPrice = token.current_price;
          this.calculateDerivedData();
          this.loading = false;

          // Load trades history
          this.loadTradesHistory();

          // Subscribe to real-time updates
          this.subscribeToWebSocket();
        },
        error: (err) => {
          console.error('Failed to load token:', err);
          this.error = err.error?.message || 'Failed to load token data';
          this.loading = false;
        }
      });
  }

  /**
   * Load initial trades history
   */
  private loadTradesHistory(): void {
    this.apiService.getTradeHistory(this.tokenAddress, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (trades) => {
          if (this.activityFeed) {
            const formattedTrades: Trade[] = trades.map(t => ({
              id: t.id.toString(),
              trader: t.trader,
              side: t.side,
              amount_sol: t.amount_sol,
              amount_tokens: t.amount_tokens,
              price: t.price,
              timestamp: t.timestamp
            }));
            this.activityFeed.setTrades(formattedTrades);
          }
        },
        error: (err) => {
          console.error('Failed to load trades:', err);
        }
      });
  }

  /**
   * Subscribe to WebSocket updates for real-time data
   */
  private subscribeToWebSocket(): void {
    this.tokenWsService.subscribeToToken(this.tokenAddress);

    // Monitor connection status
    this.tokenWsService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.isLive = connected;
      });

    // Listen for price updates
    this.tokenWsService.priceUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => {
        this.handlePriceUpdate(update);
      });

    // Listen for new trades
    this.tokenWsService.newTrade$
      .pipe(takeUntil(this.destroy$))
      .subscribe(trade => {
        this.handleNewTrade(trade);
      });
  }

  /**
   * Handle real-time price updates
   */
  private handlePriceUpdate(update: any): void {
    const previousPrice = this.currentPrice;
    this.currentPrice = update.price;

    // Update token object
    if (this.token) {
      this.token.current_price = update.price;
      if (update.marketCap) this.token.market_cap = update.marketCap;
      if (update.volume24h) this.token.volume_24h = update.volume24h;
    }

    // Update chart
    if (this.liveChart) {
      this.liveChart.updatePrice(update.price);
    }

    // Show notification for significant price changes (>5%)
    if (previousPrice > 0) {
      const changePercent = ((update.price - previousPrice) / previousPrice) * 100;
      if (Math.abs(changePercent) > 5) {
        const direction = changePercent > 0 ? '📈' : '📉';
        this.notificationService.info(
          `${direction} Price ${changePercent > 0 ? 'up' : 'down'} ${Math.abs(changePercent).toFixed(2)}%`
        );
      }
    }
  }

  /**
   * Handle new trade events
   */
  private handleNewTrade(trade: any): void {
    // Add to activity feed
    if (this.activityFeed) {
      this.activityFeed.addTrade(trade);
    }

    // Show notification for large trades (>1 SOL)
    if (trade.amount_sol >= 1) {
      const emoji = trade.side === 'buy' ? '🟢' : '🔴';
      this.notificationService.info(
        `${emoji} Large ${trade.side.toUpperCase()}: ${trade.amount_sol.toFixed(2)} SOL`
      );
    }
  }

  /**
   * Calculate derived data (price change, DBC progress, etc.)
   */
  private calculateDerivedData(): void {
    if (!this.token) return;

    // Calculate 24h price change (mock for now)
    // In production, this would come from the API
    this.priceChange24h = Math.random() * 20 - 10; // -10% to +10%

    // Calculate DBC progress if not graduated
    if (!this.token.graduated) {
      // DBC progress = (market_cap / graduation_threshold) * 100
      const graduationThreshold = 50000; // $50k market cap
      this.dbcProgress = Math.min((this.token.market_cap / graduationThreshold) * 100, 100);
    }
  }

  /**
   * Scroll to trade interface and set mode
   */
  scrollToTrade(mode: 'buy' | 'sell'): void {
    if (this.tradeInterface) {
      this.tradeInterface.setTradeType(mode);
      
      // Scroll to trade interface on mobile
      const element = document.querySelector('app-trade-interface');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  /**
   * Navigate back
   */
  goBack(): void {
    this.router.navigate(['/explore']);
  }
}
