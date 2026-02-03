import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { SkeletonModule } from 'primeng/skeleton';
import { FormsModule } from '@angular/forms';
import { ApiService, Token } from '../../core/services/api.service';
import { TokenCardComponent } from '../../shared/components/token-card.component';

interface SortOption {
  label: string;
  value: string;
}

interface BotStats {
  totalTokens: number;
  totalVolume: number;
  successRate: number;
  avgMarketCap: number;
}

@Component({
  selector: 'app-bot-tokens',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CardModule,
    ButtonModule,
    DropdownModule,
    SkeletonModule,
    TokenCardComponent,
  ],
  template: `
    <div class="bot-tokens-page">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="hero-content">
          <div class="hero-icon">
            <i class="pi pi-android"></i>
          </div>
          <h1 class="hero-title">Bot-Created Tokens</h1>
          <p class="hero-subtitle">
            Discover tokens created by OpenClaw's autonomous trading bots and AI agents
          </p>
        </div>
      </div>

      <!-- Stats Section -->
      <div class="stats-grid">
        @if (loading) {
          @for (i of [1,2,3,4]; track i) {
            <p-card class="stat-card">
              <p-skeleton height="2rem"></p-skeleton>
              <p-skeleton height="1rem" styleClass="mt-2"></p-skeleton>
            </p-card>
          }
        } @else {
          <p-card class="stat-card">
            <div class="stat-value">{{ stats.totalTokens }}</div>
            <div class="stat-label">Total Bot Tokens</div>
          </p-card>

          <p-card class="stat-card">
            <div class="stat-value">{{ formatVolume(stats.totalVolume) }}</div>
            <div class="stat-label">Total Volume</div>
          </p-card>

          <p-card class="stat-card">
            <div class="stat-value">{{ stats.successRate.toFixed(1) }}%</div>
            <div class="stat-label">Success Rate</div>
          </p-card>

          <p-card class="stat-card">
            <div class="stat-value">{{ formatMarketCap(stats.avgMarketCap) }}</div>
            <div class="stat-label">Avg Market Cap</div>
          </p-card>
        }
      </div>

      <!-- Controls Section -->
      <div class="controls-section">
        <div class="controls-left">
          <h2 class="section-title">All Bot Tokens</h2>
          <span class="token-count">{{ tokens.length }} tokens found</span>
        </div>
        <div class="controls-right">
          <p-dropdown
            [options]="sortOptions"
            [(ngModel)]="selectedSort"
            (onChange)="onSortChange()"
            placeholder="Sort by"
            [style]="{ 'min-width': '180px' }">
          </p-dropdown>
        </div>
      </div>

      <!-- Tokens Grid -->
      <div class="tokens-grid">
        @if (loading) {
          @for (i of [1,2,3,4,5,6]; track i) {
            <p-card>
              <p-skeleton height="200px" styleClass="mb-3"></p-skeleton>
              <p-skeleton height="1.5rem" styleClass="mb-2"></p-skeleton>
              <p-skeleton height="1rem" width="60%" styleClass="mb-3"></p-skeleton>
              <div class="grid grid-cols-2 gap-2">
                <p-skeleton height="3rem"></p-skeleton>
                <p-skeleton height="3rem"></p-skeleton>
              </div>
            </p-card>
          }
        } @else if (tokens.length === 0) {
          <div class="empty-state">
            <i class="pi pi-search empty-icon"></i>
            <h3>No Bot Tokens Yet</h3>
            <p>Bot-created tokens will appear here once they're launched</p>
          </div>
        } @else {
          @for (token of sortedTokens; track token.address) {
            <app-token-card [token]="token"></app-token-card>
          }
        }
      </div>

      <!-- Load More -->
      @if (!loading && tokens.length > 0 && hasMore) {
        <div class="load-more-section">
          <p-button
            label="Load More"
            icon="pi pi-refresh"
            [loading]="loadingMore"
            (onClick)="loadMore()"
            styleClass="p-button-outlined p-button-lg">
          </p-button>
        </div>
      }
    </div>
  `,
  styles: [`
    .bot-tokens-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Hero Section */
    .hero-section {
      background: linear-gradient(135deg, #a855f7 0%, #06b6d4 100%);
      border-radius: 1.5rem;
      padding: 3rem 2rem;
      margin-bottom: 2rem;
      position: relative;
      overflow: hidden;
    }

    .hero-section::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 40%;
      height: 200%;
      background: radial-gradient(
        circle,
        rgba(255, 255, 255, 0.1) 0%,
        transparent 70%
      );
      animation: hero-glow 3s ease-in-out infinite;
    }

    @keyframes hero-glow {
      0%, 100% {
        transform: translateY(0) scale(1);
        opacity: 0.3;
      }
      50% {
        transform: translateY(-20px) scale(1.1);
        opacity: 0.5;
      }
    }

    .hero-content {
      position: relative;
      z-index: 1;
      text-align: center;
      color: white;
    }

    .hero-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-10px);
      }
    }

    .hero-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin: 0 0 1rem 0;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .hero-subtitle {
      font-size: 1.125rem;
      opacity: 0.95;
      margin: 0;
      max-width: 600px;
      margin: 0 auto;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      text-align: center;
      transition: transform 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-4px);
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      background: linear-gradient(135deg, #a855f7 0%, #06b6d4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-color-secondary);
      margin-top: 0.5rem;
    }

    /* Controls */
    .controls-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .controls-left {
      display: flex;
      align-items: baseline;
      gap: 1rem;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }

    .token-count {
      color: var(--text-color-secondary);
      font-size: 0.875rem;
    }

    .controls-right {
      display: flex;
      gap: 1rem;
    }

    /* Tokens Grid */
    .tokens-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    /* Empty State */
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 4rem 2rem;
    }

    .empty-icon {
      font-size: 4rem;
      color: var(--text-color-secondary);
      opacity: 0.5;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: var(--text-color-secondary);
    }

    /* Load More */
    .load-more-section {
      display: flex;
      justify-content: center;
      margin-top: 2rem;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .bot-tokens-page {
        padding: 1rem;
      }

      .hero-section {
        padding: 2rem 1rem;
      }

      .hero-title {
        font-size: 1.75rem;
      }

      .hero-subtitle {
        font-size: 1rem;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .tokens-grid {
        grid-template-columns: 1fr;
      }

      .controls-section {
        flex-direction: column;
        align-items: flex-start;
      }

      .controls-right {
        width: 100%;
      }
    }
  `]
})
export class BotTokensComponent implements OnInit {
  tokens: Token[] = [];
  loading: boolean = true;
  loadingMore: boolean = false;
  hasMore: boolean = false;

