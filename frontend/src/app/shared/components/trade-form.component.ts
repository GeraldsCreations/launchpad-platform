import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TabViewModule } from 'primeng/tabview';
import { ApiService, QuoteResponse } from '../../core/services/api.service';
import { WalletService } from '../../core/services/wallet.service';
import { NotificationService } from '../../core/services/notification.service';
import { Subject, debounceTime, takeUntil } from 'rxjs';

@Component({
  selector: 'app-trade-form',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, InputNumberModule, TabViewModule],
  template: `
    <p-card class="trade-form">
      <p-tabView>
        <!-- Buy Tab -->
        <p-tabPanel header="Buy">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Amount (SOL)</label>
              <p-inputNumber 
                [(ngModel)]="buyAmount"
                (ngModelChange)="onBuyAmountChange()"
                [min]="0.01"
                [maxFractionDigits]="4"
                mode="decimal"
                placeholder="0.00"
                styleClass="w-full">
              </p-inputNumber>
            </div>

            @if (buyQuote) {
              <div class="bg-gray-800 p-4 rounded-lg space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-400">You receive:</span>
                  <span class="font-semibold">{{ buyQuote.amountOut.toLocaleString() }} {{ tokenSymbol }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-400">Price:</span>
                  <span>{{ buyQuote.price.toFixed(8) }} SOL</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-400">Fee:</span>
                  <span>{{ buyQuote.fee.toFixed(4) }} SOL (1%)</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-400">Price Impact:</span>
                  <span [class.text-yellow-500]="buyQuote.priceImpact > 5"
                        [class.text-red-500]="buyQuote.priceImpact > 10">
                    {{ buyQuote.priceImpact.toFixed(2) }}%
                  </span>
                </div>
              </div>
            }

            <p-button 
              label="Buy"
              icon="pi pi-shopping-cart"
              [loading]="buying"
              [disabled]="!canBuy()"
              (onClick)="buy()"
              styleClass="w-full p-button-success">
            </p-button>

            @if (!walletConnected) {
              <div class="text-sm text-yellow-500 text-center">
                <i class="pi pi-exclamation-triangle mr-2"></i>
                Connect wallet to trade
              </div>
            }
          </div>
        </p-tabPanel>

        <!-- Sell Tab -->
        <p-tabPanel header="Sell">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Amount ({{ tokenSymbol }})</label>
              <p-inputNumber 
                [(ngModel)]="sellAmount"
                (ngModelChange)="onSellAmountChange()"
                [min]="0"
                [maxFractionDigits]="2"
                mode="decimal"
                placeholder="0.00"
                styleClass="w-full">
              </p-inputNumber>
              @if (tokenBalance > 0) {
                <div class="text-xs text-gray-400 mt-1">
                  Balance: {{ tokenBalance.toLocaleString() }} {{ tokenSymbol }}
                </div>
              }
            </div>

            @if (sellQuote) {
              <div class="bg-gray-800 p-4 rounded-lg space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-400">You receive:</span>
                  <span class="font-semibold">{{ sellQuote.amountOut.toFixed(4) }} SOL</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-400">Price:</span>
                  <span>{{ sellQuote.price.toFixed(8) }} SOL</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-400">Fee:</span>
                  <span>{{ sellQuote.fee.toFixed(4) }} SOL (1%)</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-400">Price Impact:</span>
                  <span [class.text-yellow-500]="sellQuote.priceImpact > 5"
                        [class.text-red-500]="sellQuote.priceImpact > 10">
                    {{ sellQuote.priceImpact.toFixed(2) }}%
                  </span>
                </div>
              </div>
            }

            <p-button 
              label="Sell"
              icon="pi pi-dollar"
              [loading]="selling"
              [disabled]="!canSell()"
              (onClick)="sell()"
              styleClass="w-full p-button-danger">
            </p-button>

            @if (!walletConnected) {
              <div class="text-sm text-yellow-500 text-center">
                <i class="pi pi-exclamation-triangle mr-2"></i>
                Connect wallet to trade
              </div>
            }
          </div>
        </p-tabPanel>
      </p-tabView>
    </p-card>
  `,
  styles: [`
    .trade-form {
      height: 100%;
    }
  `]
})
export class TradeFormComponent implements OnInit, OnDestroy {
  @Input() tokenAddress!: string;
  @Input() tokenSymbol: string = 'TOKEN';

