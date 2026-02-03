import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { FileUploadModule } from 'primeng/fileupload';
import { ApiService } from '../../core/services/api.service';
import { WalletService } from '../../core/services/wallet.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-create-token',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    InputNumberModule,
    FileUploadModule
  ],
  template: `
    <div class="create-token-container max-w-3xl mx-auto px-4 py-8">
      <h1 class="text-4xl font-bold mb-2">🚀 Create Token</h1>
      <p class="text-gray-400 mb-8">Launch your own token on Solana</p>

      <p-card>
        <form (ngSubmit)="createToken()" class="space-y-6">
          <div>
            <label class="block text-sm font-medium mb-2">Token Name *</label>
            <input 
              pInputText
              [(ngModel)]="formData.name"
              name="name"
              placeholder="My Awesome Token"
              class="w-full"
              required>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Symbol *</label>
            <input 
              pInputText
              [(ngModel)]="formData.symbol"
              name="symbol"
              placeholder="MAT"
              maxlength="10"
              class="w-full"
              required>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Description</label>
            <textarea 
              pInputTextarea
              [(ngModel)]="formData.description"
              name="description"
              placeholder="Describe your token..."
              rows="4"
              class="w-full">
            </textarea>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Image URL</label>
            <input 
              pInputText
              [(ngModel)]="formData.imageUrl"
              name="imageUrl"
              placeholder="https://..."
              class="w-full">
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Initial Buy (SOL)</label>
            <p-inputNumber 
              [(ngModel)]="formData.initialBuySol"
              name="initialBuySol"
              [min]="0"
              [maxFractionDigits]="4"
              mode="decimal"
              placeholder="0.00"
              styleClass="w-full">
            </p-inputNumber>
            <small class="text-gray-400">Optional: Buy tokens immediately after creation</small>
          </div>

          <!-- Bonding Curve Info -->
          <div class="bg-gradient-to-r from-primary-900/20 to-secondary-900/20 border border-primary-500/30 p-6 rounded-lg">
            <h3 class="font-semibold mb-3 flex items-center gap-2">
              <i class="pi pi-chart-line text-primary-400"></i>
              Bonding Curve Preview
            </h3>
            <div class="space-y-3">
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Initial Supply:</span>
                <span class="font-semibold">1,000,000,000 tokens</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Initial Price:</span>
                <span class="font-semibold">~0.00000003 SOL</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Graduation Target:</span>
                <span class="font-semibold text-success-400">$69,000 Market Cap</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Raydium Liquidity:</span>
                <span class="font-semibold">85 SOL</span>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-700">
              <p class="text-xs text-gray-400">
                💡 Your token will trade on a bonding curve until it reaches $69K market cap, 
                then automatically graduate to Raydium with permanent liquidity.
              </p>
            </div>
          </div>

          <div class="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-lg">
            <h3 class="font-semibold mb-2 flex items-center gap-2">
              <i class="pi pi-exclamation-triangle text-yellow-500"></i>
              Important Information
            </h3>
            <ul class="text-sm text-gray-400 space-y-1">
              <li>• Creation fee: 1 SOL (includes initial liquidity)</li>
              <li>• All transactions are final and on-chain</li>
              <li>• You'll receive 10% of total supply</li>
              <li>• Trading fee: 1% on all transactions</li>
            </ul>
          </div>

          @if (!walletConnected) {
            <div class="text-center py-4 bg-yellow-900/20 rounded-lg">
              <i class="pi pi-exclamation-triangle text-yellow-500 mr-2"></i>
              <span class="text-yellow-500">Connect your wallet to create a token</span>
            </div>
          }

          <p-button 
            type="submit"
            label="Create Token"
            icon="pi pi-plus"
            [loading]="creating"
            [disabled]="!canCreate()"
            styleClass="w-full p-button-lg p-button-success">
          </p-button>
        </form>
      </p-card>
    </div>
  `,
  styles: [`
    .create-token-container {
      min-height: calc(100vh - 80px);
    }
  `]
})
export class CreateTokenComponent {
  formData = {
    name: '',
    symbol: '',
    description: '',
    imageUrl: '',
    initialBuySol: 0
  };

  creating = false;
  walletConnected = false;

  constructor(
    private apiService: ApiService,
    private walletService: WalletService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.walletService.connected$.subscribe(connected => {
      this.walletConnected = connected;
    });
  }

  canCreate(): boolean {
    return this.walletConnected && 
           this.formData.name.length > 0 && 
           this.formData.symbol.length > 0 &&
           !this.creating;
  }

  async createToken(): Promise<void> {
    if (!this.canCreate()) return;

    this.creating = true;
    this.notificationService.info('Creating token...', 'Please confirm the transaction in your wallet');
    
    try {
      const result = await this.apiService.createToken(this.formData).toPromise();
      if (result) {
        this.notificationService.success('Token Created!', `${this.formData.name} has been created successfully`);
        this.notificationService.tokenCreated(this.formData.name, result.address);
        
        // Navigate after a short delay to allow user to see the success message
        setTimeout(() => {
          this.router.navigate(['/token', result.address]);
        }, 1500);
      }
    } catch (error: any) {
      console.error('Failed to create token:', error);
      this.notificationService.transactionFailed(error.message || 'Failed to create token');
    } finally {
      this.creating = false;
    }
  }
}
