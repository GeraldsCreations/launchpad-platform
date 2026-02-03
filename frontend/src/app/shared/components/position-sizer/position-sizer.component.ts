import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { SliderModule } from 'primeng/slider';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-position-sizer',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, InputNumberModule, SliderModule, TooltipModule],
  template: `
    <p-card class="position-sizer-card">
      <ng-template pTemplate="header">
        <div class="card-header">
          <h3 class="text-lg font-bold text-gradient">Position Size Calculator</h3>
          <i class="pi pi-calculator text-purple-400"></i>
        </div>
      </ng-template>

      <div class="space-y-4">
        <!-- Portfolio Percentage -->
        <div class="input-group">
          <label class="label-text">
            Portfolio Allocation
            <i class="pi pi-info-circle ml-2 text-gray-400 cursor-help"
               pTooltip="Percentage of your total portfolio to allocate to this trade"
               tooltipPosition="top"></i>
          </label>
          <div class="slider-container">
            <p-slider 
              [(ngModel)]="portfolioPercentage"
              (ngModelChange)="calculate()"
              [min]="1"
              [max]="100"
              [step]="1"
              styleClass="w-full">
            </p-slider>
            <span class="percentage-display">{{ portfolioPercentage }}%</span>
          </div>
        </div>

        <!-- Portfolio Value -->
        <div class="input-group">
          <label class="label-text">Total Portfolio Value (SOL)</label>
          <p-inputNumber 
            [(ngModel)]="portfolioValue"
            (ngModelChange)="calculate()"
            [min]="0"
            [maxFractionDigits]="2"
            mode="decimal"
            placeholder="0.00"
            styleClass="w-full">
          </p-inputNumber>
        </div>

        <!-- Token Price -->
        <div class="input-group">
          <label class="label-text">Token Price (SOL)</label>
          <p-inputNumber 
            [(ngModel)]="tokenPrice"
            (ngModelChange)="calculate()"
            [min]="0"
            [maxFractionDigits]="8"
            mode="decimal"
            placeholder="0.00000000"
            styleClass="w-full">
          </p-inputNumber>
        </div>

        <!-- Risk Percentage -->
        <div class="input-group">
          <label class="label-text">
            Risk Per Trade
            <i class="pi pi-info-circle ml-2 text-gray-400 cursor-help"
               pTooltip="Maximum percentage of portfolio you're willing to lose on this trade"
               tooltipPosition="top"></i>
          </label>
          <div class="slider-container">
            <p-slider 
              [(ngModel)]="riskPercentage"
              (ngModelChange)="calculate()"
              [min]="0.5"
              [max]="10"
              [step]="0.5"
              styleClass="w-full">
            </p-slider>
            <span class="percentage-display" 
                  [class.text-yellow-500]="riskPercentage > 5"
                  [class.text-red-500]="riskPercentage > 7">
              {{ riskPercentage }}%
            </span>
          </div>
        </div>

        <!-- Results -->
        <div class="results-container">
          <h4 class="text-md font-semibold mb-3 text-cyan-400">Recommended Position</h4>
          
          <div class="result-row">
            <span class="result-label">Position Size:</span>
            <span class="result-value">{{ positionSizeSOL.toFixed(4) }} SOL</span>
          </div>

          <div class="result-row">
            <span class="result-label">Token Amount:</span>
            <span class="result-value">{{ tokenAmount.toLocaleString(undefined, {maximumFractionDigits: 2}) }} tokens</span>
          </div>

          <div class="result-row">
            <span class="result-label">Risk Amount:</span>
            <span class="result-value text-red-400">{{ riskAmount.toFixed(4) }} SOL</span>
          </div>

          <div class="result-row">
            <span class="result-label">Stop Loss (15%):</span>
            <span class="result-value">{{ stopLoss.toFixed(8) }} SOL</span>
          </div>

          <div class="result-row">
            <span class="result-label">Take Profit (30%):</span>
            <span class="result-value text-green-400">{{ takeProfit.toFixed(8) }} SOL</span>
          </div>

          <div class="result-row highlight">
            <span class="result-label font-semibold">Risk/Reward Ratio:</span>
            <span class="result-value font-bold" 
                  [class.text-green-400]="riskRewardRatio >= 2"
                  [class.text-yellow-400]="riskRewardRatio >= 1 && riskRewardRatio < 2"
                  [class.text-red-400]="riskRewardRatio < 1">
              1:{{ riskRewardRatio.toFixed(2) }}
            </span>
          </div>
        </div>

        <!-- Warning -->
        <div *ngIf="riskPercentage > 5" class="warning-box">
          <i class="pi pi-exclamation-triangle mr-2"></i>
          <span class="text-sm">High risk per trade! Consider reducing to 2-3% for better risk management.</span>
        </div>
      </div>
    </p-card>
  `,
  styles: [`
    .position-sizer-card {
      background: linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
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

    .input-group {
      margin-bottom: 1.5rem;
    }

    .label-text {
      display: flex;
      align-items: center;
      font-size: 0.875rem;
      font-weight: 500;
      color: #D1D5DB;
      margin-bottom: 0.5rem;
    }

    .slider-container {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .percentage-display {
      min-width: 50px;
      text-align: right;
      font-weight: 600;
      font-family: 'Courier New', monospace;
      color: #A78BFA;
    }

    .results-container {
      background: rgba(17, 24, 39, 0.6);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 12px;
      padding: 1.25rem;
      margin-top: 1.5rem;
    }

    .result-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid rgba(75, 85, 99, 0.3);
    }

    .result-row:last-child {
      border-bottom: none;
    }

    .result-row.highlight {
      background: rgba(139, 92, 246, 0.1);
      padding: 1rem;
      border-radius: 8px;
      margin-top: 0.5rem;
      border: 1px solid rgba(139, 92, 246, 0.3);
    }

    .result-label {
      font-size: 0.875rem;
      color: #9CA3AF;
    }

    .result-value {
      font-size: 0.9375rem;
      font-weight: 600;
      font-family: 'Courier New', monospace;
      color: #E5E7EB;
    }

    .warning-box {
      display: flex;
      align-items: center;
      padding: 0.875rem;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 8px;
      color: #F59E0B;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }

    :host ::ng-deep .p-slider .p-slider-range {
      background: linear-gradient(90deg, #8B5CF6 0%, #06B6D4 100%);
    }

    :host ::ng-deep .p-slider .p-slider-handle {
      border-color: #8B5CF6;
      background: #8B5CF6;
      box-shadow: 0 0 12px rgba(139, 92, 246, 0.6);
    }
  `]
})
export class PositionSizerComponent implements OnInit {
  @Input() currentTokenPrice: number = 0;

