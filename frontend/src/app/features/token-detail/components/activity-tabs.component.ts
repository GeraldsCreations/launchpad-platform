import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreadComponent } from './thread.component';
import { HoldersListComponent } from './holders-list.component';
import { AILogsComponent } from './ai-logs.component';

@Component({
  selector: 'app-activity-tabs',
  standalone: true,
  imports: [
    CommonModule,
    ThreadComponent,
    HoldersListComponent,
    AILogsComponent
  ],
  template: `
    <div class="activity-tabs">
      <!-- Tab Headers -->
      <div class="tab-header">
        <button 
          class="tab-button"
          [class.active]="activeTab === 'thread'"
          (click)="setActiveTab('thread')">
          <i class="pi pi-comments"></i>
          <span>Thread</span>
          <span class="tab-badge" *ngIf="threadCount > 0">{{ threadCount }}</span>
        </button>
        <button 
          class="tab-button"
          [class.active]="activeTab === 'holders'"
          (click)="setActiveTab('holders')">
          <i class="pi pi-users"></i>
          <span>Holders</span>
          <span class="tab-badge" *ngIf="holderCount > 0">{{ holderCount }}</span>
        </button>
        <button 
          class="tab-button"
          [class.active]="activeTab === 'ai'"
          (click)="setActiveTab('ai')">
          <i class="pi pi-bolt"></i>
          <span>AI Logs</span>
          <span class="tab-live" *ngIf="isLive">●</span>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Thread Tab -->
        <div *ngIf="activeTab === 'thread'" [@fadeIn]>
          <app-thread
            [tokenAddress]="tokenAddress"
            [canSendMessages]="canSendMessages"
            [isLive]="isLive">
          </app-thread>
        </div>

        <!-- Holders Tab -->
        <div *ngIf="activeTab === 'holders'" [@fadeIn]>
          <app-holders-list
            [tokenAddress]="tokenAddress"
            [tokenSymbol]="tokenSymbol">
          </app-holders-list>
        </div>

        <!-- AI Logs Tab -->
        <div *ngIf="activeTab === 'ai'" [@fadeIn]>
          <app-ai-logs
            [tokenAddress]="tokenAddress"
            [isLive]="isLive">
          </app-ai-logs>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .activity-tabs {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-default);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .tab-header {
      display: flex;
      border-bottom: 1px solid var(--border-default);
      background: var(--bg-secondary);
    }

    .tab-button {
      flex: 1;
      padding: 14px 16px;
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .tab-button i {
      font-size: 16px;
    }

    .tab-button:hover {
      color: var(--text-primary);
      background: rgba(139, 92, 246, 0.05);
    }

    .tab-button.active {
      color: var(--accent-purple);
      font-weight: 600;
    }

    .tab-button.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent-purple);
    }

    .tab-badge {
      padding: 2px 6px;
      background: var(--accent-purple);
      color: white;
      font-size: 11px;
      font-weight: 600;
      border-radius: 10px;
      min-width: 20px;
      text-align: center;
    }

    .tab-live {
      color: var(--accent-danger);
      font-size: 12px;
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

    .tab-content {
      flex: 1;
      padding: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .tab-content > div {
      height: 100%;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .tab-button span:not(.tab-badge):not(.tab-live) {
        display: none;
      }

      .tab-button {
        padding: 12px 8px;
      }
    }
  `],
  animations: [
    // Simple fade in animation
  ]
})
export class ActivityTabsComponent {
  @Input() tokenAddress: string = '';
  @Input() tokenSymbol: string = '';
  @Input() canSendMessages: boolean = false;
  @Input() isLive: boolean = false;
  @Input() threadCount: number = 5;
  @Input() holderCount: number = 25;

  activeTab: 'thread' | 'holders' | 'ai' = 'thread';

  setActiveTab(tab: 'thread' | 'holders' | 'ai'): void {
    this.activeTab = tab;
  }
}
