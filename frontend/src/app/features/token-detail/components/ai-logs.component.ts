import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface AILog {
  id: string;
  type: 'analysis' | 'action' | 'alert';
  message: string;
  timestamp: string;
  icon: string;
}

@Component({
  selector: 'app-ai-logs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-logs-container">
      <!-- Header with live indicator -->
      <div class="logs-header">
        <div class="ai-badge">
          <i class="pi pi-bolt"></i>
          <span>AI Agent</span>
        </div>
        <div class="live-indicator" *ngIf="isLive">
          <span class="live-dot"></span>
          <span>Live</span>
        </div>
      </div>

      <!-- Logs list -->
      <div class="logs-list">
        <div 
          class="log-item" 
          *ngFor="let log of logs"
          [ngClass]="'log-' + log.type"
          [@slideIn]>
          <div class="log-icon">{{ log.icon }}</div>
          <div class="log-content">
            <p class="log-message">{{ log.message }}</p>
            <span class="log-timestamp">{{ formatTimestamp(log.timestamp) }}</span>
          </div>
        </div>

        <!-- Loading state -->
        <div class="loading-state" *ngIf="loading">
          <div class="spinner"></div>
          <p>Loading AI activity...</p>
        </div>

        <!-- Empty state -->
        <div class="empty-state" *ngIf="logs.length === 0 && !loading">
          <div class="empty-icon">🤖</div>
          <p>No AI activity yet</p>
          <small>AI agent will start analyzing soon</small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ai-logs-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .logs-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: rgba(139, 92, 246, 0.05);
      border-bottom: 1px solid var(--border-default);
    }

    .ai-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--gradient-purple);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }

    .ai-badge i {
      font-size: 14px;
    }

    .live-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--accent-success);
    }

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-success);
      animation: blink 1.5s ease-in-out infinite;
    }

    @keyframes blink {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.3;
      }
    }

    .logs-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .logs-list::-webkit-scrollbar {
      width: 6px;
    }

    .logs-list::-webkit-scrollbar-track {
      background: var(--bg-primary);
    }

    .logs-list::-webkit-scrollbar-thumb {
      background: var(--border-default);
      border-radius: 3px;
    }

    .log-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: var(--bg-primary);
      border-radius: 8px;
      margin-bottom: 8px;
      border-left: 3px solid transparent;
      transition: all 0.2s ease;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .log-item:hover {
      background: rgba(139, 92, 246, 0.05);
    }

    .log-analysis {
      border-left-color: var(--accent-purple);
    }

    .log-action {
      border-left-color: var(--accent-success);
    }

    .log-alert {
      border-left-color: var(--accent-warning);
    }

    .log-icon {
      font-size: 20px;
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(139, 92, 246, 0.1);
      border-radius: 6px;
    }

    .log-content {
      flex: 1;
      min-width: 0;
    }

    .log-message {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0 0 6px 0;
      line-height: 1.5;
    }

    .log-timestamp {
      font-size: 11px;
      color: var(--text-muted);
      font-style: italic;
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: var(--text-muted);
      text-align: center;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-default);
      border-top-color: var(--accent-purple);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 12px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-state p {
      font-size: 14px;
      margin: 0 0 4px 0;
    }

    .empty-state small {
      font-size: 12px;
    }
  `]
})
export class AILogsComponent implements OnInit {
  @Input() tokenAddress: string = '';
  @Input() isLive: boolean = false;

  logs: AILog[] = [];
  loading: boolean = false;

  ngOnInit(): void {
    this.loadLogs();
  }

  private loadLogs(): void {
    this.loading = true;

    // Simulate API call
    setTimeout(() => {
      this.logs = [
        {
          id: '1',
          type: 'analysis',
          message: 'Analysing market sentiment to analyse and actions.',
          timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
          icon: '🤖'
        },
        {
          id: '2',
          type: 'action',
          message: 'Executing strategic buy for liquidity to explore new market.',
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          icon: '🤖'
        },
        {
          id: '3',
          type: 'analysis',
          message: 'Generating new content to engage community.',
          timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
          icon: '🤖'
        }
      ];
      this.loading = false;
    }, 800);
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
}
