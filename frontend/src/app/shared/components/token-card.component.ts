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
    <p-card 
      [routerLink]="['/token', token.address]"
      class="token-card cursor-pointer hover:shadow-lg transition-all">
      <ng-template pTemplate="header">
        <div class="relative">
          <img 
            [src]="token.imageUrl || 'assets/default-token.svg'" 
            [alt]="token.name"
            class="w-full h-48 object-cover"
            (error)="onImageError($event)">
          @if (token.graduated) {
            <p-badge 
              value="GRADUATED" 
              severity="success"
              styleClass="absolute top-2 right-2">
            </p-badge>
          }
          @if (isNew) {
            <p-badge 
              value="NEW" 
              severity="info"
              styleClass="absolute top-2 left-2">
            </p-badge>
          }
        </div>
      </ng-template>
      
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold truncate flex-1">{{ token.name }}</h3>
          <p-chip 
            [label]="token.symbol" 
            styleClass="text-sm">
          </p-chip>
        </div>

        @if (token.creatorType) {
          <div class="flex items-center gap-2">
            <app-bot-badge 
              [creatorType]="token.creatorType" 
              [compact]="true">
            </app-bot-badge>
            @if (token.creatorType === 'human') {
              <span class="text-sm text-gray-400">
                {{ getCreatorLabel() }}
              </span>
            }
          </div>
        }

        <div class="grid grid-cols-2 gap-2">
          <div>
            <div class="text-xs text-gray-500">Price</div>
            <div class="font-semibold">{{ formatPrice(token.currentPrice) }} SOL</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Market Cap</div>
            <div class="font-semibold">{{ formatMarketCap(token.marketCap) }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">24h Volume</div>
            <div class="font-semibold">{{ formatVolume(token.volume24h) }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Holders</div>
            <div class="font-semibold">{{ token.holderCount }}</div>
          </div>
        </div>

        @if (token.description) {
          <p class="text-sm text-gray-400 line-clamp-2">
            {{ token.description }}
          </p>
        }
      </div>
    </p-card>
  `,
  styles: [`
    .token-card {
      height: 100%;
      transition: all 0.3s ease;
    }

    .token-card:hover {
      transform: translateY(-4px);
    }

    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class TokenCardComponent {
  @Input() token!: Token;

  constructor(private router: Router) {}

  get isNew(): boolean {
    const createdAt = new Date(this.token.createdAt);
    const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation < 24;
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

  formatPrice(price: number | null | undefined): string {
    if (price === null || price === undefined || price === 0) {
      return '0.000000';
    }
    if (price < 0.000001) {
      return price.toExponential(2);
    }
    return price.toFixed(6);
  }

  formatMarketCap(marketCap: number | null | undefined): string {
    if (marketCap === null || marketCap === undefined || marketCap === 0) {
      return '$0.00';
    }
    if (marketCap >= 1000000) {
      return `$${(marketCap / 1000000).toFixed(2)}M`;
    } else if (marketCap >= 1000) {
      return `$${(marketCap / 1000).toFixed(2)}K`;
    }
    return `$${marketCap.toFixed(2)}`;
  }

  formatVolume(volume: number | null | undefined): string {
    if (volume === null || volume === undefined || volume === 0) {
      return '0.00 SOL';
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K SOL`;
    }
    return `${volume.toFixed(2)} SOL`;
  }

  onImageError(event: any): void {
    event.target.src = 'assets/default-token.svg';
  }
}
