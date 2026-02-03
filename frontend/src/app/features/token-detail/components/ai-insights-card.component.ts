import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface AIInsight {
  type: 'recent' | 'next';
  title: string;
  description: string;
  timestamp?: string;
}

@Component({
  selector: 'app-ai-insights-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-insights-card card-dark">
      <div class="card-header">
        <div class="header-left">
          <div class="brain-icon">🧠</div>
          <h3>AI Agent Insights</h3>
        </div>
        <button class="help-button" title="What is this?">
          <i class="pi pi-question-circle"></i>
        </button>
      </div>

      <div class="insights-content">
        <!-- Recent Activity -->
        <div class="insight-section">
          <div class="section-icon">⚡</div>
          <div class="section-content">
            <h4>Recent Activity</h4>
            <p class="description">{{ recentActivity }}</p>
            <span class="timestamp" *ngIf="recentTimestamp">
              {{ recentTimestamp }}
            </span>
          </div>
        </div>

        <!-- Next Action -->
        <div class="insight-section">
          <div class="section-icon">🎯</div>
          <div class="section-content">
            <h4>Next Action</h4>
            <p class="description">{{ nextAction }}</p>
          </div>
        </div>

        <!-- Status Indicator -->
        <div class="status-bar" [ngClass]="statusClass">
          <div class="status-dot"></div>
          <span>{{ statusText }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ai-insights-card {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-default);
      border-radius: 12px;
      padding: 20px;
      margin-top: 16px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brain-icon {
      font-size: 24px;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    .card-header h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .help-button {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 18px;
      padding: 4px;
      transition: color 0.2s ease;
    }

    .help-button:hover {
      color: var(--accent-purple);
    }

    .insights-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .insight-section {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: rgba(139, 92, 246, 0.05);
      border-radius: 8px;
      border-left: 3px solid var(--accent-purple);
    }

    .section-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .section-content {
      flex: 1;
    }

    .section-content h4 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px 0;
    }

    .section-content .description {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0 0 6px 0;
      line-height: 1.5;
    }

    .timestamp {
      font-size: 11px;
      color: var(--text-muted);
      font-style: italic;
    }

    .status-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--bg-primary);
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: blink 2s ease-in-out infinite;
    }

    @keyframes blink {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.3;
      }
    }

    .status-bar.active {
      color: var(--accent-success);
    }

    .status-bar.active .status-dot {
      background: var(--accent-success);
    }

    .status-bar.idle {
      color: var(--text-secondary);
    }

    .status-bar.idle .status-dot {
      background: var(--text-muted);
    }

    .status-bar.pending {
      color: var(--accent-warning);
    }

    .status-bar.pending .status-dot {
      background: var(--accent-warning);
    }
  `]
})
export class AIInsightsCardComponent {
  @Input() recentActivity: string = 'Optimized trading algorithm.';
  @Input() recentTimestamp: string = '2 minutes ago';
  @Input() nextAction: string = 'Community engagement initiative.';
  @Input() statusText: string = 'AI Agent Active';
  @Input() statusClass: string = 'active';
}
