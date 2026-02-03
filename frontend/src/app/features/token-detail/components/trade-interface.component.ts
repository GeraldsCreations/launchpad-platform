import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TabViewModule } from 'primeng/tabview';
import { tokenDetailAnimations } from '../token-detail.animations';
import { ApiService } from '../../../core/services/api.service';
import { SolanaWalletService, WalletState } from '../../../core/services/solana-wallet.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Subject, takeUntil, debounceTime } from 'rxjs';

type TradeType = 'buy' | 'sell';

interface PriceImpact {
  percentage: number;
  severity: 'low' | 'medium' | 'high';
  color: string;
}

@Component({
  selector: 'app-trade-interface',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputNumberModule,
    TabViewModule
  ],
  animations: tokenDetailAnimations,
  template: `
    <div class="trade-interface" [@cardSlideIn]>
      <p-card>
        <ng-template pTemplate="header">
          <div class="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 class="text-lg font-semibold text-white">Trade {{ tokenSymbol }}</h3>
            @if (walletConnected) {
              <div class="text-xs text-gray-400">
                Balance: {{ walletBalance.toFixed(4) }} SOL
              </div>
            }
          </div>
        </ng-template>

        <!-- Buy/Sell Tabs -->
        <div class="trade-tabs mb-4">
          <div class="flex gap-2">
            <button
              (click)="setTradeType('buy')"
              [class.active]="tradeType === 'buy'"
              class="tab-btn flex-1 py-3 rounded-lg font-semibold transition-all duration-200"
              [class.bg-green-500]="tradeType === 'buy'"
              [class.text-white]="tradeType === 'buy'"
              [class.bg-gray-800]="tradeType !== 'buy'"
              [class.text-gray-400]="tradeType !== 'buy'">
              <i class="pi pi-arrow-up mr-2"></i>
              BUY
            </button>
            <button
              (click)="setTradeType('sell')"
              [class.active]="tradeType === 'sell'"
              class="tab-btn flex-1 py-3 rounded-lg font-semibold transition-all duration-200"
              [class.bg-red-500]="tradeType === 'sell'"
              [class.text-white]="tradeType === 'sell'"
              [class.bg-gray-800]="tradeType !== 'sell'"
              [class.text-gray-400]="tradeType !== 'sell'">
              <i class="pi pi-arrow-down mr-2"></i>
              SELL
            </button>
          </div>
        </div>

        <!-- Amount Input -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-2">
              You {{ tradeType === 'buy' ? 'pay' : 'sell' }}
            </label>
            <div class="input-wrapper relative">
              <input
                type="number"
                [(ngModel)]="amountSOL"
                (ngModelChange)="onAmountChange()"
                [placeholder]="'0.00'"
                class="trade-input w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg focus:outline-none focus:border-primary-500 transition-colors"
                [disabled]="!walletConnected || loading">
              <span class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold">
                SOL
              </span>
            </div>
          </div>

          <!-- Quick Amount Buttons -->
          <div class="grid grid-cols-4 gap-2">
            @for (amount of quickAmounts; track amount) {
              <button
                (click)="setQuickAmount(amount)"
                class="quick-amount-btn px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-sm font-medium text-gray-300 transition-colors"
                [disabled]="!walletConnected">
                {{ amount }}
              </button>
            }
          </div>

          <!-- Output Amount -->
          <div>
            <label class="block text-sm text-gray-400 mb-2">
              You {{ tradeType === 'buy' ? 'receive' : 'get' }}
            </label>
            <div class="output-display px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg">
              <div class="flex items-center justify-between">
                <span class="text-white text-lg font-semibold">
                  {{ formatTokenAmount(estimatedTokens) }}
                </span>
                <span class="text-gray-400 font-semibold">{{ tokenSymbol }}</span>
              </div>
            </div>
          </div>

          <!-- Price Impact Warning -->
          @if (priceImpact && amountSOL > 0) {
            <div 
              class="price-impact-warning px-4 py-3 rounded-lg border"
              [style.background-color]="priceImpact.color + '20'"
              [style.border-color]="priceImpact.color + '40'">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-300">Price Impact</span>
                <span 
                  class="text-sm font-semibold"
                  [style.color]="priceImpact.color">
                  {{ priceImpact.percentage.toFixed(2) }}%
                </span>
              </div>
              @if (priceImpact.severity === 'high') {
                <div class="text-xs mt-1" [style.color]="priceImpact.color">
                  ⚠️ High price impact! Consider reducing amount.
                </div>
              }
            </div>
          }

          <!-- Trading Fee -->
          <div class="fee-display flex items-center justify-between text-sm">
            <span class="text-gray-400">Trading Fee (1%)</span>
            <span class="text-white font-semibold">{{ tradingFee.toFixed(6) }} SOL</span>
          </div>

          <!-- Execute Trade Button -->
          @if (!walletConnected) {
            <button
              class="trade-execute-btn w-full py-4 rounded-lg font-bold text-lg bg-primary-500 hover:bg-primary-600 text-white transition-all duration-200"
              disabled>
              Connect Wallet to Trade
            </button>
          } @else {
            <button
              (click)="executeTrade()"
              [disabled]="!canTrade()"
              class="trade-execute-btn w-full py-4 rounded-lg font-bold text-lg transition-all duration-200"
              [class.bg-green-500]="tradeType === 'buy'"
              [class.hover:bg-green-600]="tradeType === 'buy' && canTrade()"
              [class.bg-red-500]="tradeType === 'sell'"
              [class.hover:bg-red-600]="tradeType === 'sell' && canTrade()"
              [class.bg-gray-700]="!canTrade()"
              [class.cursor-not-allowed]="!canTrade()"
              [class.opacity-50]="!canTrade()">
              @if (loading) {
                <i class="pi pi-spin pi-spinner mr-2"></i>
                Processing...
              } @else {
                {{ tradeType === 'buy' ? 'BUY' : 'SELL' }} {{ tokenSymbol }}
              }
            </button>
          }

          <!-- Validation Messages -->
          @if (validationMessage) {
            <div class="validation-message text-sm text-red-400 text-center">
              {{ validationMessage }}
            </div>
          }

        </div>

      </p-card>
    </div>
  `,
  styles: [`
    .trade-interface {
      height: 100%;
    }

    .tab-btn.active {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .trade-input:focus {
      box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
    }

    .quick-amount-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(168, 85, 247, 0.2);
    }

    .trade-execute-btn:not(:disabled):hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
    }

    .trade-execute-btn:not(:disabled):active {
      transform: translateY(0);
    }

    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    input[type="number"] {
      -moz-appearance: textfield;
    }
  `]
})
export class TradeInterfaceComponent implements OnInit, OnDestroy {
  @Input() tokenAddress: string = '';
  @Input() tokenSymbol: string = '';
  @Input() currentPrice: number = 0;

