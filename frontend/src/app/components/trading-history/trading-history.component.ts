import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { WalletService } from '../../core/services/wallet.service';

export interface TradeRecord {
  id: string;
  date: Date;
  token: string;
  tokenSymbol: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  status: 'completed' | 'pending' | 'failed';
  transactionSignature: string;
  profitLoss?: number;
  profitLossPercent?: number;
}

@Component({
  selector: 'app-trading-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    InputTextModule,
    TagModule,
    TooltipModule
  ],
  template: `
    <p-card class="trading-history-card">
      <ng-template pTemplate="header">
        <div class="card-header">
          <div class="header-left">
            <h2 class="text-2xl font-bold text-gradient">Trading History</h2>
            <p class="text-sm text-gray-400">Track all your trades and performance</p>
          </div>
          <div class="header-right">
            <button class="view-toggle" 
                    [class.active]="viewMode === 'table'"
                    (click)="viewMode = 'table'"
                    pTooltip="Table View">
              <i class="pi pi-table"></i>
            </button>
            <button class="view-toggle" 
                    [class.active]="viewMode === 'list'"
                    (click)="viewMode = 'list'"
                    pTooltip="List View">
              <i class="pi pi-list"></i>
            </button>
          </div>
        </div>
      </ng-template>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-row">
          <!-- Date Range -->
          <div class="filter-item">
            <label class="filter-label">Date Range</label>
            <p-calendar 
              [(ngModel)]="dateRange"
              (ngModelChange)="applyFilters()"
              selectionMode="range"
              [readonlyInput]="true"
              placeholder="Select dates"
              dateFormat="yy-mm-dd"
              styleClass="w-full">
            </p-calendar>
          </div>

          <!-- Trade Type -->
          <div class="filter-item">
            <label class="filter-label">Type</label>
            <p-dropdown 
              [(ngModel)]="selectedType"
              (ngModelChange)="applyFilters()"
              [options]="typeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Trades"
              styleClass="w-full">
            </p-dropdown>
          </div>

          <!-- Token Filter -->
          <div class="filter-item">
            <label class="filter-label">Token</label>
            <input 
              pInputText 
              type="text" 
              [(ngModel)]="tokenFilter"
              (ngModelChange)="applyFilters()"
              placeholder="Search token..."
              class="w-full">
          </div>

          <!-- Export Button -->
          <div class="filter-item">
            <label class="filter-label">&nbsp;</label>
            <p-button 
              label="Export CSV"
              icon="pi pi-download"
              (onClick)="exportToCSV()"
              styleClass="p-button-outlined w-full">
            </p-button>
          </div>
        </div>
      </div>

      <!-- Table View -->
      <div *ngIf="viewMode === 'table'" class="table-container">
        <p-table 
          [value]="filteredTrades"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          [loading]="loading"
          [responsive]="true"
          styleClass="trading-table">
          
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="date">
                Date <p-sortIcon field="date"></p-sortIcon>
              </th>
              <th pSortableColumn="token">
                Token <p-sortIcon field="token"></p-sortIcon>
              </th>
              <th pSortableColumn="type">
                Type <p-sortIcon field="type"></p-sortIcon>
              </th>
              <th pSortableColumn="amount" class="text-right">
                Amount <p-sortIcon field="amount"></p-sortIcon>
              </th>
              <th pSortableColumn="price" class="text-right">
                Price <p-sortIcon field="price"></p-sortIcon>
              </th>
              <th pSortableColumn="total" class="text-right">
                Total <p-sortIcon field="total"></p-sortIcon>
              </th>
              <th pSortableColumn="profitLoss" class="text-right">
                P&L <p-sortIcon field="profitLoss"></p-sortIcon>
              </th>
              <th>Status</th>
              <th class="text-center">Actions</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-trade>
            <tr [class.fade-in]="true">
              <td>{{ trade.date | date:'short' }}</td>
              <td>
                <div class="token-cell">
                  <span class="token-symbol">{{ trade.tokenSymbol }}</span>
                </div>
              </td>
              <td>
                <p-tag 
                  [value]="trade.type.toUpperCase()"
                  [severity]="trade.type === 'buy' ? 'success' : 'danger'"
                  [icon]="trade.type === 'buy' ? 'pi pi-arrow-up' : 'pi pi-arrow-down'">
                </p-tag>
              </td>
              <td class="text-right mono">{{ trade.amount.toLocaleString(undefined, {maximumFractionDigits: 2}) }}</td>
              <td class="text-right mono">{{ trade.price.toFixed(8) }} SOL</td>
              <td class="text-right mono font-semibold">{{ trade.total.toFixed(4) }} SOL</td>
              <td class="text-right">
                <span *ngIf="trade.profitLoss !== undefined" 
                      [class.profit]="trade.profitLoss > 0"
                      [class.loss]="trade.profitLoss < 0"
                      class="pnl-value">
                  {{ trade.profitLoss > 0 ? '+' : '' }}{{ trade.profitLoss.toFixed(4) }} SOL
                  <span class="pnl-percent" *ngIf="trade.profitLossPercent !== undefined">
                    ({{ trade.profitLossPercent > 0 ? '+' : '' }}{{ trade.profitLossPercent.toFixed(2) }}%)
                  </span>
                </span>
                <span *ngIf="trade.profitLoss === undefined" class="text-gray-500">—</span>
              </td>
              <td>
                <p-tag 
                  [value]="trade.status"
                  [severity]="getStatusSeverity(trade.status)">
                </p-tag>
              </td>
              <td class="text-center">
                <button 
                  class="action-btn"
                  (click)="viewOnExplorer(trade.transactionSignature)"
                  pTooltip="View on Solana Explorer">
                  <i class="pi pi-external-link"></i>
                </button>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="9" class="text-center py-8">
                <div class="empty-state">
                  <i class="pi pi-inbox empty-icon"></i>
                  <p class="empty-text">No trading history found</p>
                  <p class="empty-subtext">Your completed trades will appear here</p>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- List View -->
      <div *ngIf="viewMode === 'list'" class="list-container">
        <div *ngFor="let trade of filteredTrades" class="trade-card">
          <div class="trade-card-header">
            <div class="trade-info">
              <span class="token-symbol">{{ trade.tokenSymbol }}</span>
              <p-tag 
                [value]="trade.type.toUpperCase()"
                [severity]="trade.type === 'buy' ? 'success' : 'danger'"
                [icon]="trade.type === 'buy' ? 'pi pi-arrow-up' : 'pi pi-arrow-down'">
              </p-tag>
            </div>
            <span class="trade-date">{{ trade.date | date:'short' }}</span>
          </div>

          <div class="trade-card-body">
            <div class="trade-detail">
              <span class="detail-label">Amount:</span>
              <span class="detail-value">{{ trade.amount.toLocaleString(undefined, {maximumFractionDigits: 2}) }}</span>
            </div>
            <div class="trade-detail">
              <span class="detail-label">Price:</span>
              <span class="detail-value mono">{{ trade.price.toFixed(8) }} SOL</span>
            </div>
            <div class="trade-detail">
              <span class="detail-label">Total:</span>
              <span class="detail-value font-semibold">{{ trade.total.toFixed(4) }} SOL</span>
            </div>
            <div class="trade-detail" *ngIf="trade.profitLoss !== undefined">
              <span class="detail-label">P&L:</span>
              <span class="detail-value" 
                    [class.profit]="trade.profitLoss > 0"
                    [class.loss]="trade.profitLoss < 0">
                {{ trade.profitLoss > 0 ? '+' : '' }}{{ trade.profitLoss.toFixed(4) }} SOL
                <span *ngIf="trade.profitLossPercent !== undefined">
                  ({{ trade.profitLossPercent > 0 ? '+' : '' }}{{ trade.profitLossPercent.toFixed(2) }}%)
                </span>
              </span>
            </div>
          </div>

          <div class="trade-card-footer">
            <p-tag 
              [value]="trade.status"
              [severity]="getStatusSeverity(trade.status)">
            </p-tag>
            <button 
              class="action-btn"
              (click)="viewOnExplorer(trade.transactionSignature)">
              <i class="pi pi-external-link mr-2"></i>
              View Transaction
            </button>
          </div>
        </div>

        <div *ngIf="filteredTrades.length === 0" class="empty-state">
          <i class="pi pi-inbox empty-icon"></i>
          <p class="empty-text">No trading history found</p>
          <p class="empty-subtext">Your completed trades will appear here</p>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="stats-section">
        <div class="stat-card">
          <span class="stat-label">Total Trades</span>
          <span class="stat-value">{{ filteredTrades.length }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Total Volume</span>
          <span class="stat-value">{{ totalVolume.toFixed(2) }} SOL</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Total P&L</span>
          <span class="stat-value" 
                [class.profit]="totalPnL > 0"
                [class.loss]="totalPnL < 0">
            {{ totalPnL > 0 ? '+' : '' }}{{ totalPnL.toFixed(4) }} SOL
          </span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Win Rate</span>
          <span class="stat-value">{{ winRate.toFixed(1) }}%</span>
        </div>
      </div>
    </p-card>
  `,
  styles: [`
    .trading-history-card {
      background: linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 16px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid rgba(139, 92, 246, 0.1);
    }

    .text-gradient {
      background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-right {
      display: flex;
      gap: 0.5rem;
    }

    .view-toggle {
      padding: 0.5rem 1rem;
      background: rgba(31, 41, 55, 0.8);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 8px;
      color: #9CA3AF;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .view-toggle:hover {
      background: rgba(139, 92, 246, 0.2);
      border-color: #8B5CF6;
      color: #A78BFA;
    }

    .view-toggle.active {
      background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%);
      border-color: #8B5CF6;
      color: white;
    }

    .filters-section {
      padding: 1.5rem;
      border-bottom: 1px solid rgba(75, 85, 99, 0.3);
    }

    .filter-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .filter-item {
      display: flex;
      flex-direction: column;
    }

    .filter-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #9CA3AF;
      margin-bottom: 0.5rem;
    }

    .table-container {
      padding: 1rem;
    }

    .token-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .token-symbol {
      font-weight: 600;
      color: #E5E7EB;
    }

    .mono {
      font-family: 'Courier New', monospace;
    }

    .pnl-value {
      font-weight: 600;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .pnl-value.profit {
      color: #10B981;
    }

    .pnl-value.loss {
      color: #EF4444;
    }

    .pnl-percent {
      font-size: 0.75rem;
      opacity: 0.8;
    }

    .action-btn {
      background: transparent;
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 6px;
      color: #A78BFA;
      padding: 0.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .action-btn:hover {
      background: rgba(139, 92, 246, 0.2);
      border-color: #8B5CF6;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
    }

    .empty-icon {
      font-size: 4rem;
      color: #4B5563;
      margin-bottom: 1rem;
    }

    .empty-text {
      font-size: 1.125rem;
      font-weight: 600;
      color: #9CA3AF;
      margin-bottom: 0.5rem;
    }

    .empty-subtext {
      font-size: 0.875rem;
      color: #6B7280;
    }

    .list-container {
      padding: 1rem;
      display: grid;
      gap: 1rem;
    }

    .trade-card {
      background: rgba(17, 24, 39, 0.8);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 12px;
      padding: 1.25rem;
      transition: all 0.3s ease;
    }

    .trade-card:hover {
      border-color: rgba(139, 92, 246, 0.4);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .trade-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(75, 85, 99, 0.3);
    }

    .trade-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .trade-date {
      font-size: 0.875rem;
      color: #9CA3AF;
    }

    .trade-card-body {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .trade-detail {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-label {
      font-size: 0.875rem;
      color: #9CA3AF;
    }

    .detail-value {
      font-size: 0.875rem;
      color: #E5E7EB;
      font-weight: 500;
    }

    .detail-value.profit {
      color: #10B981;
      font-weight: 600;
    }

    .detail-value.loss {
      color: #EF4444;
      font-weight: 600;
    }

    .trade-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(75, 85, 99, 0.3);
    }

    .stats-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      padding: 1.5rem;
      border-top: 1px solid rgba(75, 85, 99, 0.3);
      background: rgba(17, 24, 39, 0.5);
      border-radius: 0 0 16px 16px;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      background: rgba(31, 41, 55, 0.6);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 8px;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: #E5E7EB;
      font-family: 'Courier New', monospace;
    }

    .stat-value.profit {
      color: #10B981;
    }

    .stat-value.loss {
      color: #EF4444;
    }

    .fade-in {
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .filter-row {
        grid-template-columns: 1fr;
      }

      .trade-card-body {
        grid-template-columns: 1fr;
      }

      .stats-section {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class TradingHistoryComponent implements OnInit, OnDestroy {
  viewMode: 'table' | 'list' = 'table';
  
  allTrades: TradeRecord[] = [];
  filteredTrades: TradeRecord[] = [];
  
  dateRange: Date[] | null = null;
  selectedType: string | null = null;
  tokenFilter: string = '';
  
  typeOptions = [
    { label: 'All Trades', value: null },
    { label: 'Buys', value: 'buy' },
    { label: 'Sells', value: 'sell' }
  ];

  loading: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private walletService: WalletService
  ) {}

  ngOnInit(): void {
    this.loadTradingHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTradingHistory(): void {
    this.loading = true;
    
    // Mock data - replace with actual API call
    setTimeout(() => {
      this.allTrades = this.generateMockTrades();
      this.filteredTrades = [...this.allTrades];
      this.loading = false;
    }, 500);
  }

  private generateMockTrades(): TradeRecord[] {
    const tokens = ['BONK', 'USDC', 'RAY', 'ORCA', 'SRM'];
    const trades: TradeRecord[] = [];
    
    for (let i = 0; i < 20; i++) {
      const type = Math.random() > 0.5 ? 'buy' : 'sell';
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      const amount = Math.random() * 10000 + 100;
      const price = Math.random() * 0.001 + 0.0001;
      const total = amount * price;
      const profitLoss = (Math.random() - 0.5) * total * 0.3;
      
      trades.push({
        id: `trade-${i}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        token: `${token}address`,
        tokenSymbol: token,
        type: type as 'buy' | 'sell',
        amount,
        price,
        total,
        status: 'completed',
        transactionSignature: `sig${i}${'x'.repeat(60)}`,
        profitLoss,
        profitLossPercent: (profitLoss / total) * 100
      });
    }
    
    return trades.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  applyFilters(): void {
    this.filteredTrades = this.allTrades.filter(trade => {
      // Date range filter
      if (this.dateRange && this.dateRange[0] && this.dateRange[1]) {
        const tradeDate = trade.date.getTime();
        const startDate = this.dateRange[0].getTime();
        const endDate = this.dateRange[1].getTime();
        if (tradeDate < startDate || tradeDate > endDate) {
          return false;
        }
      }

      // Type filter
      if (this.selectedType && trade.type !== this.selectedType) {
        return false;
      }

      // Token filter
      if (this.tokenFilter && !trade.tokenSymbol.toLowerCase().includes(this.tokenFilter.toLowerCase())) {
        return false;
      }

      return true;
    });
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'danger';
      default: return 'info';
    }
  }

  viewOnExplorer(signature: string): void {
    const url = `https://solscan.io/tx/${signature}`;
    window.open(url, '_blank');
  }

  exportToCSV(): void {
    const headers = ['Date', 'Token', 'Type', 'Amount', 'Price', 'Total', 'P&L', 'Status', 'Transaction'];
    const rows = this.filteredTrades.map(trade => [
      trade.date.toISOString(),
      trade.tokenSymbol,
      trade.type,
      trade.amount,
      trade.price,
      trade.total,
      trade.profitLoss || 0,
      trade.status,
      trade.transactionSignature
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trading-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  get totalVolume(): number {
    return this.filteredTrades.reduce((sum, trade) => sum + trade.total, 0);
  }

  get totalPnL(): number {
    return this.filteredTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
  }

  get winRate(): number {
    const wins = this.filteredTrades.filter(trade => (trade.profitLoss || 0) > 0).length;
    return this.filteredTrades.length > 0 ? (wins / this.filteredTrades.length) * 100 : 0;
  }
}
