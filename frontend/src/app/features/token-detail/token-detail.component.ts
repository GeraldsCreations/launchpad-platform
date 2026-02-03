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
import { LiveChartComponent } from './components/live-chart.component';
import { TradeInterfaceComponent } from './components/trade-interface.component';
import { BondingCurveProgressComponent } from './components/bonding-curve-progress.component';
import { TradesHoldersTabsComponent } from './components/trades-holders-tabs.component';

// Animations
import { tokenDetailAnimations } from './token-detail.animations';

@Component({
  selector: 'app-token-detail',
  standalone: true,
  imports: [
    CommonModule,
    ProgressSpinnerModule,
    LiveChartComponent,
    TradeInterfaceComponent,
    BondingCurveProgressComponent,
    TradesHoldersTabsComponent
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
      <div class="token-detail-page min-h-screen">
        
        <!-- Token Header -->
        <div class="token-header-section">
          <div class="max-w-7xl mx-auto px-4 py-6">
            <div class="header-content">
              <div class="token-title-section">
                <img 
                  [src]="token.imageUrl || 'assets/placeholder-token.svg'" 
                  [alt]="token.name"
                  class="token-logo"
                  onerror="this.src='assets/placeholder-token.svg'">
                <div class="token-info">
                  <div class="token-name-row">
                    <i class="pi pi-bolt neural-icon"></i>
                    <span class="token-name">{{ token.name }}</span>
                    <span class="token-symbol">({{ token.symbol }})</span>
                  </div>
                  <div class="price-section">
                    <span class="current-price">\${{ currentPrice | number:'1.2-5' }}</span>
                    <span 
                      *ngIf="priceChange24h !== null"
                      class="price-change"
                      [class.price-up]="priceChange24h > 0"
                      [class.price-down]="priceChange24h < 0">
                      {{ priceChange24h > 0 ? '+' : '' }}{{ priceChange24h | number:'1.2-2' }}%
                    </span>
                    <span class="market-cap">MC \${{ token.marketCap | number:'1.0-0' }}</span>
                  </div>
                </div>
              </div>
              <div class="header-actions">
                <button class="btn-connect-wallet">Connect Wallet</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 2-Column Layout: Chart/Tabs + Trading -->
        <div class="main-content-grid max-w-7xl mx-auto px-4 py-6">
          
          <!-- Left Panel: Chart + Trades/Holders Tabs (70%) -->
          <div class="left-panel">
            <!-- Live Chart -->
            <div class="chart-section">
              <app-live-chart
                [tokenAddress]="token.address"
                [currentPrice]="currentPrice"
                [graduationPrice]="getGraduationPrice()"
                [graduated]="token.graduated"
                #liveChart>
              </app-live-chart>
            </div>

            <!-- Trades & Holders Tabs -->
            <div class="tabs-section">
              <app-trades-holders-tabs
                [tokenAddress]="token.address">
              </app-trades-holders-tabs>
            </div>
          </div>

          <!-- Right Panel: Trading Interface (30%) -->
          <div class="right-panel">
            <app-trade-interface
              [tokenAddress]="token.address"
              [tokenSymbol]="token.symbol"
              [currentPrice]="currentPrice"
              #tradeInterface>
            </app-trade-interface>

            <!-- Bonding Curve Progress -->
            <app-bonding-curve-progress
              [progressPercent]="dbcProgress || 0"
              [currentMarketCap]="token.marketCap"
              [graduationThreshold]="50000"
              [showDetails]="false">
            </app-bonding-curve-progress>
          </div>

        </div>

      </div>
    }
  `,
  styles: [`
    .token-detail-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1b1f 0%, #252730 100%);
    }

    /* Token Header Section */
    .token-header-section {
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-default);
      padding: 20px 0;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }

    .token-title-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .token-logo {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      object-fit: cover;
      border: 2px solid var(--border-default);
    }

    .token-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .token-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .neural-icon {
      color: var(--accent-purple);
      font-size: 20px;
    }

    .token-name {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .token-symbol {
      font-size: 18px;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .price-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .current-price {
      font-size: 32px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .price-change {
      font-size: 18px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 6px;
    }

    .market-cap {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .btn-connect-wallet {
      background: var(--gradient-purple);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-connect-wallet:hover {
      background: var(--gradient-purple-hover);
      transform: scale(1.02);
    }

    /* 2-Column Grid Layout: Chart/Trades + Trading */
    .main-content-grid {
      display: grid;
      grid-template-columns: 70% 30%;
      gap: 1.5rem;
    }

    .left-panel {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .chart-section {
      background: var(--bg-secondary, #1a1a2e);
      border-radius: 12px;
      overflow: hidden;
      height: 450px;
      width: 100%;
      position: relative;
    }

    .chart-section ::ng-deep app-live-chart,
    .chart-section ::ng-deep .live-chart-container,
    .chart-section ::ng-deep .chart-wrapper {
      height: 100%;
      width: 100%;
      display: block;
    }

    .tabs-section {
      background: var(--bg-secondary, #1a1a2e);
      border-radius: 12px;
      overflow: hidden;
    }

    .right-panel {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      position: sticky;
      top: 1rem;
      height: fit-content;
    }

    /* Responsive: Mobile/Tablet */
    @media (max-width: 1024px) {
      .main-content-grid {
        grid-template-columns: 1fr;
      }

      .chart-section {
        height: 350px;
      }

      .tabs-section {
        /* Full height on mobile */
      }

      .right-panel {
        position: relative;
        top: 0;
      }
    }

    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        align-items: flex-start;
      }

      .token-logo {
        width: 48px;
        height: 48px;
      }

      .token-name {
        font-size: 20px;
      }

      .current-price {
        font-size: 24px;
      }

      .price-section {
        flex-wrap: wrap;
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
          this.currentPrice = token.currentPrice;
          this.calculateDerivedData();
          this.loading = false;

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
   * NOTE: Trades are now handled by ActivityTabsComponent
   */
  private loadTradesHistory(): void {
    // Trades history is now loaded within the ActivityTabsComponent
    // This method is kept for potential future use
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
      this.token.currentPrice = update.price;
      if (update.marketCap) this.token.marketCap = update.marketCap;
      if (update.volume24h) this.token.volume24h = update.volume24h;
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
    // Activity feed is now handled by ActivityTabsComponent
    // TODO: Add event emitter or service to notify activity tabs of new trades
    
    // Show notification for large trades (>1 SOL)
    if (trade.amountSol >= 1) {
      const emoji = trade.side === 'buy' ? '🟢' : '🔴';
      this.notificationService.info(
        `${emoji} Large ${trade.side.toUpperCase()}: ${trade.amountSol.toFixed(2)} SOL`
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
      this.dbcProgress = Math.min((this.token.marketCap / graduationThreshold) * 100, 100);
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

  /**
   * Get graduation price (price at which token graduates to normal pools)
   * For bonding curves, this is typically when market cap reaches a threshold
   */
  getGraduationPrice(): number | null {
    if (!this.token || this.token.graduated) {
      return null;
    }

    // Typical bonding curve graduation thresholds:
    // - Market cap: $50,000 (50k USD)
    // - Assuming 1 billion token supply
    // - Price = market_cap / total_supply
    const graduationMarketCap = 50000; // $50k
    const totalSupply = 1_000_000_000; // 1 billion tokens
    
    // If we have actual total supply, use it
    const actualSupply = this.token.totalSupply ? parseFloat(this.token.totalSupply) : totalSupply;
    
    // Calculate graduation price in SOL
    // Assuming SOL = $150 (should be fetched from price oracle in production)
    const solPriceUSD = 150;
    const graduationPriceSOL = graduationMarketCap / actualSupply / solPriceUSD;
    
    return graduationPriceSOL;
  }
}
