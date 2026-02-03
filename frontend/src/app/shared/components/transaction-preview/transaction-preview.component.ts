import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';

export interface TransactionPreview {
  type: 'buy' | 'sell';
  tokenSymbol: string;
  tokenAmount: number;
  solAmount: number;
  price: number;
  priceImpact: number;
  slippage: number;
  gasFee: number;
  platformFee: number;
  totalCost: number;
  minimumReceived?: number;
  liquiditySOL?: number;
}

@Component({
  selector: 'app-transaction-preview',
  standalone: true,
  imports: [CommonModule, ButtonModule, DividerModule],
  template: `
    <div class="transaction-preview" *ngIf="preview">
      <!-- Header -->
      <div class="preview-header">
        <div class="trade-type" [class.buy]="preview.type === 'buy'" [class.sell]="preview.type === 'sell'">
          <i class="pi" [ngClass]="preview.type === 'buy' ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
          <span>{{ preview.type === 'buy' ? 'Buy' : 'Sell' }} {{ preview.tokenSymbol }}</span>
        </div>
        <button class="close-btn" (click)="onCancel()">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <p-divider></p-divider>

      <!-- Main Transaction Details -->
      <div class="main-details">
        <div class="detail-row large">
          <span class="label">You {{ preview.type === 'buy' ? 'Pay' : 'Sell' }}:</span>
          <span class="value">
            {{ preview.type === 'buy' ? preview.solAmount.toFixed(4) : preview.tokenAmount.toLocaleString(undefined, {maximumFractionDigits: 2}) }}
            {{ preview.type === 'buy' ? 'SOL' : preview.tokenSymbol }}
          </span>
        </div>

        <div class="arrow-down">
          <i class="pi pi-arrow-down"></i>
        </div>

        <div class="detail-row large highlight">
          <span class="label">You {{ preview.type === 'buy' ? 'Receive' : 'Get' }}:</span>
          <span class="value success">
            {{ preview.type === 'buy' ? preview.tokenAmount.toLocaleString(undefined, {maximumFractionDigits: 2}) : preview.solAmount.toFixed(4) }}
            {{ preview.type === 'buy' ? preview.tokenSymbol : 'SOL' }}
          </span>
        </div>
      </div>

      <p-divider></p-divider>

      <!-- Detailed Breakdown -->
      <div class="breakdown">
        <h4 class="breakdown-title">Transaction Details</h4>

        <div class="detail-row">
          <span class="label">Price:</span>
          <span class="value mono">{{ preview.price.toFixed(8) }} SOL</span>
        </div>

        <div class="detail-row" [class.warning]="preview.priceImpact > 3" [class.danger]="preview.priceImpact > 10">
          <span class="label">
            Price Impact:
            <i *ngIf="preview.priceImpact > 3" class="pi pi-exclamation-triangle ml-1"></i>
          </span>
          <span class="value" 
                [class.text-yellow-500]="preview.priceImpact > 3"
                [class.text-red-500]="preview.priceImpact > 10">
            {{ preview.priceImpact.toFixed(2) }}%
          </span>
        </div>

        <div class="detail-row">
          <span class="label">Slippage Tolerance:</span>
          <span class="value">{{ preview.slippage }}%</span>
        </div>

        <div class="detail-row">
          <span class="label">Minimum Received:</span>
          <span class="value mono">
            {{ (preview.minimumReceived || preview.tokenAmount * 0.99).toLocaleString(undefined, {maximumFractionDigits: 2}) }}
            {{ preview.type === 'buy' ? preview.tokenSymbol : 'SOL' }}
          </span>
        </div>

        <p-divider></p-divider>

        <!-- Fees -->
        <div class="detail-row">
          <span class="label">Network Fee:</span>
          <span class="value mono">{{ preview.gasFee.toFixed(4) }} SOL</span>
        </div>

        <div class="detail-row">
          <span class="label">Platform Fee (1%):</span>
          <span class="value mono">{{ preview.platformFee.toFixed(4) }} SOL</span>
        </div>

        <div class="detail-row total">
          <span class="label font-semibold">Total Cost:</span>
          <span class="value font-bold">{{ preview.totalCost.toFixed(4) }} SOL</span>
        </div>
      </div>

      <!-- Risk Warnings -->
      <div class="warnings" *ngIf="hasWarnings()">
        <div class="warning-item" *ngIf="preview.priceImpact > 10">
          <i class="pi pi-exclamation-circle"></i>
          <span><strong>High Price Impact!</strong> This trade will significantly affect the token price.</span>
        </div>

        <div class="warning-item" *ngIf="preview.priceImpact > 3 && preview.priceImpact <= 10">
          <i class="pi pi-exclamation-triangle"></i>
          <span><strong>Moderate Price Impact.</strong> Consider splitting your trade into smaller amounts.</span>
        </div>

        <div class="warning-item" *ngIf="preview.liquiditySOL && preview.liquiditySOL < 10">
          <i class="pi pi-info-circle"></i>
          <span><strong>Low Liquidity.</strong> This pool has limited liquidity ({{ preview.liquiditySOL.toFixed(2) }} SOL).</span>
        </div>

        <div class="warning-item" *ngIf="preview.slippage > 5">
          <i class="pi pi-exclamation-triangle"></i>
          <span><strong>High Slippage!</strong> You may receive significantly less than expected.</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <p-button 
          label="Cancel"
          icon="pi pi-times"
          (onClick)="onCancel()"
          styleClass="p-button-outlined p-button-secondary flex-1">
        </p-button>
        <p-button 
          [label]="'Confirm ' + (preview.type === 'buy' ? 'Buy' : 'Sell')"
          icon="pi pi-check"
          [loading]="confirming"
          (onClick)="onConfirm()"
          [styleClass]="preview.type === 'buy' ? 'p-button-success flex-1' : 'p-button-danger flex-1'">
        </p-button>
      </div>
    </div>
  `,
  styles: [`
    .transaction-preview {
      background: linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%);
      backdrop-filter: blur(20px);
      border-radius: 16px;
      border: 1px solid rgba(139, 92, 246, 0.3);
      padding: 1.5rem;
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .trade-type {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.25rem;
      font-weight: 700;
      padding: 0.5rem 1rem;
      border-radius: 8px;
    }

    .trade-type.buy {
      background: rgba(16, 185, 129, 0.1);
      color: #10B981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .trade-type.sell {
      background: rgba(239, 68, 68, 0.1);
      color: #EF4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #9CA3AF;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 50%;
      transition: all 0.3s ease;
    }

    .close-btn:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #EF4444;
    }

    .main-details {
      margin: 1.5rem 0;
      text-align: center;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      font-size: 0.9375rem;
    }

    .detail-row.large {
      font-size: 1.125rem;
      padding: 1rem;
      background: rgba(17, 24, 39, 0.6);
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }

    .detail-row.highlight {
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.3);
    }

    .detail-row.warning {
      background: rgba(245, 158, 11, 0.05);
    }

    .detail-row.danger {
      background: rgba(239, 68, 68, 0.05);
    }

    .detail-row.total {
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 8px;
      padding: 1rem;
      margin-top: 0.5rem;
    }

    .arrow-down {
      text-align: center;
      color: #6B7280;
      font-size: 1.5rem;
      margin: 0.5rem 0;
    }

    .label {
      color: #9CA3AF;
      font-size: 0.875rem;
    }

    .value {
      color: #E5E7EB;
      font-weight: 600;
    }

    .value.success {
      color: #10B981;
      font-size: 1.25rem;
    }

    .value.mono {
      font-family: 'Courier New', monospace;
    }

    .breakdown {
      margin: 1rem 0;
    }

    .breakdown-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #A78BFA;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .warnings {
      margin: 1.5rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .warning-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 8px;
      color: #F59E0B;
      font-size: 0.875rem;
      animation: slideIn 0.3s ease;
    }

    .warning-item i {
      margin-top: 0.125rem;
      flex-shrink: 0;
    }

    .action-buttons {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class TransactionPreviewComponent implements OnInit {
  @Input() preview: TransactionPreview | null = null;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  confirming: boolean = false;

  ngOnInit(): void {
    // Component initialized
  }

  hasWarnings(): boolean {
    if (!this.preview) return false;
    
    return (
      this.preview.priceImpact > 3 ||
      this.preview.slippage > 5 ||
      (this.preview.liquiditySOL !== undefined && this.preview.liquiditySOL < 10)
    );
  }

  onConfirm(): void {
    this.confirming = true;
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
