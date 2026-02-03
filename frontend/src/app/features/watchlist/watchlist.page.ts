import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { trigger, transition, style, animate } from '@angular/animations';

// Services
import { WatchlistService } from '../../core/services/watchlist.service';
import { ApiService, Token } from '../../core/services/api.service';
import { WebSocketService, PriceUpdateEvent } from '../../core/services/websocket.service';

// Components
import { WatchlistButtonComponent } from '../../shared/components/watchlist-button/watchlist-button.component';

// PrimeNG
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';

export interface WatchlistToken extends Token {
  priceChange?: number;
  priceChangePercent?: number;
}

type SortOption = 'recent' | 'priceChange' | 'name';

/**
 * WatchlistPage - Display and manage user's watchlist tokens
 * 
 * Features:
 * - Grid layout of token cards
 * - Live price updates via WebSocket
 * - Sort by: recently added, price change, name
 * - Empty state with CTA
 * - Quick remove button
 * - Click to navigate to token detail
 */
@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    WatchlistButtonComponent,
    ProgressSpinnerModule,
    ButtonModule,
    DropdownModule
  ],
  templateUrl: './watchlist.page.html',
  styleUrls: ['./watchlist.page.scss'],
  animations: [
    trigger('fadeInStagger', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class WatchlistPage implements OnInit, OnDestroy {
  tokens: WatchlistToken[] = [];
  loading: boolean = true;
  sortBy: SortOption = 'recent';
  
  sortOptions = [
    { label: '🕒 Recently Added', value: 'recent' },
    { label: '📈 Price Change', value: 'priceChange' },
    { label: '🔤 Name', value: 'name' }
  ];

  // Expose Math to template
  Math = Math;

  private destroy$ = new Subject<void>();
  private watchlistAddresses: string[] = [];

  constructor(
    private watchlistService: WatchlistService,
    private apiService: ApiService,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    // Subscribe to watchlist changes
    this.watchlistService.watchlist$
      .pipe(takeUntil(this.destroy$))
      .subscribe(addresses => {
        this.watchlistAddresses = addresses;
        this.loadTokens();
      });

    // Subscribe to price updates
    this.subscribeToPriceUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load token details for all watchlist addresses
   */
  private loadTokens(): void {
    if (this.watchlistAddresses.length === 0) {
      this.tokens = [];
      this.loading = false;
      return;
    }

    this.loading = true;

    // Fetch all tokens in parallel
    const tokenRequests = this.watchlistAddresses.map(address =>
      this.apiService.getToken(address).pipe(
        catchError(error => {
          console.error(`Failed to load token ${address}:`, error);
          return of(null); // Return null for failed requests
        })
      )
    );

    forkJoin(tokenRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe(tokensData => {
        // Filter out null values (failed requests)
        this.tokens = tokensData.filter(t => t !== null) as WatchlistToken[];
        
        // Sort tokens
        this.sortTokens();
        
        this.loading = false;
      });
  }

  /**
   * Subscribe to real-time price updates
   */
  private subscribeToPriceUpdates(): void {
    this.wsService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((message: any) => {
        if (message.event === 'price_update') {
          this.handlePriceUpdate(message);
        }
      });
  }

  /**
   * Handle incoming price updates
   */
  private handlePriceUpdate(update: PriceUpdateEvent): void {
    const tokenIndex = this.tokens.findIndex(t => t.address === (update.token_address || update.tokenAddress));
    
    if (tokenIndex !== -1) {
      const token = this.tokens[tokenIndex];
      const previousPrice = token.currentPrice;
      
      // Update price
      token.currentPrice = update.price;
      if (update.marketCap || update.market_cap) token.marketCap = update.marketCap || update.market_cap;
      if (update.volume24h || update.volume_24h) token.volume24h = update.volume24h || update.volume_24h;
      
      // Calculate price change
      if (previousPrice > 0) {
        token.priceChange = update.price - previousPrice;
        token.priceChangePercent = ((update.price - previousPrice) / previousPrice) * 100;
      }
      
      // Re-sort if sorting by price change
      if (this.sortBy === 'priceChange') {
        this.sortTokens();
      }
    }
  }

  /**
   * Sort tokens based on current sort option
   */
  private sortTokens(): void {
    switch (this.sortBy) {
      case 'recent':
        // Keep original order (most recent first)
        this.tokens = this.watchlistAddresses
          .map(addr => this.tokens.find(t => t.address === addr))
          .filter(t => t !== undefined) as WatchlistToken[];
        break;
      
      case 'priceChange':
        this.tokens.sort((a, b) => {
          const changeA = a.priceChangePercent || 0;
          const changeB = b.priceChangePercent || 0;
          return changeB - changeA; // Highest change first
        });
        break;
      
      case 'name':
        this.tokens.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
  }

  /**
   * Handle sort change
   */
  onSortChange(): void {
    this.sortTokens();
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    if (price === 0) return '0.00000000';
    if (price < 0.00000001) return price.toExponential(2);
    if (price < 0.0001) return price.toFixed(8);
    if (price < 1) return price.toFixed(6);
    return price.toFixed(4);
  }

  /**
   * Format large numbers (market cap, volume)
   */
  formatNumber(value: number): string {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  }

  /**
   * Truncate address for display
   */
  truncateAddress(address: string): string {
    if (!address || address.length <= 16) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Navigate to explore page
   */
  goToExplore(): void {
    // This will be handled by routerLink in template
  }

  /**
   * Copy address to clipboard
   */
  copyAddress(address: string, event: Event): void {
    event.stopPropagation();
    navigator.clipboard.writeText(address);
  }

  /**
   * Get price change color class
   */
  getPriceChangeClass(change?: number): string {
    if (!change) return 'text-gray-400';
    return change >= 0 ? 'text-green-500' : 'text-red-500';
  }

  /**
   * Get price change icon
   */
  getPriceChangeIcon(change?: number): string {
    if (!change) return '';
    return change >= 0 ? '↑' : '↓';
  }

  /**
   * Track by function for ngFor performance
   */
  trackByAddress(index: number, token: WatchlistToken): string {
    return token.address;
  }
}
