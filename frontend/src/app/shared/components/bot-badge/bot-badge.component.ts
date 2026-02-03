import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';

export interface BotCreatorInfo {
  botId: string;
  botName: string;
  createdAt: string;
  tokenCount?: number;
  successRate?: number;
}

@Component({
  selector: 'app-bot-badge',
  standalone: true,
  imports: [CommonModule, RouterModule, TooltipModule, ChipModule],
  template: `
    @if (isBot) {
      <div 
        class="bot-badge-container"
        [class.compact]="compact"
        [pTooltip]="tooltipText"
        tooltipPosition="top">
        <div class="bot-badge" [class.animate]="animate">
          <div class="badge-glow"></div>
          <div class="badge-content">
            <i class="pi pi-android bot-icon"></i>
            @if (!compact) {
              <span class="bot-label">{{ badgeLabel }}</span>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .bot-badge-container {
      display: inline-flex;
      align-items: center;
    }

    .bot-badge-container.compact {
      scale: 0.85;
    }

    .bot-badge {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      background: linear-gradient(135deg, #a855f7 0%, #06b6d4 100%);
      border-radius: 1rem;
      cursor: pointer;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 20px rgba(168, 85, 247, 0.3);
    }

    .bot-badge:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 30px rgba(168, 85, 247, 0.5);
    }

    .bot-badge.animate .badge-glow {
      animation: pulse-glow 2s ease-in-out infinite;
    }

    .badge-glow {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(
        circle,
        rgba(255, 255, 255, 0.3) 0%,
        transparent 70%
      );
      opacity: 0;
      pointer-events: none;
    }

    .badge-content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      color: white;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .bot-icon {
      font-size: 1rem;
      animation: bot-pulse 2s ease-in-out infinite;
    }

    .bot-label {
      white-space: nowrap;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    @keyframes pulse-glow {
      0%, 100% {
        opacity: 0;
        transform: scale(0.8);
      }
      50% {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes bot-pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    /* Compact mode adjustments */
    .bot-badge-container.compact .bot-badge {
      padding: 0.25rem 0.5rem;
    }

    .bot-badge-container.compact .bot-icon {
      font-size: 0.875rem;
    }
  `]
})
export class BotBadgeComponent {
  @Input() creatorType?: string;
  @Input() botInfo?: BotCreatorInfo;
  @Input() compact: boolean = false;
  @Input() animate: boolean = true;

  get isBot(): boolean {
    return this.creatorType === 'clawdbot' || this.creatorType === 'agent';
  }

  get badgeLabel(): string {
    if (this.botInfo?.botName) {
      return `${this.botInfo.botName}`;
    }
    
    if (this.creatorType === 'clawdbot') {
      return 'Bot Created';
    }
    
    if (this.creatorType === 'agent') {
      return 'AI Agent';
    }
    
    return 'Bot';
  }

  get tooltipText(): string {
    if (this.botInfo) {
      let tooltip = `Created by: ${this.botInfo.botName}\n`;
      tooltip += `Bot ID: ${this.botInfo.botId}\n`;
      tooltip += `Created: ${new Date(this.botInfo.createdAt).toLocaleDateString()}`;
      
      if (this.botInfo.tokenCount !== undefined) {
        tooltip += `\nTotal Tokens: ${this.botInfo.tokenCount}`;
      }
      
      if (this.botInfo.successRate !== undefined) {
        tooltip += `\nSuccess Rate: ${this.botInfo.successRate.toFixed(1)}%`;
      }
      
      return tooltip;
    }
    
    if (this.creatorType === 'clawdbot') {
      return 'This token was created by an OpenClaw Bot';
    }
    
    if (this.creatorType === 'agent') {
      return 'This token was created by an AI Agent';
    }
    
    return 'Bot-created token';
  }
}
