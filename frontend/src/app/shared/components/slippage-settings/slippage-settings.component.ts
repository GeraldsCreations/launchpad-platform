import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-slippage-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputNumberModule, TooltipModule],
  template: `
    <div class="slippage-settings">
      <div class="flex items-center justify-between mb-3">
        <label class="text-sm font-medium text-gray-300">Slippage Tolerance</label>
        <i class="pi pi-info-circle text-gray-400 cursor-help"
           pTooltip="Your transaction will revert if the price changes unfavorably by more than this percentage."
           tooltipPosition="top"></i>
      </div>

      <!-- Preset Buttons -->
      <div class="preset-buttons mb-3">
        <button 
          *ngFor="let preset of presets"
          (click)="selectPreset(preset)"
          [class.active]="slippage === preset && !isCustom"
          class="preset-btn">
          {{ preset }}%
        </button>
        <button 
          (click)="enableCustom()"
          [class.active]="isCustom"
          class="preset-btn">
          Custom
        </button>
      </div>

      <!-- Custom Input -->
      <div *ngIf="isCustom" class="custom-input mb-3">
        <p-inputNumber 
          [(ngModel)]="customValue"
          (ngModelChange)="onCustomChange()"
          [min]="0.01"
          [max]="50"
          [maxFractionDigits]="2"
          mode="decimal"
          suffix="%"
          placeholder="Enter custom slippage"
          styleClass="w-full">
        </p-inputNumber>
      </div>

      <!-- Warning Messages -->
      <div *ngIf="slippage < 0.5" class="warning-message low">
        <i class="pi pi-exclamation-triangle mr-2"></i>
        <span class="text-xs">Very low slippage may cause transaction failures</span>
      </div>

      <div *ngIf="slippage > 3" class="warning-message high">
        <i class="pi pi-exclamation-triangle mr-2"></i>
        <span class="text-xs">High slippage may result in unfavorable trades</span>
      </div>

      <div *ngIf="slippage > 10" class="warning-message danger">
        <i class="pi pi-exclamation-circle mr-2"></i>
        <span class="text-xs font-semibold">Extremely high slippage! You may be frontrun</span>
      </div>
    </div>
  `,
  styles: [`
    .slippage-settings {
      padding: 1rem;
      background: rgba(17, 24, 39, 0.5);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      border: 1px solid rgba(139, 92, 246, 0.2);
    }

    .preset-buttons {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.5rem;
    }

    .preset-btn {
      padding: 0.5rem;
      background: rgba(31, 41, 55, 0.8);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 8px;
      color: #9CA3AF;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .preset-btn:hover {
      background: rgba(139, 92, 246, 0.1);
      border-color: rgba(139, 92, 246, 0.5);
      color: #A78BFA;
    }

    .preset-btn.active {
      background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%);
      border-color: #8B5CF6;
      color: white;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    }

    .custom-input {
      animation: slideDown 0.3s ease;
    }

    .warning-message {
      display: flex;
      align-items: center;
      padding: 0.75rem;
      border-radius: 8px;
      margin-top: 0.75rem;
      animation: fadeIn 0.3s ease;
    }

    .warning-message.low {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #F59E0B;
    }

    .warning-message.high {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #EF4444;
    }

    .warning-message.danger {
      background: rgba(220, 38, 38, 0.15);
      border: 1px solid rgba(220, 38, 38, 0.5);
      color: #DC2626;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class SlippageSettingsComponent implements OnInit {
  @Input() defaultSlippage: number = 1;
  @Output() slippageChange = new EventEmitter<number>();

  presets: number[] = [0.1, 0.5, 1, 3];
  slippage: number = 1;
  customValue: number = 5;
  isCustom: boolean = false;

  ngOnInit(): void {
    // Load saved preference from localStorage
    const savedSlippage = localStorage.getItem('slippage_tolerance');
    if (savedSlippage) {
      this.slippage = parseFloat(savedSlippage);
      // Check if it's a custom value
      if (!this.presets.includes(this.slippage)) {
        this.isCustom = true;
        this.customValue = this.slippage;
      }
    } else {
      this.slippage = this.defaultSlippage;
    }
    this.emitChange();
  }

  selectPreset(value: number): void {
    this.isCustom = false;
    this.slippage = value;
    this.saveAndEmit();
  }

  enableCustom(): void {
    this.isCustom = true;
    this.slippage = this.customValue;
    this.saveAndEmit();
  }

  onCustomChange(): void {
    if (this.customValue >= 0.01 && this.customValue <= 50) {
      this.slippage = this.customValue;
      this.saveAndEmit();
    }
  }

  private saveAndEmit(): void {
    localStorage.setItem('slippage_tolerance', this.slippage.toString());
    this.emitChange();
  }

  private emitChange(): void {
    this.slippageChange.emit(this.slippage);
  }
}
