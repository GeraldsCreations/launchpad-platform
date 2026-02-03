import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Holder {
  wallet: string;
  amount: number;
  amountFormatted: string;
  percentage: number;
  avatar: string;
}

@Component({
  selector: 'app-holders-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="holders-container">
      <!-- Header -->
      <div class="holders-header">
        <span class="header-label">Wallet</span>
        <span class="header-label">Amount</span>
      </div>

      <!-- Holders list -->
      <div class="holders-list">
        <div 
          class="holder-item" 
          *ngFor="let holder of holders"
          [@slideIn]>
          <div class="holder-info">
            <div class="wallet-icon" [style.background]="holder.avatar">
              <i class="pi pi-wallet"></i>
            </div>
            <div class="wallet-details">
              <span class="wallet-address">{{ formatWallet(holder.wallet) }}</span>
              <span class="wallet-percentage">{{ holder.percentage }}% of supply</span>
            </div>
          </div>
          <div class="holder-amount">
            <span class="amount">{{ holder.amountFormatted }}</span>
          </div>
        </div>

        <!-- Loading state -->
        <div class="loading-state" *ngIf="loading">
          <div class="spinner"></div>
          <p>Loading holders...</p>
        </div>

        <!-- Empty state -->
        <div class="empty-state" *ngIf="holders.length === 0 && !loading">
          <div class="empty-icon">👥</div>
          <p>No holders yet</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .holders-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .holders-header {
      display: flex;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(139, 92, 246, 0.05);
      border-bottom: 1px solid var(--border-default);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .holders-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .holders-list::-webkit-scrollbar {
      width: 6px;
    }

    .holders-list::-webkit-scrollbar-track {
      background: var(--bg-primary);
    }

    .holders-list::-webkit-scrollbar-thumb {
      background: var(--border-default);
      border-radius: 3px;
    }

    .holder-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: var(--bg-primary);
      border-radius: 8px;
      margin-bottom: 8px;
      transition: all 0.2s ease;
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

    .holder-item:hover {
      background: rgba(139, 92, 246, 0.05);
      transform: translateX(2px);
    }

    .holder-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }

    .wallet-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
      flex-shrink: 0;
    }

    .wallet-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .wallet-address {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .wallet-percentage {
      font-size: 11px;
      color: var(--text-muted);
    }

    .holder-amount {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      flex-shrink: 0;
    }

    .amount {
      font-weight: 600;
      color: var(--accent-success);
      font-size: 14px;
      white-space: nowrap;
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: var(--text-muted);
      text-align: center;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-default);
      border-top-color: var(--accent-purple);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 12px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .loading-state p,
    .empty-state p {
      font-size: 14px;
      margin: 0;
    }
  `]
})
export class HoldersListComponent implements OnInit {
  @Input() tokenAddress: string = '';
  @Input() tokenSymbol: string = '';

  holders: Holder[] = [];
  loading: boolean = false;

  // Mock wallet colors
  private walletColors = [
    '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', 
    '#3b82f6', '#ec4899', '#14b8a6', '#f97316'
  ];

  ngOnInit(): void {
    this.loadHolders();
  }

  private loadHolders(): void {
    this.loading = true;

    // Simulate API call
    setTimeout(() => {
      this.holders = [
        {
          wallet: 'wallets:3vat21',
          amount: 100,
          amountFormatted: '$100 ETH',
          percentage: 10.5,
          avatar: this.walletColors[0]
        },
        {
          wallet: 'wallets:72delá',
          amount: 30,
          amountFormatted: '$30 ETH',
          percentage: 3.2,
          avatar: this.walletColors[1]
        },
        {
          wallet: 'wallets:236of7',
          amount: 7,
          amountFormatted: '$7 ETH',
          percentage: 0.7,
          avatar: this.walletColors[2]
        },
        {
          wallet: 'wallets:3770f5',
          amount: 2,
          amountFormatted: '$2 ETH',
          percentage: 0.2,
          avatar: this.walletColors[3]
        },
        {
          wallet: 'wallets:3870fe',
          amount: 3,
          amountFormatted: '$3 ETH',
          percentage: 0.3,
          avatar: this.walletColors[4]
        }
      ];
      this.loading = false;
    }, 1000);
  }

  formatWallet(wallet: string): string {
    if (wallet.length <= 15) return wallet;
    return `${wallet.substring(0, 10)}...${wallet.substring(wallet.length - 5)}`;
  }
}
