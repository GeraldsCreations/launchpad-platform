import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { WalletService } from '../../core/services/wallet.service';
import { NotificationService } from '../../core/services/notification.service';
import { Subject, takeUntil, distinctUntilChanged } from 'rxjs';
import { PublicKey } from '@solana/web3.js';

@Component({
  selector: 'app-wallet-button',
  standalone: true,
  imports: [CommonModule, ButtonModule, MenuModule],
  template: `
    <div class="wallet-button-container">
      @if (!connected) {
        <!-- Connect Button -->
        <button 
          class="wallet-connect-btn"
          [class.loading]="connecting"
          (click)="connect()"
          [disabled]="connecting">
          <svg class="wallet-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" fill="currentColor"/>
          </svg>
          <span>{{ connecting ? 'Connecting...' : 'Connect Wallet' }}</span>
        </button>
      } @else {
        <!-- Connected State -->
        <div class="wallet-connected" (click)="menu.toggle($event)">
          <div class="wallet-info">
            <div class="wallet-address">{{ walletAddress }}</div>
            <div class="wallet-balance">{{ balance.toFixed(3) }} SOL</div>
          </div>
          <div class="wallet-avatar">
            <svg class="avatar-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="url(#gradient)" />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#a855f7;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        <p-menu #menu [model]="menuItems" [popup]="true" styleClass="wallet-menu"></p-menu>
      }
    </div>
  `,
  styles: [`
    .wallet-button-container {
      display: flex;
      align-items: center;
    }

    /* Connect Button */
    .wallet-connect-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
    }

    .wallet-connect-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(168, 85, 247, 0.4);
    }

    .wallet-connect-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .wallet-connect-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .wallet-icon {
      width: 20px;
      height: 20px;
    }

    .wallet-connect-btn.loading .wallet-icon {
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Connected State */
    .wallet-connected {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px 8px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
    }

    .wallet-connected:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(168, 85, 247, 0.5);
    }

    .wallet-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .wallet-address {
      font-size: 14px;
      font-weight: 600;
      color: white;
      font-family: 'Courier New', monospace;
    }

    .wallet-balance {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 500;
    }

    .wallet-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.1);
    }

    .avatar-icon {
      width: 100%;
      height: 100%;
    }

    /* Mobile Responsive */
    @media (max-width: 640px) {
      .wallet-connect-btn {
        padding: 10px 16px;
        font-size: 13px;
      }

      .wallet-connect-btn span {
        display: none;
      }

      .wallet-connected {
        padding: 6px 8px;
        gap: 8px;
      }

      .wallet-info {
        display: none;
      }

      .wallet-avatar {
        width: 28px;
        height: 28px;
      }
    }
  `]
})
export class WalletButtonComponent implements OnInit, OnDestroy {
  connected = false;
  connecting = false;
  walletAddress = '';
  balance = 0;
  menuItems: MenuItem[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private walletService: WalletService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.walletService.connected$
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(connected => {
        this.connected = connected;
        if (connected) {
          this.updateWalletInfo();
          const address = this.walletService.getPublicKeyString();
          if (address) {
            this.notificationService.walletConnected(address);
          }
        }
      });

    this.walletService.connecting$
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(connecting => {
        this.connecting = connecting;
      });

    this.walletService.wallet$
      .pipe(
        distinctUntilChanged((prev, curr) => {
          if (!prev && !curr) return true;
          if (!prev || !curr) return false;
          return prev.equals(curr);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(wallet => {
        if (wallet) {
          this.updateWalletInfo();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async connect(): Promise<void> {
    try {
      await this.walletService.connect();
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      alert(error.message || 'Failed to connect wallet');
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.walletService.disconnect();
      this.walletAddress = '';
      this.balance = 0;
      this.notificationService.walletDisconnected();
    } catch (error: any) {
      console.error('Failed to disconnect wallet:', error);
      this.notificationService.error('Failed to disconnect', error.message);
    }
  }

  private async updateWalletInfo(): Promise<void> {
    const publicKey = this.walletService.getPublicKey();
    if (publicKey) {
      this.walletAddress = this.formatAddress(publicKey.toBase58());
      this.balance = await this.walletService.getBalance();
      this.updateMenuItems();
    }
  }

  private formatAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  private updateMenuItems(): void {
    const publicKey = this.walletService.getPublicKey();
    const fullAddress = publicKey ? publicKey.toBase58() : '';
    
    this.menuItems = [
      {
        label: `${this.balance.toFixed(3)} SOL`,
        icon: 'pi pi-wallet',
        disabled: true,
        style: { 'font-size': '16px', 'font-weight': '700' }
      },
      {
        separator: true
      },
      {
        label: 'Copy Address',
        icon: 'pi pi-copy',
        command: () => this.copyAddress(),
        title: fullAddress
      },
      {
        label: 'View Explorer',
        icon: 'pi pi-external-link',
        command: () => this.viewOnExplorer()
      },
      {
        label: 'Request Airdrop',
        icon: 'pi pi-download',
        command: () => this.requestAirdrop()
      },
      {
        separator: true
      },
      {
        label: 'Disconnect',
        icon: 'pi pi-sign-out',
        command: () => this.disconnect(),
        styleClass: 'text-red-400'
      }
    ];
  }

  private async requestAirdrop(): Promise<void> {
    try {
      this.notificationService.info('Requesting Airdrop', 'Requesting 1 SOL from devnet faucet...');
      const signature = await this.walletService.requestAirdrop(1);
      this.notificationService.success('Airdrop Successful', `Received 1 SOL! Tx: ${signature.slice(0, 8)}...`);
      // Balance will update automatically via subscription
    } catch (error: any) {
      console.error('Airdrop failed:', error);
      this.notificationService.error('Airdrop Failed', error.message || 'Could not request airdrop');
    }
  }

  private copyAddress(): void {
    const address = this.walletService.getPublicKeyString();
    if (address) {
      navigator.clipboard.writeText(address);
      this.notificationService.copyToClipboard('Wallet address');
    }
  }

  private viewOnExplorer(): void {
    const address = this.walletService.getPublicKeyString();
    if (address) {
      window.open(`https://solscan.io/address/${address}?cluster=devnet`, '_blank');
    }
  }
}