  portfolioPercentage: number = 5;
  portfolioValue: number = 10;
  tokenPrice: number = 0.001;
  riskPercentage: number = 2;

  positionSizeSOL: number = 0;
  tokenAmount: number = 0;
  riskAmount: number = 0;
  stopLoss: number = 0;
  takeProfit: number = 0;
  riskRewardRatio: number = 2;

  ngOnInit(): void {
    if (this.currentTokenPrice > 0) {
      this.tokenPrice = this.currentTokenPrice;
    }
    this.calculate();
  }

  calculate(): void {
    // Position size based on portfolio allocation
    this.positionSizeSOL = (this.portfolioValue * this.portfolioPercentage) / 100;

    // Token amount based on price
    if (this.tokenPrice > 0) {
      this.tokenAmount = this.positionSizeSOL / this.tokenPrice;
    } else {
      this.tokenAmount = 0;
    }

    // Risk amount
    this.riskAmount = (this.portfolioValue * this.riskPercentage) / 100;

    // Stop loss (15% below entry)
    this.stopLoss = this.tokenPrice * 0.85;

    // Take profit (30% above entry)
    this.takeProfit = this.tokenPrice * 1.30;

    // Risk/Reward ratio
    const potentialLoss = this.tokenPrice - this.stopLoss;
    const potentialGain = this.takeProfit - this.tokenPrice;
    
    if (potentialLoss > 0) {
      this.riskRewardRatio = potentialGain / potentialLoss;
    } else {
      this.riskRewardRatio = 2;
    }
  }
}
