import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { TokenWebSocketService } from '../services/token-websocket.service';

export interface RecentTrade {
  id: string;
  type: 'buy' | 'sell';
  price: number;
  priceUsd: number;
  amountSol: number;
  amountTokens: string;
  trader: string;
  timestamp: string;
  txSignature: string;
}

@Component({
  selector: 'app-recent-trades-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="trades-table-container">
      <!-- Header -->
      <div class="table-header">
        <span class="header-cell type-col">Type</span>
        <span class="header-cell price-col">Price (SOL)</span>
        <span class="header-cell amount-col">Amount</span>
        <span class="header-cell trader-col">Trader</span>
        <span class="header-cell time-col">Time</span>
      </div>

      <!-- Trades List -->
      <div class="trades-list">
        @if (trades.length > 0) {
          @for (trade of trades; track trade.id) {
            <div 
              class="trade-row"
              [class.trade-buy]="trade.type === 'buy'"
              [class.trade-sell]="trade.type === 'sell'"
              (click)="openTransaction(trade.txSignature)">
              
              <span class="trade-cell type-col">
                <span class="trade-type" [class.buy]="trade.type === 'buy'" [class.sell]="trade.type === 'sell'">
                  {{ trade.type.toUpperCase() }}
                </span>
              </span>
              
              <span class="trade-cell price-col">
                <span class="trade-price">{{ formatPrice(trade.price) }}</span>
                <span class="trade-price-usd">\${{ formatUsd(trade.priceUsd) }}</span>
              </span>
              
              <span class="trade-cell amount-col">
                <span class="trade-amount-sol">{{ formatAmount(trade.amountSol) }} SOL</span>
                <span class="trade-amount-tokens">{{ formatTokens(trade.amountTokens) }}</span>
              </span>
              
              <span class="trade-cell trader-col">
                <span class="trader-address" [title]="trade.trader">
                  {{ truncateAddress(trade.trader) }}
                </span>
              </span>
              
              <span class="trade-cell time-col">
                <span class="trade-time">{{ formatTime(trade.timestamp) }}</span>
              </span>
            </div>
          }
        } @else {
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <p>No trades yet</p>
            <small>Be the first to trade!</small>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .trades-table-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-secondary, #1a1a2e);
      border-radius: 8px;
      overflow: hidden;
    }

    .table-header {
      display: grid;
      grid-template-columns: 80px 140px 140px 120px 80px;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(139, 92, 246, 0.1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255, 255, 255, 0.6);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .header-cell {
      text-align: left;
    }

    .price-col {
      text-align: right;
    }

    .amount-col {
      text-align: right;
    }

    .time-col {
      text-align: right;
    }

    .trades-list {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .trades-list::-webkit-scrollbar {
      width: 6px;
    }

    .trades-list::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
    }

    .trades-list::-webkit-scrollbar-thumb {
      background: rgba(139, 92, 246, 0.3);
      border-radius: 3px;
    }

    .trades-list::-webkit-scrollbar-thumb:hover {
      background: rgba(139, 92, 246, 0.5);
    }

    .trade-row {
      display: grid;
      grid-template-columns: 80px 140px 140px 120px 80px;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: all 0.2s ease;
      cursor: pointer;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .trade-row:hover {
      background: rgba(139, 92, 246, 0.05);
    }

    .trade-row.trade-buy {
      border-left: 2px solid #10b981;
    }

    .trade-row.trade-sell {
      border-left: 2px solid #ef4444;
    }

    .trade-cell {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
    }

    .trade-type {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .trade-type.buy {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .trade-type.sell {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .trade-price {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      font-weight: 600;
      color: #ffffff;
    }

    .trade-price-usd {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
    }

    .trade-amount-sol {
      font-size: 13px;
      font-weight: 600;
      color: #ffffff;
    }

    .trade-amount-tokens {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
    }

    .trader-address {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #8b5cf6;
      text-decoration: none;
    }

    .trader-address:hover {
      text-decoration: underline;
    }

    .trade-time {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      text-align: right;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      color: rgba(255, 255, 255, 0.5);
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state p {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    .empty-state small {
      font-size: 13px;
      opacity: 0.7;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .table-header,
      .trade-row {
        grid-template-columns: 60px 100px 100px 80px 60px;
        font-size: 11px;
      }

      .trader-col {
        display: none;
      }
    }
  `]
})
export class RecentTradesTableComponent implements OnInit, OnDestroy {
  @Input() tokenAddress: string = '';
  @Input() maxTrades: number = 30;

  trades: RecentTrade[] = [];
  private destroy$ = new Subject<void>();

  constructor(private wsService: TokenWebSocketService) {}

  ngOnInit(): void {
    // Subscribe to real-time trades
    this.wsService.trades$
      .pipe(takeUntil(this.destroy$))
      .subscribe(trade => {
        this.addTrade(trade);
      });

    // Load initial mock trades for demo
    this.loadMockTrades();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private addTrade(trade: any): void {
    const recentTrade: RecentTrade = {
      id: trade.signature || Date.now().toString(),
      type: trade.side,
      price: trade.price,
      priceUsd: trade.price * 100, // Assuming SOL = $100
      amountSol: trade.amountSol,
      amountTokens: trade.amountTokens,
      trader: trade.trader,
      timestamp: trade.timestamp || new Date().toISOString(),
      txSignature: trade.signature || ''
    };

    // Add to front of array
    this.trades.unshift(recentTrade);

    // Keep only max trades
    if (this.trades.length > this.maxTrades) {
      this.trades = this.trades.slice(0, this.maxTrades);
    }
  }

  private loadMockTrades(): void {
    const now = Date.now();
    const mockTrades: RecentTrade[] = [
      {
        id: '1',
        type: 'buy',
        price: 0.00077,
        priceUsd: 0.077,
        amountSol: 0.5,
        amountTokens: '15430000',
        trader: 'wallets:3vat21',
        timestamp: new Date(now - 2000).toISOString(),
        txSignature: '5KqV...'
      },
      {
        id: '2',
        type: 'sell',
        price: 0.00071,
        priceUsd: 0.071,
        amountSol: 0.035,
        amountTokens: '49130',
        trader: 'wallets:72delá',
        timestamp: new Date(now - 5000).toISOString(),
        txSignature: '8hRz...'
      },
      {
        id: '3',
        type: 'buy',
        price: 0.00021,
        priceUsd: 0.021,
        amountSol: 0.35,
        amountTokens: '1690000',
        trader: 'wallets:236of7',
        timestamp: new Date(now - 8000).toISOString(),
        txSignature: '3mNp...'
      },
      {
        id: '4',
        type: 'buy',
        price: 0.00067,
        priceUsd: 0.067,
        amountSol: 1.5,
        amountTokens: '2240000',
        trader: 'wallets:3770f5',
        timestamp: new Date(now - 12000).toISOString(),
        txSignature: '9kWv...'
      },
      {
        id: '5',
        type: 'sell',
        price: 0.00049,
        priceUsd: 0.049,
        amountSol: 0.15,
        amountTokens: '306122',
        trader: 'wallets:3870fe',
        timestamp: new Date(now - 18000).toISOString(),
        txSignature: '2pLk...'
      }
    ];

    this.trades = mockTrades;
  }

  formatPrice(price: number): string {
    if (price < 0.00001) return price.toExponential(2);
    if (price < 0.01) return price.toFixed(8);
    return price.toFixed(6);
  }

  formatUsd(usd: number): string {
    if (usd < 0.01) return usd.toFixed(6);
    return usd.toFixed(2);
  }

  formatAmount(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(4);
  }

  formatTokens(tokens: string): string {
    const num = parseFloat(tokens);
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  truncateAddress(address: string): string {
    if (!address || address.length < 12) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  formatTime(timestamp: string): string {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diffSec = Math.floor((now - time) / 1000);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }

  openTransaction(signature: string): void {
    if (signature && signature !== '...') {
      window.open(`https://solscan.io/tx/${signature}`, '_blank');
    }
  }
}
