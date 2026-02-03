import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { Token } from '../../core/services/api.service';
import { BotBadgeComponent } from './bot-badge/bot-badge.component';

@Component({
  selector: 'app-token-card',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule, BadgeModule, ChipModule, BotBadgeComponent],
  template: `
    <div 
      [routerLink]="['/token', token.address]"
      class="token-card-compact">
      <!-- Token Image -->
      <div class="token-image-wrapper">
        <img 
          [src]="token.imageUrl || 'assets/default-token.svg'" 
          [alt]="token.name"
          class="token-image"
          (error)="onImageError($event)">
      </div>

      <!-- Token Info -->
      <div class="token-info">
        <!-- Header: Name & Time -->
        <div class="token-header">
          <h3 class="token-name">{{ token.name }}</h3>
          <span class="token-time">{{ getTimeAgo() }}</span>
        </div>

        <!-- Symbol -->
        <div class="token-symbol">{{ token.symbol }}</div>

        <!-- Market Cap & Progress Bar -->
        <div class="market-cap-section">
          <div class="market-cap-row">
            <span class="market-cap-label">MC</span>
            <span class="market-cap-value">{{ formatMarketCap(token.marketCap) }}</span>
            <div class="market-cap-progress">
              <div class="progress-bar" [style.width.%]="getBondingProgress()"></div>
            </div>
            <span class="market-cap-change" [class.positive]="getPriceChange() > 0" [class.negative]="getPriceChange() < 0">
              {{ getPriceChange() > 0 ? '↑' : '↓' }} {{ Math.abs(getPriceChange()).toFixed(2) }}%
            </span>
          </div>
        </div>

        <!-- Description -->
        <p class="token-description">
          {{ token.description || 'No description available.' }}
        </p>
      </div>
    </div>
  `,
  styles: [`
    .token-card-compact {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: rgba(26, 27, 31, 0.8);
      border: 1px solid rgba(55, 58, 68, 0.5);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
    }

    .token-card-compact:hover {
      background: rgba(30, 31, 35, 0.9);
      border-color: rgba(139, 92, 246, 0.5);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .token-image-wrapper {
      flex-shrink: 0;
      width: 64px;
      height: 64px;
      border-radius: 10px;
      overflow: hidden;
      background: rgba(139, 92, 246, 0.1);
    }

    .token-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .token-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }

    .token-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .token-name {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .token-time {
      font-size: 12px;
      color: #6b7280;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .token-symbol {
      font-size: 13px;
      color: #9ca3af;
      font-weight: 500;
    }

    .market-cap-section {
      margin-top: 4px;
    }

    .market-cap-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .market-cap-label {
      color: #6b7280;
      font-weight: 500;
    }

    .market-cap-value {
      color: #fff;
      font-weight: 600;
    }

    .market-cap-progress {
      flex: 1;
      height: 4px;
      background: rgba(55, 58, 68, 0.5);
      border-radius: 2px;
      overflow: hidden;
      min-width: 40px;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .market-cap-change {
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .market-cap-change.positive {
      color: #10b981;
    }

    .market-cap-change.negative {
      color: #ef4444;
    }

    .token-description {
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      margin-top: 2px;
    }

    /* Mobile responsive */
    @media (max-width: 640px) {
      .token-card-compact {
        padding: 12px;
        gap: 12px;
      }

      .token-image-wrapper {
        width: 56px;
        height: 56px;
      }

      .token-name {
        font-size: 14px;
      }

      .token-time,
      .market-cap-row {
        font-size: 11px;
      }
    }
  `]
})
export class TokenCardComponent {
  @Input() token!: Token;
  Math = Math; // Expose Math to template

  constructor(private router: Router) {}

  get isNew(): boolean {
    const createdAt = new Date(this.token.createdAt);
    const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation < 24;
  }

  getTimeAgo(): string {
    const createdAt = new Date(this.token.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${diffDay}d ago`;
  }

  getBondingProgress(): number {
    // Calculate bonding curve progress (0-100%)
    // Assume graduation threshold is $50k market cap
    const graduationThreshold = 50000;
    const numMarketCap = typeof this.token.marketCap === 'string' 
      ? parseFloat(this.token.marketCap) 
      : this.token.marketCap;
    
    if (!numMarketCap || numMarketCap === 0) return 0;
    
    const progress = (numMarketCap / graduationThreshold) * 100;
    return Math.min(progress, 100);
  }

  getPriceChange(): number {
    // Mock price change for now (would come from API with historical data)
    // Random between -10% and +10% for demonstration
    return (Math.random() * 20) - 10;
  }

  getCreatorIcon(): string {
    switch (this.token.creatorType) {
      case 'clawdbot':
        return 'pi pi-android text-primary-500';
      case 'agent':
        return 'pi pi-robot text-secondary-500';
      case 'human':
        return 'pi pi-user text-gray-500';
      default:
        return 'pi pi-circle text-gray-500';
    }
  }

  getCreatorLabel(): string {
    switch (this.token.creatorType) {
      case 'clawdbot':
        return 'Created by ClawdBot';
      case 'agent':
        return 'Created by AI Agent';
      case 'human':
        return 'Created by Human';
      default:
        return 'Unknown Creator';
    }
  }

  formatPrice(price: number | string | null | undefined): string {
    // Convert to number if it's a string (common with PostgreSQL decimal types)
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (numPrice === null || numPrice === undefined || isNaN(numPrice) || numPrice === 0) {
      return '0.000000';
    }
    if (numPrice < 0.000001) {
      return numPrice.toExponential(2);
    }
    return numPrice.toFixed(6);
  }

  formatMarketCap(marketCap: number | string | null | undefined): string {
    const numMarketCap = typeof marketCap === 'string' ? parseFloat(marketCap) : marketCap;
    
    if (numMarketCap === null || numMarketCap === undefined || isNaN(numMarketCap) || numMarketCap === 0) {
      return '$0.00';
    }
    if (numMarketCap >= 1000000) {
      return `$${(numMarketCap / 1000000).toFixed(2)}M`;
    } else if (numMarketCap >= 1000) {
      return `$${(numMarketCap / 1000).toFixed(2)}K`;
    }
    return `$${numMarketCap.toFixed(2)}`;
  }

  formatVolume(volume: number | string | null | undefined): string {
    const numVolume = typeof volume === 'string' ? parseFloat(volume) : volume;
    
    if (numVolume === null || numVolume === undefined || isNaN(numVolume) || numVolume === 0) {
      return '0.00 SOL';
    }
    if (numVolume >= 1000) {
      return `${(numVolume / 1000).toFixed(2)}K SOL`;
    }
    return `${numVolume.toFixed(2)} SOL`;
  }

  onImageError(event: any): void {
    event.target.src = 'assets/default-token.svg';
  }
}
