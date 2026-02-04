import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TokenPerformance } from '../../../../core/services/analytics.service';

@Component({
  selector: 'app-top-performers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-performers.component.html',
  styleUrls: ['./top-performers.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopPerformersComponent {
  @Input() performers: TokenPerformance[] = [];
  @Input() title: string = 'Top Performers';
  @Input() showBadge: boolean = true;
  @Output() tokenClick = new EventEmitter<string>();

  formatCurrency(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return '$' + (value / 1000000).toFixed(2) + 'M';
    } else if (Math.abs(value) >= 1000) {
      return '$' + (value / 1000).toFixed(2) + 'K';
    }
    return '$' + value.toFixed(2);
  }

  formatPercent(value: number): string {
    return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
  }

  getChangeClass(value: number): string {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }

  onTokenClick(address: string): void {
    this.tokenClick.emit(address);
  }

  trackByAddress(index: number, item: TokenPerformance): string {
    return item.tokenAddress;
  }
}
