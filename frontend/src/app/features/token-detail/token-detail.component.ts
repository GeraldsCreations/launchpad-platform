import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ApiService, Token, Trade } from '../../core/services/api.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { PriceChartComponent } from '../../shared/components/price-chart.component';
import { TradeFormComponent } from '../../shared/components/trade-form.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-token-detail',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    BadgeModule,
    ProgressSpinnerModule,
    PriceChartComponent,
    TradeFormComponent
  ],
  template: `
    @if (loading) {
      <div class="flex justify-center items-center min-h-screen">
        <p-progressSpinner></p-progressSpinner>
      </div>
    } @else if (token) {
      <div class="token-detail-container max-w-7xl mx-auto px-4 py-8">
        <!-- Header -->
        <div class="bg-gray-900 rounded-lg p-6 mb-6">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-4">
              <img 
                [src]="token.image_url || 'assets/default-token.png'" 
                [alt]="token.name"
                class="w-20 h-20 rounded-full object-cover"
                (error)="onImageError($event)">
              <div>
                <div class="flex items-center gap-3 mb-2">
                  <h1 class="text-3xl font-bold">{{ token.name }}</h1>
                  <p-badge [value]="token.symbol" severity="info"></p-badge>
                  @if (token.graduated) {
                    <p-badge value="GRADUATED" severity="success"></p-badge>
                  }
                </div>
                <p class="text-gray-400">{{ token.description }}</p>
              </div>
            </div>
            
            <div class="text-right">
              <div class="text-3xl font-bold mb-2">
                {{ token.current_price.toFixed(8) }} SOL
              </div>
              <div class="text-sm text-gray-400">
                Market Cap: {{ formatMarketCap(token.market_cap) }}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <div class="text-sm text-gray-400">24h Volume</div>
              <div class="text-xl font-semibold">{{ token.volume_24h.toFixed(2) }} SOL</div>
            </div>
            <div>
              <div class="text-sm text-gray-400">Holders</div>
              <div class="text-xl font-semibold">{{ token.holder_count }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-400">Total Supply</div>
              <div class="text-xl font-semibold">{{ formatSupply(token.total_supply) }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-400">Created</div>
              <div class="text-xl font-semibold">{{ formatDate(token.created_at) }}</div>
            </div>
          </div>

          <div class="flex gap-2 mt-4">
            <p-button 
              label="View on Solscan"
              icon="pi pi-external-link"
              (onClick)="viewOnExplorer()"
              styleClass="p-button-sm p-button-outlined">
            </p-button>
            <p-button 
              label="Copy Address"
              icon="pi pi-copy"
              (onClick)="copyAddress()"
              styleClass="p-button-sm p-button-outlined">
            </p-button>
          </div>
        </div>

        <!-- Chart and Trading -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div class="lg:col-span-2">
            <p-card>
              <ng-template pTemplate="header">
                <div class="p-4 font-semibold">Price Chart</div>
              </ng-template>
              <app-price-chart 
                [tokenAddress]="token.address"
                #priceChart>
              </app-price-chart>
            </p-card>
          </div>

          <div>
            <app-trade-form 
              [tokenAddress]="token.address"
              [tokenSymbol]="token.symbol">
            </app-trade-form>
          </div>
        </div>

        <!-- Trade History -->
        <p-card>
          <ng-template pTemplate="header">
            <div class="p-4 font-semibold">Recent Trades</div>
          </ng-template>
          
          @if (trades.length > 0) {
            <div class="space-y-2">
              @for (trade of trades; track trade.id) {
                <div class="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <div class="flex items-center gap-3">
                    <p-badge 
                      [value]="trade.side.toUpperCase()"
                      [severity]="trade.side === 'buy' ? 'success' : 'danger'">
                    </p-badge>
                    <div>
                      <div class="font-medium">
                        {{ trade.amount_tokens.toLocaleString() }} {{ token.symbol }}
                      </div>
                      <div class="text-xs text-gray-400">
                        {{ formatAddress(trade.trader) }}
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-semibold">
                      {{ trade.amount_sol.toFixed(4) }} SOL
                    </div>
                    <div class="text-xs text-gray-400">
                      {{ formatTime(trade.timestamp) }}
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="text-center py-8 text-gray-400">
              No trades yet
            </div>
          }
        </p-card>
      </div>
    } @else {
      <div class="text-center py-12">
        <p class="text-xl text-gray-400">Token not found</p>
      </div>
    }
  `,
  styles: [`
    .token-detail-container {
      min-height: calc(100vh - 80px);
    }
  `]
})
export class TokenDetailComponent implements OnInit, OnDestroy {
  @ViewChild('priceChart') priceChart?: PriceChartComponent;

  token: Token | null = null;
  trades: Trade[] = [];
  loading = true;
  tokenAddress: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.tokenAddress = params['address'];
      this.loadToken();
      this.loadTrades();
      this.subscribeToUpdates();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadToken(): void {
    this.apiService.getToken(this.tokenAddress)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (token) => {
          this.token = token;
          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load token:', error);
          this.loading = false;
        }
      });
  }

  private loadTrades(): void {
    this.apiService.getTradeHistory(this.tokenAddress, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (trades) => {
          this.trades = trades;
        },
        error: (error) => {
          console.error('Failed to load trades:', error);
        }
      });
  }

  private subscribeToUpdates(): void {
    this.wsService.subscribeToToken(this.tokenAddress)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event: any) => {
          if (event.event === 'price_update' && this.token) {
            this.token.current_price = event.price || event.data?.price;
            this.token.market_cap = event.market_cap || event.data?.market_cap;
            this.token.volume_24h = event.volume_24h || event.data?.volume_24h;
            
            if (this.priceChart) {
              this.priceChart.updatePrice(event.price || event.data?.price);
            }
          } else if (event.event === 'trade') {
            this.loadTrades();
          }
        },
        error: (error) => {
          console.error('WebSocket error:', error);
        }
      });
  }

  formatMarketCap(marketCap: number): string {
    if (marketCap >= 1000000) {
      return `$${(marketCap / 1000000).toFixed(2)}M`;
    } else if (marketCap >= 1000) {
      return `$${(marketCap / 1000).toFixed(2)}K`;
    }
    return `$${marketCap.toFixed(2)}`;
  }

  formatSupply(supply: number): string {
    if (supply >= 1000000000) {
      return `${(supply / 1000000000).toFixed(2)}B`;
    } else if (supply >= 1000000) {
      return `${(supply / 1000000).toFixed(2)}M`;
    }
    return supply.toLocaleString();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  }

  formatAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  viewOnExplorer(): void {
    if (this.token) {
      window.open(`https://solscan.io/token/${this.token.address}?cluster=devnet`, '_blank');
    }
  }

  copyAddress(): void {
    if (this.token) {
      navigator.clipboard.writeText(this.token.address);
      alert('Address copied to clipboard!');
    }
  }

  onImageError(event: any): void {
    event.target.src = 'assets/default-token.png';
  }
}
