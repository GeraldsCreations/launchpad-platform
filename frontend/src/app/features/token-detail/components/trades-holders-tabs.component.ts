import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, interval } from 'rxjs';
import { ApiService, Trade, Holder } from '../../../core/services/api.service';
import { TokenWebSocketService } from '../services/token-websocket.service';

interface TradeWithTimestamp extends Omit<Trade, 'timestamp'> {
  timestamp: Date;
}

@Component({
  selector: 'app-trades-holders-tabs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="trades-holders-container">
      <!-- Tab Navigation -->
      <div class="tabs-nav">
        <button 
          class="tab-btn"
          [class.active]="activeTab === 'trades'"
          (click)="switchTab('trades')">
          <i class="pi pi-chart-line"></i>
          Trades
        </button>
        <button 
          class="tab-btn"
          [class.active]="activeTab === 'holders'"
          (click)="switchTab('holders')">
          <i class="pi pi-users"></i>
          Holders
        </button>
      </div>

      <!-- Trades Tab -->
      @if (activeTab === 'trades') {
        <div class="tab-content">
          <!-- Filters & Controls -->
          <div class="controls-bar">
            <div class="filter-group">
              <select 
                [(ngModel)]="filterSide" 
                (change)="applyFilters()"
                class="filter-select">
                <option value="all">All Trades</option>
                <option value="buy">Buys Only</option>
                <option value="sell">Sells Only</option>
              </select>

              <select 
                [(ngModel)]="sortBy" 
                (change)="applySorting()"
                class="filter-select">
                <option value="time-desc">Newest First</option>
                <option value="time-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
            </div>

            <div class="pagination-controls">
              <span class="trades-count">{{ filteredTrades.length }} trades</span>
              <select 
                [(ngModel)]="pageSize" 
                (change)="changePage(1)"
                class="page-size-select">
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
          </div>

          <!-- Trades Table -->
          <div class="trades-table-wrapper">
            @if (loading) {
              <div class="loading-state">
                <i class="pi pi-spin pi-spinner"></i>
                <p>Loading trades...</p>
              </div>
            }
            @else if (paginatedTrades.length === 0) {
              <div class="empty-state">
                <i class="pi pi-chart-line"></i>
                <p>No trades yet</p>
              </div>
            }
            @else {
              <table class="trades-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Amount (SOL)</th>
                    <th>Tokens</th>
                    <th>Price</th>
                    <th>Trader</th>
                    <th>Txn</th>
                  </tr>
                </thead>
                <tbody>
                  @for (trade of paginatedTrades; track trade.signature) {
                    <tr class="trade-row" [class.buy]="trade.side === 'buy'" [class.sell]="trade.side === 'sell'">
                      <td class="time-cell">{{ formatTime(trade.timestamp) }}</td>
                      <td class="type-cell">
                        <span class="trade-badge" [class.buy]="trade.side === 'buy'" [class.sell]="trade.side === 'sell'">
                          {{ trade.side === 'buy' ? 'BUY' : 'SELL' }}
                        </span>
                      </td>
                      <td class="amount-cell">{{ trade.amountSol.toFixed(4) }}</td>
                      <td class="tokens-cell">{{ formatTokenAmount(trade.amountTokens) }}</td>
                      <td class="price-cell">\${{ trade.price.toFixed(6) }}</td>
                      <td class="trader-cell">
                        <a [href]="'https://solscan.io/account/' + trade.trader" target="_blank" class="trader-link">
                          {{ formatAddress(trade.trader) }}
                        </a>
                      </td>
                      <td class="txn-cell">
                        <a [href]="'https://solscan.io/tx/' + trade.signature" target="_blank" class="txn-link">
                          <i class="pi pi-external-link"></i>
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>

          <!-- Pagination -->
          @if (totalPages > 1) {
            <div class="pagination-bar">
              <button 
                class="page-btn"
                [disabled]="currentPage === 1"
                (click)="changePage(currentPage - 1)">
                <i class="pi pi-chevron-left"></i>
              </button>

              <div class="page-numbers">
                @for (page of getPageNumbers(); track page) {
                  @if (page === '...') {
                    <span class="page-ellipsis">...</span>
                  } @else {
                    <button 
                      class="page-number"
                      [class.active]="currentPage === page"
                      (click)="typeof page === 'number' && changePage(page)">
                      {{ page }}
                    </button>
                  }
                }
              </div>

              <button 
                class="page-btn"
                [disabled]="currentPage === totalPages"
                (click)="changePage(currentPage + 1)">
                <i class="pi pi-chevron-right"></i>
              </button>

              <span class="page-info">
                Page {{ currentPage }} of {{ totalPages }}
              </span>
            </div>
          }
        </div>
      }

      <!-- Holders Tab -->
      @if (activeTab === 'holders') {
        <div class="tab-content">
          @if (loadingHolders) {
            <div class="loading-state">
              <i class="pi pi-spin pi-spinner"></i>
              <p>Loading holders...</p>
            </div>
          }
          @else if (holders.length === 0) {
            <div class="empty-state">
              <i class="pi pi-users"></i>
              <p>No holders yet</p>
            </div>
          }
          @else {
            <div class="holders-table-wrapper">
              <table class="holders-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Address</th>
                    <th>Balance</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  @for (holder of holders; track holder.address; let i = $index) {
                    <tr class="holder-row">
                      <td class="rank-cell">{{ i + 1 }}</td>
                      <td class="address-cell">
                        <a [href]="'https://solscan.io/account/' + holder.address" target="_blank" class="address-link">
                          {{ formatAddress(holder.address) }}
                        </a>
                      </td>
                      <td class="balance-cell">{{ formatTokenAmount(holder.balance) }}</td>
                      <td class="percentage-cell">{{ holder.percentage.toFixed(2) }}%</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .trades-holders-container {
      background: var(--bg-secondary);
      border-radius: 12px;
      overflow: hidden;
    }

    /* Tab Navigation */
    .tabs-nav {
      display: flex;
      border-bottom: 2px solid var(--border-default);
      background: rgba(26, 27, 31, 0.5);
    }

    .tab-btn {
      flex: 1;
      padding: 16px 24px;
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
    }

    .tab-btn:hover {
      color: var(--text-primary);
      background: rgba(139, 92, 246, 0.05);
    }

    .tab-btn.active {
      color: var(--accent-purple);
      border-bottom-color: var(--accent-purple);
      background: rgba(139, 92, 246, 0.1);
    }

    .tab-btn i {
      font-size: 18px;
    }

    /* Tab Content */
    .tab-content {
      padding: 1.5rem;
    }

    /* Controls Bar */
    .controls-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .filter-select, .page-size-select {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-default);
      color: var(--text-primary);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .filter-select:hover, .page-size-select:hover {
      border-color: var(--accent-purple);
      background: rgba(139, 92, 246, 0.05);
    }

    .filter-select:focus, .page-size-select:focus {
      outline: none;
      border-color: var(--accent-purple);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .trades-count {
      color: var(--text-secondary);
      font-size: 14px;
      font-weight: 500;
    }

    /* Trades Table */
    .trades-table-wrapper {
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--border-default);
      max-height: 600px;
      overflow-y: auto;
    }

    .trades-table {
      width: 100%;
      border-collapse: collapse;
    }

    .trades-table thead {
      position: sticky;
      top: 0;
      background: var(--bg-tertiary);
      z-index: 10;
    }

    .trades-table th {
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-default);
    }

    .trades-table td {
      padding: 12px 16px;
      font-size: 14px;
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-subtle);
    }

    .trade-row {
      transition: background 0.15s ease;
    }

    .trade-row:hover {
      background: rgba(139, 92, 246, 0.05);
    }

    .trade-badge {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .trade-badge.buy {
      background: rgba(16, 185, 129, 0.15);
      color: var(--success-500);
    }

    .trade-badge.sell {
      background: rgba(239, 68, 68, 0.15);
      color: var(--danger-500);
    }

    .trader-link, .address-link, .txn-link {
      color: var(--accent-purple);
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .trader-link:hover, .address-link:hover, .txn-link:hover {
      color: var(--accent-purple-light);
      text-decoration: underline;
    }

    .time-cell {
      color: var(--text-secondary);
      font-size: 13px;
    }

    /* Holders Table */
    .holders-table-wrapper {
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--border-default);
      max-height: 600px;
      overflow-y: auto;
    }

    .holders-table {
      width: 100%;
      border-collapse: collapse;
    }

    .holders-table thead {
      position: sticky;
      top: 0;
      background: var(--bg-tertiary);
      z-index: 10;
    }

    .holders-table th {
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-default);
    }

    .holders-table td {
      padding: 12px 16px;
      font-size: 14px;
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-subtle);
    }

    .holder-row:hover {
      background: rgba(139, 92, 246, 0.05);
    }

    .rank-cell {
      font-weight: 600;
      color: var(--text-secondary);
    }

    /* Pagination Bar */
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-default);
    }

    .page-btn {
      padding: 8px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-default);
      color: var(--text-primary);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .page-btn:hover:not(:disabled) {
      background: rgba(139, 92, 246, 0.1);
      border-color: var(--accent-purple);
    }

    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .page-numbers {
      display: flex;
      gap: 0.25rem;
    }

    .page-number {
      padding: 8px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-default);
      color: var(--text-primary);
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
      min-width: 40px;
    }

    .page-number:hover {
      background: rgba(139, 92, 246, 0.1);
      border-color: var(--accent-purple);
    }

    .page-number.active {
      background: var(--accent-purple);
      border-color: var(--accent-purple);
      color: white;
    }

    .page-ellipsis {
      padding: 8px 4px;
      color: var(--text-secondary);
    }

    .page-info {
      color: var(--text-secondary);
      font-size: 14px;
      margin-left: 0.5rem;
    }

    /* States */
    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      color: var(--text-secondary);
    }

    .loading-state i, .empty-state i {
      font-size: 48px;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .loading-state p, .empty-state p {
      font-size: 16px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .controls-bar {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-group {
        width: 100%;
      }

      .filter-select, .page-size-select {
        flex: 1;
      }

      .pagination-controls {
        width: 100%;
        justify-content: space-between;
      }

      .trades-table th,
      .trades-table td {
        padding: 8px 12px;
        font-size: 12px;
      }

      .page-numbers {
        flex: 1;
        justify-content: center;
      }
    }
  `]
})
export class TradesHoldersTabsComponent implements OnInit, OnDestroy {
  @Input() tokenAddress: string = '';

  activeTab: 'trades' | 'holders' = 'trades';
  
  // Trades data
  allTrades: TradeWithTimestamp[] = [];
  filteredTrades: TradeWithTimestamp[] = [];
  paginatedTrades: TradeWithTimestamp[] = [];
  loading: boolean = true;
  
  // Filters & Sorting
  filterSide: 'all' | 'buy' | 'sell' = 'all';
  sortBy: 'time-desc' | 'time-asc' | 'amount-desc' | 'amount-asc' = 'time-desc';
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 20;
  totalPages: number = 1;
  
  // Holders data
  holders: Holder[] = [];
  loadingHolders: boolean = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private tokenWsService: TokenWebSocketService
  ) {}

  ngOnInit(): void {
    this.loadTrades();
    this.subscribeToNewTrades();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Switch between tabs
   */
  switchTab(tab: 'trades' | 'holders'): void {
    this.activeTab = tab;
    
    if (tab === 'holders' && this.holders.length === 0) {
      this.loadHolders();
    }
  }

  /**
   * Load trades history
   */
  private loadTrades(): void {
    this.loading = true;
    
    this.apiService.getTokenTrades(this.tokenAddress, 500)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (trades) => {
          this.allTrades = trades.map(trade => ({
            ...trade,
            timestamp: new Date(trade.timestamp || Date.now())
          }));
          
          this.applyFiltersAndSorting();
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load trades:', err);
          this.loading = false;
        }
      });
  }

  /**
   * Subscribe to real-time trades
   */
  private subscribeToNewTrades(): void {
    this.tokenWsService.newTrade$
      .pipe(takeUntil(this.destroy$))
      .subscribe(trade => {
        const tradeWithTimestamp: TradeWithTimestamp = {
          id: 0, // NewTrade.id is string, we use 0 for real-time trades
          transactionSignature: trade.id, // Use NewTrade.id as signature placeholder
          signature: trade.id,
          tokenAddress: this.tokenAddress,
          trader: trade.trader,
          side: trade.side,
          amountSol: trade.amountSol,
          amountTokens: trade.amountTokens,
          price: trade.price,
          fee: 0, // Fee not available from WebSocket
          timestamp: new Date(trade.timestamp) // Convert Unix timestamp to Date
        };
        
        // Add to beginning of array
        this.allTrades.unshift(tradeWithTimestamp);
        
        // Keep max 1000 trades in memory
        if (this.allTrades.length > 1000) {
          this.allTrades = this.allTrades.slice(0, 1000);
        }
        
        this.applyFiltersAndSorting();
      });
  }

  /**
   * Load holders list
   */
  private loadHolders(): void {
    this.loadingHolders = true;
    
    this.apiService.getTokenHolders(this.tokenAddress)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (holders) => {
          this.holders = holders;
          this.loadingHolders = false;
        },
        error: (err) => {
          console.error('Failed to load holders:', err);
          this.loadingHolders = false;
        }
      });
  }

  /**
   * Apply filters
   */
  applyFilters(): void {
    this.applyFiltersAndSorting();
  }

  /**
   * Apply sorting
   */
  applySorting(): void {
    this.applyFiltersAndSorting();
  }

  /**
   * Apply filters and sorting together
   */
  private applyFiltersAndSorting(): void {
    // Filter
    let filtered = this.allTrades;
    
    if (this.filterSide !== 'all') {
      filtered = filtered.filter(trade => trade.side === this.filterSide);
    }
    
    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (this.sortBy) {
        case 'time-desc':
          return b.timestamp.getTime() - a.timestamp.getTime();
        case 'time-asc':
          return a.timestamp.getTime() - b.timestamp.getTime();
        case 'amount-desc':
          return b.amountSol - a.amountSol;
        case 'amount-asc':
          return a.amountSol - b.amountSol;
        default:
          return 0;
      }
    });
    
    this.filteredTrades = filtered;
    this.totalPages = Math.ceil(this.filteredTrades.length / this.pageSize);
    
    // Reset to page 1 if current page is out of bounds
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }
    
    this.updatePagination();
  }

  /**
   * Change page
   */
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    
    this.currentPage = page;
    this.updatePagination();
    
    // Scroll to top of table
    const wrapper = document.querySelector('.trades-table-wrapper');
    if (wrapper) {
      wrapper.scrollTop = 0;
    }
  }

  /**
   * Update paginated trades
   */
  private updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedTrades = this.filteredTrades.slice(startIndex, endIndex);
  }

  /**
   * Get page numbers for pagination
   */
  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    
    if (total <= 7) {
      // Show all pages
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, current, and nearby pages
      pages.push(1);
      
      if (current > 3) {
        pages.push('...');
      }
      
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }
      
      if (current < total - 2) {
        pages.push('...');
      }
      
      pages.push(total);
    }
    
    return pages;
  }

  /**
   * Format time ago
   */
  formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${diffDay}d ago`;
  }

  /**
   * Format token amount (abbreviate large numbers)
   */
  formatTokenAmount(amount: number): string {
    if (amount >= 1_000_000_000) {
      return (amount / 1_000_000_000).toFixed(2) + 'B';
    } else if (amount >= 1_000_000) {
      return (amount / 1_000_000).toFixed(2) + 'M';
    } else if (amount >= 1_000) {
      return (amount / 1_000).toFixed(2) + 'K';
    }
    return amount.toFixed(2);
  }

  /**
   * Format address (show first 4 and last 4 chars)
   */
  formatAddress(address: string): string {
    if (!address || address.length < 12) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }
}
