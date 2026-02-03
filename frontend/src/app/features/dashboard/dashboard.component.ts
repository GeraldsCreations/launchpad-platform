import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TabViewModule } from 'primeng/tabview';
import { WalletService } from '../../core/services/wallet.service';
import { ApiService, Trade } from '../../core/services/api.service';
import { Subject, takeUntil } from 'rxjs';

interface PortfolioToken {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  balance: number;
  valueUsd: number;
  pnl: number;
  pnlPercent: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    CardModule, 
    TableModule, 
    ButtonModule,
    ProgressSpinnerModule,
    TabViewModule
  ],
  template: `
    <div class="dashboard-container max-w-7xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-4xl font-bold">📊 Dashboard</h1>
        @if (walletConnected) {
          <p-button 
            icon="pi pi-refresh"
            (onClick)="loadPortfolio()"
            [loading]="loading"
            styleClass="p-button-outlined">
          </p-button>
        }
      </div>

      @if (!walletConnected) {
        <p-card>
          <div class="text-center py-12">
            <i class="pi pi-wallet text-6xl text-gray-500 mb-4"></i>
            <h2 class="text-2xl font-semibold mb-3">Connect Your Wallet</h2>
            <p class="text-gray-400 mb-6">Connect your wallet to view your portfolio and transaction history</p>
          </div>
        </p-card>
      } @else {
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <p-card styleClass="stat-card">
            <div class="text-center">
              <i class="pi pi-wallet text-3xl text-primary-400 mb-2"></i>
              <div class="text-sm text-gray-400 mb-1">SOL Balance</div>
              <div class="text-2xl font-bold">{{ solBalance.toFixed(4) }}</div>
            </div>
          </p-card>
          
          <p-card styleClass="stat-card">
            <div class="text-center">
              <i class="pi pi-chart-line text-3xl text-success-400 mb-2"></i>
              <div class="text-sm text-gray-400 mb-1">Portfolio Value</div>
              <div class="text-2xl font-bold">{{ totalValue.toFixed(2) }} SOL</div>
            </div>
          </p-card>
          
          <p-card styleClass="stat-card">
            <div class="text-center">
              <i class="pi pi-dollar text-3xl text-info-400 mb-2"></i>
              <div class="text-sm text-gray-400 mb-1">Total P&L</div>
              <div class="text-2xl font-bold" [class.text-green-500]="totalPnl >= 0" [class.text-red-500]="totalPnl < 0">
                {{ totalPnl >= 0 ? '+' : '' }}{{ totalPnl.toFixed(2) }} SOL
              </div>
            </div>
          </p-card>
          
          <p-card styleClass="stat-card">
            <div class="text-center">
              <i class="pi pi-chart-bar text-3xl text-warning-400 mb-2"></i>
              <div class="text-sm text-gray-400 mb-1">Tokens Owned</div>
              <div class="text-2xl font-bold">{{ portfolio.length }}</div>
            </div>
          </p-card>
        </div>

        <!-- Tabs -->
        <p-tabView>
          <!-- Portfolio Tab -->
          <p-tabPanel header="💼 Portfolio">
            <p-card>
              @if (loading) {
                <div class="flex justify-center py-12">
                  <p-progressSpinner></p-progressSpinner>
                </div>
              } @else if (portfolio.length > 0) {
                <p-table [value]="portfolio" styleClass="p-datatable-sm">
                  <ng-template pTemplate="header">
                    <tr>
                      <th>Token</th>
                      <th>Balance</th>
                      <th>Value</th>
                      <th>P&L</th>
                      <th>Actions</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-item>
                    <tr>
                      <td>
                        <div class="font-semibold">{{ item.tokenName }}</div>
                        <div class="text-sm text-gray-400">{{ item.tokenSymbol }}</div>
                      </td>
                      <td>{{ item.balance.toLocaleString() }}</td>
                      <td>{{ item.valueUsd.toFixed(4) }} SOL</td>
                      <td>
                        <span [class.text-green-500]="item.pnl >= 0" [class.text-red-500]="item.pnl < 0">
                          {{ item.pnl >= 0 ? '+' : '' }}{{ item.pnl.toFixed(4) }} SOL
                          ({{ item.pnlPercent.toFixed(2) }}%)
                        </span>
                      </td>
                      <td>
                        <p-button 
                          icon="pi pi-external-link"
                          [routerLink]="['/token', item.tokenAddress]"
                          styleClass="p-button-sm p-button-text">
                        </p-button>
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              } @else {
                <div class="text-center py-12 text-gray-400">
                  <i class="pi pi-inbox text-4xl mb-4"></i>
                  <p class="mb-4">No tokens in your portfolio yet</p>
                  <p-button 
                    label="Explore Tokens"
                    icon="pi pi-compass"
                    routerLink="/explore"
                    styleClass="p-button-outlined">
                  </p-button>
                </div>
              }
            </p-card>
          </p-tabPanel>

          <!-- Transaction History Tab -->
          <p-tabPanel header="📋 Transaction History">
            <p-card>
              @if (loadingTrades) {
                <div class="flex justify-center py-12">
                  <p-progressSpinner></p-progressSpinner>
                </div>
              } @else if (trades.length > 0) {
                <div class="space-y-3">
                  @for (trade of trades; track trade.id) {
                    <div class="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                      <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full flex items-center justify-center"
                             [class.bg-green-500/20]="trade.side === 'buy'"
                             [class.bg-red-500/20]="trade.side === 'sell'">
                          <i [class]="trade.side === 'buy' ? 'pi pi-arrow-down text-green-500' : 'pi pi-arrow-up text-red-500'"></i>
                        </div>
                        <div>
                          <div class="font-semibold">
                            {{ trade.side === 'buy' ? 'Bought' : 'Sold' }} {{ trade.amountTokens.toLocaleString() }} tokens
                          </div>
                          <div class="text-sm text-gray-400">
                            {{ formatDate(trade.timestamp) }}
                          </div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-semibold">{{ trade.amountSol.toFixed(4) }} SOL</div>
                        <div class="text-sm text-gray-400">
                          @ {{ trade.price.toFixed(8) }}
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="text-center py-12 text-gray-400">
                  <i class="pi pi-history text-4xl mb-4"></i>
                  <p>No transaction history yet</p>
                </div>
              }
            </p-card>
          </p-tabPanel>
        </p-tabView>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: calc(100vh - 80px);
    }

    :host ::ng-deep .stat-card {
      transition: transform 0.2s ease;
    }

    :host ::ng-deep .stat-card:hover {
      transform: translateY(-4px);
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  walletConnected = false;
  solBalance = 0;
  totalValue = 0;
  totalPnl = 0;
  portfolio: PortfolioToken[] = [];
  trades: Trade[] = [];
  loading = false;
  loadingTrades = false;

  private destroy$ = new Subject<void>();

  constructor(
    private walletService: WalletService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.walletService.connected$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.walletConnected = connected;
        if (connected) {
          this.loadPortfolio();
          this.loadTransactionHistory();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadPortfolio(): Promise<void> {
    const walletAddress = this.walletService.getPublicKeyString();
    if (!walletAddress) return;

    this.loading = true;
    this.solBalance = await this.walletService.getBalance();

    // TODO: Implement portfolio endpoint in backend
    // For now, show empty portfolio
    this.portfolio = [];
    this.totalValue = 0;
    this.totalPnl = 0;
    this.loading = false;
  }

  loadTransactionHistory(): void {
    const walletAddress = this.walletService.getPublicKeyString();
    if (!walletAddress) return;

    this.loadingTrades = true;
    this.apiService.getUserTrades(walletAddress, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (trades) => {
          this.trades = trades;
          this.loadingTrades = false;
        },
        error: (error) => {
          console.error('Failed to load trades:', error);
          this.loadingTrades = false;
        }
      });
  }

  formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return hours === 0 ? 'Just now' : `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}
