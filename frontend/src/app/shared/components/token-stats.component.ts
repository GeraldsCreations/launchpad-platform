import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';

export interface PlatformStats {
  total_tokens: number;
  total_volume_24h: number;
  total_trades_24h: number;
  total_graduated: number;
  active_traders_24h: number;
}

@Component({
  selector: 'app-token-stats',
  standalone: true,
  imports: [CommonModule, CardModule, SkeletonModule],
  template: `
    <div class="stats-grid grid grid-cols-2 md:grid-cols-5 gap-4">
      @if (loading) {
        @for (item of [1,2,3,4,5]; track item) {
          <p-card styleClass="stats-card">
            <p-skeleton width="100%" height="1.5rem" styleClass="mb-2"></p-skeleton>
            <p-skeleton width="60%" height="2rem"></p-skeleton>
          </p-card>
        }
      } @else if (stats) {
        <p-card styleClass="stats-card stat-primary">
          <div class="stat-content">
            <i class="pi pi-chart-line stat-icon"></i>
            <div>
              <div class="stat-label">Total Tokens</div>
              <div class="stat-value">{{ formatNumber(stats.total_tokens) }}</div>
            </div>
          </div>
        </p-card>

        <p-card styleClass="stats-card stat-success">
          <div class="stat-content">
            <i class="pi pi-dollar stat-icon"></i>
            <div>
              <div class="stat-label">24h Volume</div>
              <div class="stat-value">{{ formatVolume(stats.total_volume_24h) }}</div>
            </div>
          </div>
        </p-card>

        <p-card styleClass="stats-card stat-info">
          <div class="stat-content">
            <i class="pi pi-sync stat-icon"></i>
            <div>
              <div class="stat-label">24h Trades</div>
              <div class="stat-value">{{ formatNumber(stats.total_trades_24h) }}</div>
            </div>
          </div>
        </p-card>

        <p-card styleClass="stats-card stat-warning">
          <div class="stat-content">
            <i class="pi pi-star stat-icon"></i>
            <div>
              <div class="stat-label">Graduated</div>
              <div class="stat-value">{{ formatNumber(stats.total_graduated) }}</div>
            </div>
          </div>
        </p-card>

        <p-card styleClass="stats-card stat-secondary">
          <div class="stat-content">
            <i class="pi pi-users stat-icon"></i>
            <div>
              <div class="stat-label">Active Traders</div>
              <div class="stat-value">{{ formatNumber(stats.active_traders_24h) }}</div>
            </div>
          </div>
        </p-card>
      }
    </div>
  `,
  styles: [`
    .stats-grid {
      margin-bottom: 2rem;
    }

    :host ::ng-deep .stats-card {
      height: 100%;
      transition: all 0.3s ease;
    }

    :host ::ng-deep .stats-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .stat-icon {
      font-size: 2rem;
      opacity: 0.8;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #9ca3af;
      margin-bottom: 0.25rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }

    :host ::ng-deep .stat-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    :host ::ng-deep .stat-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    :host ::ng-deep .stat-info {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    }

    :host ::ng-deep .stat-warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }

    :host ::ng-deep .stat-secondary {
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    }

    :host ::ng-deep .stat-primary .stat-icon,
    :host ::ng-deep .stat-success .stat-icon,
    :host ::ng-deep .stat-info .stat-icon,
    :host ::ng-deep .stat-warning .stat-icon,
    :host ::ng-deep .stat-secondary .stat-icon {
      color: rgba(255, 255, 255, 0.9);
    }

    :host ::ng-deep .stat-primary .stat-label,
    :host ::ng-deep .stat-success .stat-label,
    :host ::ng-deep .stat-info .stat-label,
    :host ::ng-deep .stat-warning .stat-label,
    :host ::ng-deep .stat-secondary .stat-label {
      color: rgba(255, 255, 255, 0.8);
    }

    :host ::ng-deep .stat-primary .stat-value,
    :host ::ng-deep .stat-success .stat-value,
    :host ::ng-deep .stat-info .stat-value,
    :host ::ng-deep .stat-warning .stat-value,
    :host ::ng-deep .stat-secondary .stat-value {
      color: white;
    }
  `]
})
export class TokenStatsComponent {
  @Input() stats: PlatformStats | null = null;
  @Input() loading: boolean = false;

  formatNumber(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }

  formatVolume(value: number): string {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K SOL`;
    }
    return `${value.toFixed(1)} SOL`;
  }
}
