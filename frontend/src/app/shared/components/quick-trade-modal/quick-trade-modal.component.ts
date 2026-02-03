import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TabViewModule } from 'primeng/tabview';
import { DropdownModule } from 'primeng/dropdown';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { SlippageSettingsComponent } from '../slippage-settings/slippage-settings.component';
import { TransactionPreviewComponent, TransactionPreview } from '../transaction-preview/transaction-preview.component';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { ApiService, QuoteResponse } from '../../../core/services/api.service';
import { WalletService } from '../../../core/services/wallet.service';
import { NotificationService } from '../../../core/services/notification.service';

export interface Token {
  address: string;
  symbol: string;
  name: string;
  logoUrl?: string;
  price?: number;
}

@Component({
  selector: 'app-quick-trade-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    TabViewModule,
    DropdownModule,
    AutoCompleteModule,
    SlippageSettingsComponent,
    TransactionPreviewComponent
  ],
  template: `
    <p-dialog 
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [closeOnEscape]="true"
      [dismissableMask]="true"
      (onHide)="onClose()"
      [style]="{width: '550px'}"
      styleClass="quick-trade-dialog">
      
      <ng-template pTemplate="header">
        <div class="dialog-header">
          <h2 class="text-xl font-bold text-gradient">Quick Trade</h2>
          <i class="pi pi-bolt text-yellow-400"></i>
        </div>
      </ng-template>

      <!-- Show preview if available -->
      <app-transaction-preview
        *ngIf="showPreview && transactionPreview"
        [preview]="transactionPreview"
        (confirm)="executeTradeFromPreview()"
        (cancel)="closePreview()">
      </app-transaction-preview>

      <!-- Main trade form -->
      <div *ngIf="!showPreview" class="trade-form">
        <!-- Token Selector -->
        <div class="token-selector mb-4">
          <label class="label-text mb-2">Select Token</label>
          <p-autoComplete
            [(ngModel)]="selectedToken"
            [suggestions]="filteredTokens"
            (completeMethod)="searchTokens($event)"
            field="symbol"
            [dropdown]="true"
            placeholder="Search token..."
            styleClass="w-full">
            <ng-template let-token pTemplate="item">
              <div class="token-item">
                <img *ngIf="token.logoUrl" [src]="token.logoUrl" [alt]="token.symbol" class="token-logo">
                <div class="token-info">
                  <span class="token-symbol">{{ token.symbol }}</span>
                  <span class="token-name">{{ token.name }}</span>
                </div>
                <span *ngIf="token.price" class="token-price">{{ token.price.toFixed(8) }} SOL</span>
              </div>
            </ng-template>
          </p-autoComplete>
        </div>

        <!-- Buy/Sell Tabs -->
        <p-tabView [(activeIndex)]="activeTabIndex" (onChange)="onTabChange()">
          <!-- Buy Tab -->
          <p-tabPanel header="Buy" leftIcon="pi pi-arrow-up">
            <div class="trade-content">
              <!-- Amount Input -->
              <div class="amount-input mb-4">
                <label class="label-text mb-2">Amount (SOL)</label>
                <p-inputNumber 
                  [(ngModel)]="buyAmount"
                  (ngModelChange)="onBuyAmountChange()"
                  [min]="0.01"
                  [maxFractionDigits]="4"
                  mode="decimal"
                  placeholder="0.00"
                  styleClass="w-full">
                </p-inputNumber>
                
                <!-- Quick Amount Buttons -->
                <div class="quick-amounts">
                  <button *ngFor="let preset of amountPresets" 
                          (click)="setQuickAmount(preset)"
                          class="quick-btn">
                    {{ preset }} SOL
                  </button>
                </div>
              </div>

              <!-- Real-time Price Display -->
              <div *ngIf="buyQuote" class="price-display">
                <div class="price-row">
                  <span class="label">You Receive:</span>
                  <span class="value highlight">{{ buyQuote.amountOut.toLocaleString() }} {{ selectedToken?.symbol }}</span>
                </div>
                <div class="price-row">
                  <span class="label">Price:</span>
                  <span class="value mono">{{ buyQuote.price.toFixed(8) }} SOL</span>
                </div>
                <div class="price-row">
                  <span class="label">Gas Fee:</span>
                  <span class="value mono">~{{ estimatedGasFee.toFixed(4) }} SOL</span>
                </div>
                <div class="price-row total">
                  <span class="label font-semibold">Total Cost:</span>
                  <span class="value font-bold">{{ totalCost.toFixed(4) }} SOL</span>
                </div>
              </div>

              <!-- Loading State -->
              <div *ngIf="loadingQuote" class="loading-state">
                <i class="pi pi-spin pi-spinner"></i>
                <span>Fetching quote...</span>
              </div>
            </div>
          </p-tabPanel>

          <!-- Sell Tab -->
          <p-tabPanel header="Sell" leftIcon="pi pi-arrow-down">
            <div class="trade-content">
              <!-- Amount Input -->
              <div class="amount-input mb-4">
                <label class="label-text mb-2">Amount ({{ selectedToken?.symbol || 'TOKEN' }})</label>
                <p-inputNumber 
                  [(ngModel)]="sellAmount"
                  (ngModelChange)="onSellAmountChange()"
                  [min]="0"
                  [maxFractionDigits]="2"
                  mode="decimal"
                  placeholder="0.00"
                  styleClass="w-full">
                </p-inputNumber>
                
                <div *ngIf="tokenBalance > 0" class="balance-info">
                  <span class="text-xs text-gray-400">Balance: {{ tokenBalance.toLocaleString() }}</span>
                  <button (click)="setMaxSell()" class="max-btn">MAX</button>
                </div>
              </div>

              <!-- Real-time Price Display -->
              <div *ngIf="sellQuote" class="price-display">
                <div class="price-row">
                  <span class="label">You Receive:</span>
                  <span class="value highlight">{{ sellQuote.amountOut.toFixed(4) }} SOL</span>
                </div>
                <div class="price-row">
                  <span class="label">Price:</span>
                  <span class="value mono">{{ sellQuote.price.toFixed(8) }} SOL</span>
                </div>
                <div class="price-row">
                  <span class="label">Gas Fee:</span>
                  <span class="value mono">~{{ estimatedGasFee.toFixed(4) }} SOL</span>
                </div>
                <div class="price-row total">
                  <span class="label font-semibold">You Get:</span>
                  <span class="value font-bold">{{ (sellQuote.amountOut - estimatedGasFee).toFixed(4) }} SOL</span>
                </div>
              </div>

              <!-- Loading State -->
              <div *ngIf="loadingQuote" class="loading-state">
                <i class="pi pi-spin pi-spinner"></i>
                <span>Fetching quote...</span>
              </div>
            </div>
          </p-tabPanel>
        </p-tabView>

        <!-- Slippage Settings -->
        <div class="slippage-section mt-4">
          <app-slippage-settings
            [defaultSlippage]="slippage"
            (slippageChange)="onSlippageChange($event)">
          </app-slippage-settings>
        </div>

        <!-- Confirm Button -->
        <div class="action-section mt-4">
          <p-button 
            [label]="getConfirmButtonLabel()"
            icon="pi pi-check"
            [loading]="trading"
            [disabled]="!canTrade()"
            (onClick)="showTransactionPreview()"
            [styleClass]="activeTabIndex === 0 ? 'w-full p-button-success p-button-lg' : 'w-full p-button-danger p-button-lg'">
          </p-button>

          <div *ngIf="!walletConnected" class="wallet-warning">
            <i class="pi pi-exclamation-triangle mr-2"></i>
            <span class="text-sm">Connect wallet to trade</span>
          </div>
        </div>
      </div>
    </p-dialog>
  `,
  styles: [`
    :host ::ng-deep .quick-trade-dialog .p-dialog-header {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
      border-bottom: 1px solid rgba(139, 92, 246, 0.2);
    }

    :host ::ng-deep .quick-trade-dialog .p-dialog-content {
      background: linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%);
      backdrop-filter: blur(20px);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .text-gradient {
      background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .trade-form {
      padding: 0.5rem;
    }

    .token-selector {
      margin-bottom: 1.5rem;
    }

    .label-text {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #D1D5DB;
    }

    .token-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
    }

    .token-logo {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }

    .token-info {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .token-symbol {
      font-weight: 600;
      color: #E5E7EB;
    }

    .token-name {
      font-size: 0.75rem;
      color: #9CA3AF;
    }

    .token-price {
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      color: #A78BFA;
    }

    .trade-content {
      min-height: 200px;
    }

    .quick-amounts {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    .quick-btn {
      padding: 0.5rem;
      background: rgba(31, 41, 55, 0.8);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 6px;
      color: #9CA3AF;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .quick-btn:hover {
      background: rgba(139, 92, 246, 0.2);
      border-color: #8B5CF6;
      color: #A78BFA;
      transform: translateY(-2px);
    }

    .balance-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
    }

    .max-btn {
      background: rgba(139, 92, 246, 0.2);
      border: 1px solid #8B5CF6;
      border-radius: 4px;
      color: #A78BFA;
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .max-btn:hover {
      background: #8B5CF6;
      color: white;
    }

    .price-display {
      background: rgba(17, 24, 39, 0.8);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 12px;
      padding: 1rem;
      margin-top: 1rem;
    }

    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      font-size: 0.875rem;
    }

    .price-row.total {
      border-top: 1px solid rgba(75, 85, 99, 0.5);
      margin-top: 0.5rem;
      padding-top: 0.75rem;
    }

    .price-row .label {
      color: #9CA3AF;
    }

    .price-row .value {
      color: #E5E7EB;
      font-weight: 600;
    }

    .price-row .value.highlight {
      color: #10B981;
      font-size: 1rem;
    }

    .price-row .value.mono {
      font-family: 'Courier New', monospace;
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem;
      color: #A78BFA;
    }

    .wallet-warning {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1rem;
      padding: 0.75rem;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 8px;
      color: #F59E0B;
    }

    :host ::ng-deep .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link {
      background: rgba(139, 92, 246, 0.2);
      border-color: #8B5CF6;
      color: #A78BFA;
    }

    :host ::ng-deep .p-button-lg {
      padding: 1rem;
      font-size: 1rem;
      font-weight: 600;
    }
  `]
})
export class QuickTradeModalComponent implements OnInit, OnDestroy {
  @Input() visible: boolean = false;
  @Input() preselectedToken?: Token;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() tradeComplete = new EventEmitter<any>();

