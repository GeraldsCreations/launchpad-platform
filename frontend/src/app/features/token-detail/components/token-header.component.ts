import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { tokenDetailAnimations, getPriceFlashState } from '../token-detail.animations';
import { WatchlistButtonComponent } from '../../../shared/components/watchlist-button/watchlist-button.component';
import { BotBadgeComponent } from '../../../shared/components/bot-badge/bot-badge.component';

@Component({
  selector: 'app-token-header',
  standalone: true,
  imports: [CommonModule, ButtonModule, BadgeModule, WatchlistButtonComponent, BotBadgeComponent],
  animations: tokenDetailAnimations,
  template: `
    <div class="token-header fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-gray-900/80 border-b border-gray-800">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          <!-- Left: Token Info -->
          <div class="flex items-center gap-3">
            <img 
              [src]="tokenImage || 'assets/default-token.svg'" 
              [alt]="tokenName"
              class="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover ring-2 ring-primary-500/30"
              (error)="onImageError($event)">
            
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <h1 class="text-xl md:text-2xl font-bold text-white">{{ tokenName }}</h1>
                <p-badge [value]="tokenSymbol" styleClass="bg-primary-500"></p-badge>
                @if (graduated) {
                  <p-badge value="GRADUATED" severity="success"></p-badge>
                }
                @if (creatorType && (creatorType === 'clawdbot' || creatorType === 'agent')) {
                  <app-bot-badge 
                    [creatorType]="creatorType" 
                    [compact]="true">
                  </app-bot-badge>
                }
                <app-watchlist-button
                  [tokenAddress]="tokenAddress"
                  [tokenSymbol]="tokenSymbol"
                  size="small">
                </app-watchlist-button>
              </div>
              <div class="text-xs md:text-sm text-gray-400">
                {{ truncateAddress(tokenAddress) }}
              </div>
            </div>
          </div>

          <!-- Center: Live Price -->
          <div class="flex flex-col items-start md:items-center">
            <div 
              class="text-2xl md:text-4xl font-bold text-white transition-colors duration-300"
              [@priceFlash]="priceFlashState">
              {{ formatPrice(currentPrice) }} SOL
            </div>
            <div class="flex items-center gap-2 mt-1">
              @if (priceChange24h !== null) {
                <span 
                  class="text-sm font-semibold"
                  [class.text-green-500]="priceChange24h >= 0"
                  [class.text-red-500]="priceChange24h < 0">
                  {{ priceChange24h >= 0 ? '↑' : '↓' }} 
                  {{ Math.abs(priceChange24h).toFixed(2) }}%
                </span>
              }
              <span class="text-xs text-gray-400">24h</span>
              
              <!-- Live indicator -->
              @if (isLive) {
                <div class="flex items-center gap-1">
                  <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span class="text-xs text-green-500">LIVE</span>
                </div>
              }
            </div>
          </div>

          <!-- Right: Action Buttons -->
          <div class="flex items-center gap-2 w-full md:w-auto">
            <p-button 
              label="BUY"
              icon="pi pi-arrow-up"
              (onClick)="onBuyClick()"
              styleClass="p-button-success flex-1 md:flex-none"
              [disabled]="!canTrade"
              class="buy-button">
            </p-button>
            <p-button 
              label="SELL"
              icon="pi pi-arrow-down"
              (onClick)="onSellClick()"
              styleClass="p-button-danger flex-1 md:flex-none"
              [disabled]="!canTrade"
              class="sell-button">
            </p-button>
          </div>

        </div>
      </div>
    </div>

    <!-- Spacer to prevent content from hiding under fixed header -->
    <div class="h-24 md:h-28"></div>
  `,
  styles: [`
    .token-header {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .buy-button:hover ::ng-deep .p-button {
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
      transform: scale(1.05);
      transition: all 0.2s ease;
    }

    .sell-button:hover ::ng-deep .p-button {
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
      transform: scale(1.05);
      transition: all 0.2s ease;
    }

    @media (max-width: 768px) {
      .token-header {
        position: sticky;
      }
    }
  `]
})
export class TokenHeaderComponent implements OnChanges {
  @Input() tokenName: string = '';
  @Input() tokenSymbol: string = '';
  @Input() tokenAddress: string = '';
  @Input() tokenImage: string = '';
  @Input() currentPrice: number = 0;
  @Input() priceChange24h: number | null = null;
  @Input() graduated: boolean = false;
  @Input() canTrade: boolean = true;
  @Input() isLive: boolean = true;
  @Input() creatorType?: string;

  @Output() buyClicked = new EventEmitter<void>();
  @Output() sellClicked = new EventEmitter<void>();

  priceFlashState: string = 'default';
  private previousPrice: number = 0;

  // Expose Math to template
  Math = Math;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentPrice'] && !changes['currentPrice'].firstChange) {
      const newPrice = changes['currentPrice'].currentValue;
      this.priceFlashState = getPriceFlashState(newPrice, this.previousPrice);
      
      // Reset to default after animation
      setTimeout(() => {
        this.priceFlashState = 'default';
      }, 1000);
      
      this.previousPrice = newPrice;
    }
  }

  onBuyClick(): void {
    this.buyClicked.emit();
  }

  onSellClick(): void {
    this.sellClicked.emit();
  }

  formatPrice(price: number | null | undefined): string {
    if (price === null || price === undefined || price === 0) return '0.00000000';
    if (price < 0.00000001) return price.toExponential(2);
    if (price < 0.0001) return price.toFixed(8);
    if (price < 1) return price.toFixed(6);
    return price.toFixed(4);
  }

  truncateAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  onImageError(event: any): void {
    event.target.src = 'assets/default-token.svg';
  }
}
