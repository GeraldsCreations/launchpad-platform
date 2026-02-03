import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { ProgressBarModule } from 'primeng/progressbar';
import { tokenDetailAnimations } from '../token-detail.animations';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-token-info-card',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, BadgeModule, ProgressBarModule],
  animations: tokenDetailAnimations,
  template: `
    <div class="token-info-card sticky top-28" [@cardSlideIn]>
      <p-card>
        <ng-template pTemplate="header">
          <div class="relative p-4">
            <!-- Token Image with Glow -->
            <div class="flex justify-center mb-4">
              <div class="relative">
                <img 
                  [src]="tokenImage || 'assets/default-token.svg'" 
                  [alt]="tokenName"
                  class="w-24 h-24 rounded-full object-cover ring-4 ring-primary-500/50"
                  [style.box-shadow]="'0 0 30px rgba(168, 85, 247, 0.3)'"
                  (error)="onImageError($event)">
                @if (graduated) {
                  <div class="absolute -top-2 -right-2">
                    <p-badge value="✓" severity="success" styleClass="text-lg"></p-badge>
                  </div>
                }
              </div>
            </div>

            <!-- Token Name & Symbol -->
            <div class="text-center">
              <h2 class="text-2xl font-bold text-white mb-1">{{ tokenName }}</h2>
              <p-badge [value]="tokenSymbol" styleClass="bg-primary-500"></p-badge>
            </div>
          </div>
        </ng-template>

        <!-- Stats Grid -->
        <div class="space-y-4">
          <!-- Price -->
          <div class="stat-item">
            <div class="stat-label">Current Price</div>
            <div class="stat-value text-primary-400">{{ formatPrice(currentPrice) }} SOL</div>
          </div>

          <!-- Market Cap -->
          <div class="stat-item">
            <div class="stat-label">Market Cap</div>
            <div class="stat-value">{{ formatMarketCap(marketCap) }}</div>
          </div>

          <!-- 24h Volume -->
          <div class="stat-item">
            <div class="stat-label">24h Volume</div>
            <div class="stat-value">{{ formatVolume(volume24h) }} SOL</div>
          </div>

          <!-- Holders -->
          <div class="stat-item">
            <div class="stat-label">Holders</div>
            <div class="stat-value">{{ holderCount.toLocaleString() }}</div>
          </div>

          <!-- Total Supply -->
          <div class="stat-item">
            <div class="stat-label">Total Supply</div>
            <div class="stat-value">{{ formatSupply(totalSupply) }}</div>
          </div>

          <!-- DBC Progress (if not graduated) -->
          @if (!graduated && dbcProgress !== null) {
            <div class="stat-item">
              <div class="stat-label mb-2">DBC → DLMM Progress</div>
              <p-progressBar 
                [value]="dbcProgress" 
                [showValue]="false"
                styleClass="h-3">
              </p-progressBar>
              <div class="text-xs text-gray-400 mt-1 text-center">
                {{ dbcProgress.toFixed(1) }}% to graduation
              </div>
            </div>
          }

          <!-- Graduated Badge -->
          @if (graduated) {
            <div class="graduated-banner bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-3 border border-green-500/30">
              <div class="flex items-center gap-2 text-green-400">
                <i class="pi pi-check-circle"></i>
                <span class="font-semibold">GRADUATED TO DLMM</span>
              </div>
              <div class="text-xs text-gray-400 mt-1">
                Now trading on Raydium
              </div>
            </div>
          }

          <!-- Description -->
          @if (description) {
            <div class="stat-item">
              <div class="stat-label mb-2">Description</div>
              <div class="text-sm text-gray-300 leading-relaxed">
                {{ description }}
              </div>
            </div>
          }

          <!-- Action Links -->
          <div class="flex flex-col gap-2 pt-4 border-t border-gray-700">
            <p-button 
              label="View on Solscan"
              icon="pi pi-external-link"
              (onClick)="viewOnExplorer()"
              styleClass="p-button-outlined p-button-sm w-full">
            </p-button>
            <p-button 
              label="Copy Token Address"
              icon="pi pi-copy"
              (onClick)="copyAddress()"
              styleClass="p-button-outlined p-button-sm w-full">
            </p-button>
            @if (graduated && dlmmAddress) {
              <p-button 
                label="View DLMM Pool"
                icon="pi pi-external-link"
                (onClick)="viewDLMMPool()"
                styleClass="p-button-outlined p-button-sm w-full">
              </p-button>
            }
          </div>

          <!-- Creator Info -->
          @if (creatorAddress) {
            <div class="creator-info bg-gray-800/50 rounded-lg p-3 text-xs">
              <div class="text-gray-400 mb-1">Created by</div>
              <div class="flex items-center justify-between">
                <span class="text-white font-mono">{{ truncateAddress(creatorAddress) }}</span>
                <p-button 
                  icon="pi pi-copy"
                  (onClick)="copyCreatorAddress()"
                  styleClass="p-button-text p-button-sm"
                  [style]="{ padding: '0.25rem' }">
                </p-button>
              </div>
              @if (createdAt) {
                <div class="text-gray-500 mt-1">{{ formatCreatedAt(createdAt) }}</div>
              }
            </div>
          }
        </div>

      </p-card>
    </div>
  `,
  styles: [`
    .token-info-card {
      max-height: calc(100vh - 8rem);
      overflow-y: auto;
    }

    .stat-item {
      padding: 0.75rem 0;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #9ca3af;
      margin-bottom: 0.25rem;
    }

    .stat-value {
      font-size: 1.125rem;
      font-weight: 600;
      color: white;
    }

    /* Custom scrollbar */
    .token-info-card::-webkit-scrollbar {
      width: 6px;
    }

    .token-info-card::-webkit-scrollbar-track {
      background: transparent;
    }

    .token-info-card::-webkit-scrollbar-thumb {
      background: rgba(168, 85, 247, 0.3);
      border-radius: 3px;
    }

    .token-info-card::-webkit-scrollbar-thumb:hover {
      background: rgba(168, 85, 247, 0.5);
    }
  `]
})
export class TokenInfoCardComponent {
  @Input() tokenName: string = '';
  @Input() tokenSymbol: string = '';
  @Input() tokenAddress: string = '';
  @Input() tokenImage: string = '';
  @Input() currentPrice: number = 0;
  @Input() marketCap: number = 0;
  @Input() volume24h: number = 0;
  @Input() holderCount: number = 0;
  @Input() totalSupply: string | number = 0;
  @Input() dbcProgress: number | null = null;
  @Input() graduated: boolean = false;
  @Input() description: string = '';
  @Input() creatorAddress: string = '';
  @Input() createdAt: string = '';
  @Input() dlmmAddress: string = '';