  buyAmount: number = 0;
  sellAmount: number = 0;
  buyQuote: QuoteResponse | null = null;
  sellQuote: QuoteResponse | null = null;
  tokenBalance: number = 0;
  walletConnected: boolean = false;
  buying: boolean = false;
  selling: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private walletService: WalletService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.walletService.connected$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.walletConnected = connected;
        if (connected) {
          this.loadTokenBalance();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBuyAmountChange(): void {
    if (this.buyAmount && this.buyAmount > 0) {
      this.fetchBuyQuote();
    } else {
      this.buyQuote = null;
    }
  }

  onSellAmountChange(): void {
    if (this.sellAmount && this.sellAmount > 0) {
      this.fetchSellQuote();
    } else {
      this.sellQuote = null;
    }
  }

  private fetchBuyQuote(): void {
    this.apiService.getBuyQuote(this.tokenAddress, this.buyAmount)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (quote) => this.buyQuote = quote,
        error: (error) => console.error('Failed to fetch buy quote:', error)
      });
  }

  private fetchSellQuote(): void {
    this.apiService.getSellQuote(this.tokenAddress, this.sellAmount)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (quote) => this.sellQuote = quote,
        error: (error) => console.error('Failed to fetch sell quote:', error)
      });
  }

  private async loadTokenBalance(): Promise<void> {
    // TODO: Load actual token balance from blockchain
    this.tokenBalance = 0;
  }

  canBuy(): boolean {
    return this.walletConnected && this.buyAmount > 0 && !this.buying;
  }

  canSell(): boolean {
    return this.walletConnected && this.sellAmount > 0 && this.sellAmount <= this.tokenBalance && !this.selling;
  }

  async buy(): Promise<void> {
    if (!this.canBuy()) return;

    // Get wallet address
    const walletAddress = this.walletService.getPublicKeyString();
    if (!walletAddress) {
      this.notificationService.transactionFailed('Wallet not connected');
      return;
    }

    this.buying = true;
    try {
      // Calculate minimum tokens with 1% slippage
      const minTokensOut = this.buyQuote ? this.buyQuote.amountOut * 0.99 : 0;

      const result = await this.apiService.buyToken({
        tokenAddress: this.tokenAddress,
        amountSol: this.buyAmount,
        buyer: walletAddress,
        minTokensOut: minTokensOut
      }).toPromise();

      if (result && result.success) {
        const tokensReceived = this.buyQuote?.amountOut || 0;
        this.notificationService.transactionSuccess(result.signature);
        this.notificationService.buySuccess(this.tokenSymbol, tokensReceived);
        this.buyAmount = 0;
        this.buyQuote = null;
        this.loadTokenBalance();
      }
    } catch (error: any) {
      console.error('Buy failed:', error);
      this.notificationService.transactionFailed(error.message || 'Failed to purchase tokens');
    } finally {
      this.buying = false;
    }
  }

  async sell(): Promise<void> {
    if (!this.canSell()) return;

    // Get wallet address
    const walletAddress = this.walletService.getPublicKeyString();
    if (!walletAddress) {
      this.notificationService.transactionFailed('Wallet not connected');
      return;
    }

    this.selling = true;
    try {
      // Calculate minimum SOL with 1% slippage
      const minSolOut = this.sellQuote ? this.sellQuote.amountOut * 0.99 : 0;

      const result = await this.apiService.sellToken({
        tokenAddress: this.tokenAddress,
        amountTokens: this.sellAmount,
        seller: walletAddress,
        minSolOut: minSolOut
      }).toPromise();

      if (result && result.success) {
        this.notificationService.transactionSuccess(result.signature);
        this.notificationService.sellSuccess(this.tokenSymbol, this.sellAmount);
        this.sellAmount = 0;
        this.sellQuote = null;
        this.loadTokenBalance();
      }
    } catch (error: any) {
      console.error('Sell failed:', error);
      this.notificationService.transactionFailed(error.message || 'Failed to sell tokens');
    } finally {
      this.selling = false;
    }
  }
}