  selectedSort: string = 'newest';
  sortOptions: SortOption[] = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Top Performing', value: 'performance' },
    { label: 'Most Volume', value: 'volume' },
    { label: 'Highest Market Cap', value: 'marketcap' },
  ];

  stats: BotStats = {
    totalTokens: 0,
    totalVolume: 0,
    successRate: 0,
    avgMarketCap: 0,
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadBotTokens();
  }

  async loadBotTokens(): Promise<void> {
    try {
      this.loading = true;
      this.tokens = await this.apiService.getBotCreatedTokens().toPromise() || [];
      this.calculateStats();
    } catch (error) {
      console.error('Error loading bot tokens:', error);
    } finally {
      this.loading = false;
    }
  }

  calculateStats(): void {
    this.stats.totalTokens = this.tokens.length;
    this.stats.totalVolume = this.tokens.reduce((sum, t) => sum + (t.volume24h || 0), 0);
    
    const graduatedCount = this.tokens.filter(t => t.graduated).length;
    this.stats.successRate = this.tokens.length > 0 
      ? (graduatedCount / this.tokens.length) * 100 
      : 0;
    
    this.stats.avgMarketCap = this.tokens.length > 0
      ? this.tokens.reduce((sum, t) => sum + (t.marketCap || 0), 0) / this.tokens.length
      : 0;
  }

  get sortedTokens(): Token[] {
    const sorted = [...this.tokens];
    
    switch (this.selectedSort) {
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'performance':
        return sorted.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      case 'volume':
        return sorted.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
      case 'marketcap':
        return sorted.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      default:
        return sorted;
    }
  }

  onSortChange(): void {
    // Tokens are re-sorted via the sortedTokens getter
  }

  async loadMore(): Promise<void> {
    this.loadingMore = true;
    // In production, this would fetch more tokens
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.loadingMore = false;
  }

  formatVolume(volume: number | string): string {
    const num = typeof volume === 'string' ? parseFloat(volume) : volume;
    if (isNaN(num)) return '0.00 SOL';
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M SOL`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K SOL`;
    }
    return `${num.toFixed(2)} SOL`;
  }

  formatMarketCap(marketCap: number | string): string {
    const num = typeof marketCap === 'string' ? parseFloat(marketCap) : marketCap;
    if (isNaN(num)) return '$0.00';
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
  }
}