  constructor(private notificationService: NotificationService) {}

  formatPrice(price: number | null | undefined): string {
    if (price === null || price === undefined || price === 0) return '0.00000000';
    if (price < 0.00000001) return price.toExponential(2);
    if (price < 0.0001) return price.toFixed(8);
    if (price < 1) return price.toFixed(6);
    return price.toFixed(4);
  }

  formatMarketCap(marketCap: number): string {
    if (marketCap >= 1000000) {
      return `$${(marketCap / 1000000).toFixed(2)}M`;
    } else if (marketCap >= 1000) {
      return `$${(marketCap / 1000).toFixed(2)}K`;
    }
    return `$${marketCap.toFixed(2)}`;
  }

  formatVolume(volume: number): string {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K`;
    }
    return volume.toFixed(2);
  }

  formatSupply(supply: number): string {
    if (supply >= 1000000000) {
      return `${(supply / 1000000000).toFixed(2)}B`;
    } else if (supply >= 1000000) {
      return `${(supply / 1000000).toFixed(2)}M`;
    } else if (supply >= 1000) {
      return `${(supply / 1000).toFixed(2)}K`;
    }
    return supply.toLocaleString();
  }

  truncateAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  formatCreatedAt(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  viewOnExplorer(): void {
    if (this.tokenAddress) {
      window.open(`https://solscan.io/token/${this.tokenAddress}?cluster=devnet`, '_blank');
    }
  }

  viewDLMMPool(): void {
    if (this.dlmmAddress) {
      window.open(`https://raydium.io/liquidity/?mode=add&pool=${this.dlmmAddress}`, '_blank');
    }
  }

  copyAddress(): void {
    if (this.tokenAddress) {
      navigator.clipboard.writeText(this.tokenAddress);
      this.notificationService.copyToClipboard('Token address');
    }
  }

  copyCreatorAddress(): void {
    if (this.creatorAddress) {
      navigator.clipboard.writeText(this.creatorAddress);
      this.notificationService.copyToClipboard('Creator address');
    }
  }

  onImageError(event: any): void {
    event.target.src = 'assets/default-token.svg';
  }
}
