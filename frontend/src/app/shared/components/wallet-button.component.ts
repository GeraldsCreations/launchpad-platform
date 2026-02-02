import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { WalletService } from '../../core/services/wallet.service';
import { Subject, takeUntil } from 'rxjs';
import { PublicKey } from '@solana/web3.js';

@Component({
  selector: 'app-wallet-button',
  standalone: true,
  imports: [CommonModule, ButtonModule, MenuModule],
  template: `
    <div class="wallet-button-container">
      @if (!connected) {
        <p-button 
          label="Connect Wallet" 
          icon="pi pi-wallet"
          [loading]="connecting"
          (onClick)="connect()"
          styleClass="p-button-primary">
        </p-button>
      } @else {
        <p-button 
          [label]="walletAddress"
          icon="pi pi-wallet"
          (onClick)="menu.toggle($event)"
          styleClass="p-button-outlined">
        </p-button>
        <p-menu #menu [model]="menuItems" [popup]="true"></p-menu>
      }
    </div>
  `,
  styles: [`
    .wallet-button-container {
      display: inline-block;
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

  constructor(private walletService: WalletService) {}

  ngOnInit(): void {
    this.walletService.connected$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.connected = connected;
        if (connected) {
          this.updateWalletInfo();
        }
      });

    this.walletService.connecting$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connecting => {
        this.connecting = connecting;
      });

    this.walletService.wallet$
      .pipe(takeUntil(this.destroy$))
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
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
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
    this.menuItems = [
      {
        label: `Balance: ${this.balance.toFixed(4)} SOL`,
        icon: 'pi pi-wallet',
        disabled: true
      },
      {
        separator: true
      },
      {
        label: 'Copy Address',
        icon: 'pi pi-copy',
        command: () => this.copyAddress()
      },
      {
        label: 'View on Explorer',
        icon: 'pi pi-external-link',
        command: () => this.viewOnExplorer()
      },
      {
        separator: true
      },
      {
        label: 'Disconnect',
        icon: 'pi pi-sign-out',
        command: () => this.disconnect()
      }
    ];
  }

  private copyAddress(): void {
    const address = this.walletService.getPublicKeyString();
    if (address) {
      navigator.clipboard.writeText(address);
      // You could add a toast notification here
    }
  }

  private viewOnExplorer(): void {
    const address = this.walletService.getPublicKeyString();
    if (address) {
      window.open(`https://solscan.io/address/${address}?cluster=devnet`, '_blank');
    }
  }
}
