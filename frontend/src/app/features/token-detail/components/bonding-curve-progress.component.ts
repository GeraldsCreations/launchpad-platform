import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bonding-curve-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bonding-curve-container">
      <div class="progress-header">
        <span>
          Bonding Curve Progress: 
          <strong>{{ progressPercent }}%</strong>
        </span>
        <span class="graduation-label" *ngIf="progressPercent >= 90">
          GRADUATION
        </span>
      </div>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          [style.width.%]="progressPercent"
          [style.background]="getGradientColor()">
        </div>
      </div>
      <div class="progress-details" *ngIf="showDetails">
        <div class="detail-item">
          <span class="label">Current Market Cap:</span>
          <span class="value">{{ currentMarketCap | currency }}</span>
        </div>
        <div class="detail-item">
          <span class="label">Graduation Threshold:</span>
          <span class="value">{{ graduationThreshold | currency }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .progress-details {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      font-size: 12px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item .label {
      color: var(--text-muted);
    }

    .detail-item .value {
      color: var(--text-primary);
      font-weight: 600;
    }
  `]
})
export class BondingCurveProgressComponent {
  @Input() progressPercent: number = 0;
  @Input() currentMarketCap: number = 0;
  @Input() graduationThreshold: number = 50000;
  @Input() showDetails: boolean = false;

  getGradientColor(): string {
    if (this.progressPercent >= 90) {
      return 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
    } else if (this.progressPercent >= 70) {
      return 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)';
    } else {
      return 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)';
    }
  }
}
