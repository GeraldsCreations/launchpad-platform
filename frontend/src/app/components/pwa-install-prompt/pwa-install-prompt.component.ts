import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../../core/services/pwa.service';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pwa-prompt" *ngIf="showPrompt && !isDismissed">
      <div class="pwa-prompt-content">
        <div class="pwa-prompt-icon">
          <span class="text-3xl">🦞</span>
        </div>
        <div class="pwa-prompt-text">
          <h3 class="pwa-prompt-title">Install Pump Bots</h3>
          <p class="pwa-prompt-description">
            Get the full app experience with offline access and faster load times
          </p>
        </div>
        <div class="pwa-prompt-actions">
          <button 
            (click)="dismiss()" 
            class="pwa-button pwa-button-secondary">
            Not now
          </button>
          <button 
            (click)="install()" 
            class="pwa-button pwa-button-primary">
            Install
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pwa-prompt {
      position: fixed;
      bottom: 80px; /* Above mobile nav */
      left: 16px;
      right: 16px;
      z-index: 999;
      animation: slideUp 0.3s ease-out;
    }

    @media (min-width: 768px) {
      .pwa-prompt {
        bottom: 24px;
        left: auto;
        right: 24px;
        max-width: 400px;
      }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .pwa-prompt-content {
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .pwa-prompt-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pwa-prompt-text {
      flex: 1;
    }

    .pwa-prompt-title {
      font-size: 18px;
      font-weight: 600;
      color: white;
      margin: 0 0 4px 0;
    }

    .pwa-prompt-description {
      font-size: 14px;
      color: #9ca3af;
      margin: 0;
      line-height: 1.5;
    }

    .pwa-prompt-actions {
      display: flex;
      gap: 12px;
    }

    .pwa-button {
      flex: 1;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .pwa-button:active {
      transform: scale(0.98);
    }

    .pwa-button-secondary {
      background: rgba(75, 85, 99, 0.5);
      color: #d1d5db;
    }

    .pwa-button-secondary:hover {
      background: rgba(75, 85, 99, 0.7);
    }

    .pwa-button-primary {
      background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }

    .pwa-button-primary:hover {
      box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
    }
  `]
})
export class PwaInstallPromptComponent implements OnInit {
  showPrompt = false;
  isDismissed = false;

  constructor(private pwaService: PwaService) {}

  ngOnInit() {
    // Check if user already dismissed or installed
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        this.isDismissed = true;
        return;
      }
    }

    // Subscribe to install prompt availability
    this.pwaService.installPrompt$.subscribe(canPrompt => {
      this.showPrompt = canPrompt && !this.isDismissed;
    });

    // Hide if already installed
    this.pwaService.isInstalled$.subscribe(installed => {
      if (installed) {
        this.showPrompt = false;
      }
    });

    // Show prompt after 10 seconds if eligible
    setTimeout(() => {
      if (this.pwaService.canInstall() && !this.isDismissed) {
        this.showPrompt = true;
      }
    }, 10000);
  }

  async install() {
    const success = await this.pwaService.showInstallPrompt();
    if (success) {
      this.showPrompt = false;
    }
  }

  dismiss() {
    this.isDismissed = true;
    this.showPrompt = false;
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  }
}
