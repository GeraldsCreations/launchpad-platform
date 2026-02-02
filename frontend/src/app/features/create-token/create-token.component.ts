import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { ApiService } from '../../core/services/api.service';
import { WalletService } from '../../core/services/wallet.service';

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
    InputNumberModule
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
              [(ngModel)]="formData.image_url"
              name="image_url"
              placeholder="https://..."
              class="w-full">
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Initial Buy (SOL)</label>
            <p-inputNumber 
              [(ngModel)]="formData.initial_buy_sol"
              name="initial_buy_sol"
              [min]="0"
              [maxFractionDigits]="4"
              mode="decimal"
              placeholder="0.00"
              styleClass="w-full">
            </p-inputNumber>
            <small class="text-gray-400">Optional: Buy tokens immediately after creation</small>
          </div>

          <div class="bg-gray-800 p-4 rounded-lg">
            <h3 class="font-semibold mb-2">⚠️ Before you create:</h3>
            <ul class="text-sm text-gray-400 space-y-1">
              <li>• Token creation costs ~0.5 SOL</li>
              <li>• Tokens use a bonding curve for price discovery</li>
              <li>• Tokens graduate to Raydium at $69K market cap</li>
              <li>• All transactions are final and on-chain</li>
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
    image_url: '',
    initial_buy_sol: 0
  };

  creating = false;
  walletConnected = false;

  constructor(
    private apiService: ApiService,
    private walletService: WalletService,
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
    try {
      const result = await this.apiService.createToken(this.formData).toPromise();
      if (result) {
        alert(`Token created successfully!\\nAddress: ${result.token_address}\\nTransaction: ${result.transaction_signature}`);
        this.router.navigate(['/token', result.token_address]);
      }
    } catch (error: any) {
      console.error('Failed to create token:', error);
      alert(`Failed to create token: ${error.message}`);
    } finally {
      this.creating = false;
    }
  }
}