  activeTabIndex: number = 0;
  selectedToken: Token | null = null;
  filteredTokens: Token[] = [];
  availableTokens: Token[] = [];

  buyAmount: number = 0;
  sellAmount: number = 0;
  slippage: number = 1;
  
  buyQuote: QuoteResponse | null = null;
  sellQuote: QuoteResponse | null = null;
  
  tokenBalance: number = 0;
  walletConnected: boolean = false;
  trading: boolean = false;
  loadingQuote: boolean = false;

  estimatedGasFee: number = 0.000005; // 5000 lamports
  platformFeePercent: number = 0.01; // 1%
  
  amountPresets: number[] = [0.1, 0.5, 1, 5];

  showPreview: boolean = false;
  transactionPreview: TransactionPreview | null = null;

  private destroy$ = new Subject<void>();
  private quoteDebounce$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private walletService: WalletService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    if (this.preselectedToken) {
      this.selectedToken = this.preselectedToken;
    }

    // Load mock tokens
    this.loadAvailableTokens();

    // Wallet connection
    this.walletService.connected$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.walletConnected = connected;
        if (connected && this.selectedToken) {
          this.loadTokenBalance();
        }
      });

    // Debounce quote fetching
    this.quoteDebounce$
      .pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.activeTabIndex === 0) {
          this.fetchBuyQuote();
        } else {
          this.fetchSellQuote();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAvailableTokens(): void {
    // Mock tokens - in production, fetch from API
    this.availableTokens = [
      { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', price: 1 },
      { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', price: 0.000025 },
      { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', name: 'Bonk', price: 0.0000001 }
    ];
  }

  searchTokens(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredTokens = this.availableTokens.filter(token =>
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query)
    );
  }

  onTabChange(): void {
    this.buyQuote = null;
    this.sellQuote = null;
  }

  onSlippageChange(value: number): void {
    this.slippage = value;
  }

  setQuickAmount(amount: number): void {
    this.buyAmount = amount;
    this.onBuyAmountChange();
  }

  setMaxSell(): void {
    this.sellAmount = this.tokenBalance;
    this.onSellAmountChange();
  }

  onBuyAmountChange(): void {
    if (this.buyAmount > 0) {
      this.loadingQuote = true;
      this.quoteDebounce$.next();
    } else {
      this.buyQuote = null;
    }
  }

  onSellAmountChange(): void {
    if (this.sellAmount > 0) {
      this.loadingQuote = true;
      this.quoteDebounce$.next();
    } else {
      this.sellQuote = null;
    }
  }

  private fetchBuyQuote(): void {
    if (!this.selectedToken) {
      this.loadingQuote = false;
      return;
    }

    this.apiService.getBuyQuote(this.selectedToken.address, this.buyAmount)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (quote) => {
          this.buyQuote = quote;
          this.loadingQuote = false;
        },
        error: (error) => {
          console.error('Failed to fetch buy quote:', error);
          this.loadingQuote = false;
        }
      });
  }

  private fetchSellQuote(): void {
    if (!this.selectedToken) {
      this.loadingQuote = false;
      return;
    }

    this.apiService.getSellQuote(this.selectedToken.address, this.sellAmount)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (quote) => {
          this.sellQuote = quote;
          this.loadingQuote = false;
        },
        error: (error) => {
          console.error('Failed to fetch sell quote:', error);
          this.loadingQuote = false;
        }
      });
  }

  private async loadTokenBalance(): Promise<void> {
    // TODO: Load actual token balance
    this.tokenBalance = 1000;
  }

  get totalCost(): number {
    if (!this.buyQuote) return this.buyAmount;
    const platformFee = this.buyAmount * this.platformFeePercent;
    return this.buyAmount + platformFee + this.estimatedGasFee;
  }

  canTrade(): boolean {
    if (!this.walletConnected || !this.selectedToken) return false;
    
    if (this.activeTabIndex === 0) {
      return this.buyAmount > 0 && this.buyQuote !== null;
    } else {
      return this.sellAmount > 0 && this.sellAmount <= this.tokenBalance && this.sellQuote !== null;
    }
  }

  getConfirmButtonLabel(): string {
    if (!this.walletConnected) return 'Connect Wallet';
    if (!this.selectedToken) return 'Select Token';
    return this.activeTabIndex === 0 ? 'Review Buy Order' : 'Review Sell Order';
  }

  showTransactionPreview(): void {
    if (!this.selectedToken) return;

    const isBuy = this.activeTabIndex === 0;
    const quote = isBuy ? this.buyQuote : this.sellQuote;
    
    if (!quote) return;

    const platformFee = (isBuy ? this.buyAmount : quote.amountOut) * this.platformFeePercent;

    this.transactionPreview = {
      type: isBuy ? 'buy' : 'sell',
      tokenSymbol: this.selectedToken.symbol,
      tokenAmount: isBuy ? quote.amountOut : this.sellAmount,
      solAmount: isBuy ? this.buyAmount : quote.amountOut,
      price: quote.price,
      priceImpact: quote.priceImpact,
      slippage: this.slippage,
      gasFee: this.estimatedGasFee,
      platformFee: platformFee,
      totalCost: isBuy ? this.totalCost : quote.amountOut - platformFee - this.estimatedGasFee,
      minimumReceived: isBuy 
        ? quote.amountOut * (1 - this.slippage / 100)
        : quote.amountOut * (1 - this.slippage / 100)
    };

    this.showPreview = true;
  }

  closePreview(): void {
    this.showPreview = false;
    this.transactionPreview = null;
  }

  async executeTradeFromPreview(): Promise<void> {
    if (this.activeTabIndex === 0) {
      await this.executeBuy();
    } else {
      await this.executeSell();
    }
  }

  private async executeBuy(): Promise<void> {
    if (!this.selectedToken || !this.canTrade()) return;

    // Get wallet address
    const walletAddress = this.walletService.getPublicKeyString();
    if (!walletAddress) {
      this.notificationService.transactionFailed('Wallet not connected');
      return;
    }

    this.trading = true;
    try {
      // Calculate minimum tokens with slippage protection
      const minTokensOut = this.buyQuote ? this.buyQuote.amountOut * (1 - this.slippage / 100) : 0;

      const result = await this.apiService.buyToken({
        tokenAddress: this.selectedToken.address,
        amountSol: this.buyAmount,
        buyer: walletAddress,
        minTokensOut: minTokensOut
      }).toPromise();

      if (result) {
        this.notificationService.transactionSuccess(result.signature);
        this.tradeComplete.emit(result);
        this.resetForm();
        this.closePreview();
        this.onClose();
      }
    } catch (error: any) {
      console.error('Buy failed:', error);
      this.notificationService.transactionFailed(error.message || 'Failed to purchase tokens');
    } finally {
      this.trading = false;
    }
  }

  private async executeSell(): Promise<void> {
    if (!this.selectedToken || !this.canTrade()) return;

    // Get wallet address
    const walletAddress = this.walletService.getPublicKeyString();
    if (!walletAddress) {
      this.notificationService.transactionFailed('Wallet not connected');
      return;
    }

    this.trading = true;
    try {
      // Calculate minimum SOL with slippage protection
      const minSolOut = this.sellQuote ? this.sellQuote.amountOut * (1 - this.slippage / 100) : 0;

      const result = await this.apiService.sellToken({
        tokenAddress: this.selectedToken.address,
        amountTokens: this.sellAmount,
        seller: walletAddress,
        minSolOut: minSolOut
      }).toPromise();

      if (result) {
        this.notificationService.transactionSuccess(result.signature);
        this.tradeComplete.emit(result);
        this.resetForm();
        this.closePreview();
        this.onClose();
      }
    } catch (error: any) {
      console.error('Sell failed:', error);
      this.notificationService.transactionFailed(error.message || 'Failed to sell tokens');
    } finally {
      this.trading = false;
    }
  }

  private resetForm(): void {
    this.buyAmount = 0;
    this.sellAmount = 0;
    this.buyQuote = null;
    this.sellQuote = null;
  }

  onClose(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }
}
