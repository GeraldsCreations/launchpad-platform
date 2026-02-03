import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TokenHolding } from '../services/portfolio.service';

@Component({
  selector: 'app-portfolio-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './portfolio-card.component.html',
  styleUrls: ['./portfolio-card.component.scss']
})
export class PortfolioCardComponent {
  @Input() holding!: TokenHolding;
  @Input() animationDelay = 0;
  @Output() tradeClicked = new EventEmitter<string>();

  Math = Math;

  formatBalance(balance: number): string {
    if (balance >= 1000000) {
      return (balance / 1000000).toFixed(2) + 'M';
    }
    if (balance >= 1000) {
      return (balance / 1000).toFixed(2) + 'K';
    }
    return balance.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 4 
    });
  }

  formatPrice(price: number): string {
    if (price < 0.01) {
      return price.toFixed(8);
    }
    if (price < 1) {
      return price.toFixed(4);
    }
    return price.toFixed(2);
  }

  formatValue(value: number): string {
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }

  onTradeClick(): void {
    this.tradeClicked.emit(this.holding.tokenAddress);
  }
}