  tradeType: TradeType = 'buy';
  amountSOL: number = 0;
  estimatedTokens: number = 0;
  tradingFee: number = 0;
  walletBalance: number = 0;
  walletConnected: boolean = false;
  loading: boolean = false;
  validationMessage: string = '';
  priceImpact: PriceImpact | null = null;

  quickAmounts: number[] = [0.1, 0.5, 1, 5];

  private destroy$ = new Subject<void>();
  private amountChange$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private walletService: SolanaWalletService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Check wallet connection
    this.checkWalletConnection();

    // Debounce amount changes for calculation
    this.amountChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.calculateOutput();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkWalletConnection(): void {
    // Subscribe to wallet state
    this.walletService.walletState$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state: WalletState) => {
          this.walletConnected = state.connected;
          this.walletBalance = state.balance || 0;
        }
      });
  }

  private loadWalletBalance(): void {
    // Balance is automatically updated via wallet state subscription
    // No need for separate method, but keeping for compatibility
  }

  setTradeType(type: TradeType): void {
    this.tradeType = type;
    this.calculateOutput();
  }

  onAmountChange(): void {
    this.validationMessage = '';
    this.amountChange$.next();
  }

  setQuickAmount(amount: number): void {
    this.amountSOL = amount;
    this.onAmountChange();
  }

  private calculateOutput(): void {
    if (!this.amountSOL || this.amountSOL <= 0 || !this.currentPrice) {
      this.estimatedTokens = 0;
      this.tradingFee = 0;
      this.priceImpact = null;
      return;
    }

    // Calculate trading fee (1%)
    this.tradingFee = this.amountSOL * 0.01;

    // Calculate estimated tokens
    const amountAfterFee = this.amountSOL - this.tradingFee;
    this.estimatedTokens = amountAfterFee / this.currentPrice;

    // Calculate price impact (simplified)
    const impactPercentage = (this.amountSOL / 100) * 2; // Mock calculation
    this.priceImpact = this.calculatePriceImpact(impactPercentage);
  }

  private calculatePriceImpact(percentage: number): PriceImpact {
    if (percentage < 1) {
      return { percentage, severity: 'low', color: '#10b981' };
    } else if (percentage < 3) {
      return { percentage, severity: 'medium', color: '#f59e0b' };
    } else {
      return { percentage, severity: 'high', color: '#ef4444' };
    }
  }

  canTrade(): boolean {
    if (!this.walletConnected || this.loading || !this.amountSOL || this.amountSOL <= 0) {
      return false;
    }

    if (this.tradeType === 'buy' && this.amountSOL > this.walletBalance) {
      this.validationMessage = 'Insufficient SOL balance';
      return false;
    }

    return true;
  }

  async executeTrade(): Promise<void> {
    if (!this.canTrade()) return;

    this.loading = true;
    this.validationMessage = '';

    try {
      const tradeRequest = {
        tokenAddress: this.tokenAddress,
        amount: this.amountSOL,
        slippage: 1 // 1% slippage tolerance
      };

      const observable = this.tradeType === 'buy' 
        ? this.apiService.buyToken(tradeRequest)
        : this.apiService.sellToken(tradeRequest);

      const result = await observable.toPromise();

      if (result?.success && result.signature) {
        this.notificationService.success(
          `${this.tradeType === 'buy' ? 'Bought' : 'Sold'} ${this.formatTokenAmount(this.estimatedTokens)} ${this.tokenSymbol}`
        );

        // Reset form
        this.amountSOL = 0;
        this.calculateOutput();
      }

    } catch (error: any) {
      console.error('Trade failed:', error);
      this.notificationService.error(`Trade failed: ${error.error?.message || error.message || 'Unknown error'}`);
      this.validationMessage = error.error?.message || error.message || 'Trade failed';
    } finally {
      this.loading = false;
    }
  }

  formatTokenAmount(amount: number): string {
    if (amount === 0) return '0';
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    }
    return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
}
