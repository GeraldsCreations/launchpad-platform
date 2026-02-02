import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { WalletService } from '../../core/services/wallet.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule],
  template: `
    <div class="dashboard-container max-w-7xl mx-auto px-4 py-8">
      <h1 class="text-4xl font-bold mb-8">📊 Dashboard</h1>

      @if (!walletConnected) {
        <p-card>
          <div class="text-center py-12">
            <i class="pi pi-wallet text-4xl text-gray-500 mb-4"></i>
            <h2 class="text-2xl font-semibold mb-2">Connect Your Wallet</h2>
            <p class="text-gray-400">Connect your wallet to view your portfolio</p>
          </div>
        </p-card>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <p-card>
            <div class="text-center">
              <div class="text-sm text-gray-400 mb-2">SOL Balance</div>
              <div class="text-3xl font-bold">{{ solBalance.toFixed(4) }}</div>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <div class="text-sm text-gray-400 mb-2">Total Holdings</div>
              <div class="text-3xl font-bold">$0.00</div>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <div class="text-sm text-gray-400 mb-2">Total PnL</div>
              <div class="text-3xl font-bold text-green-500">+$0.00</div>
            </div>
          </p-card>
        </div>

        <p-card>
          <ng-template pTemplate="header">
            <div class="p-4 font-semibold">Your Tokens</div>
          </ng-template>
          <div class="text-center py-12 text-gray-400">
            No tokens in your portfolio yet
          </div>
        </p-card>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: calc(100vh - 80px);
    }
  `]
})
export class DashboardComponent implements OnInit {
  walletConnected = false;
  solBalance = 0;

  constructor(
    private walletService: WalletService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.walletService.connected$.subscribe(connected => {
      this.walletConnected = connected;
      if (connected) {
        this.loadBalance();
      }
    });
  }

  async loadBalance(): Promise<void> {
    this.solBalance = await this.walletService.getBalance();
  }
}
