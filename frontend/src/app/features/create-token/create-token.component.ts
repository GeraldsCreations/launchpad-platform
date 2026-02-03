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
import { Transaction } from '@solana/web3.js';

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
            <label class="block text-sm font-medium mb-2">Token Image *</label>
            <div class="image-upload-container">
              @if (imagePreview) {
                <div class="image-preview">
                  <img [src]="imagePreview" alt="Token preview">
                  <button 
                    type="button"
                    class="remove-image-btn"
                    (click)="removeImage()">
                    <i class="pi pi-times"></i>
                  </button>
                </div>
              } @else {
                <div class="upload-zone" (click)="fileInput.click()">
                  <i class="pi pi-cloud-upload text-4xl text-gray-500 mb-2"></i>
                  <p class="text-gray-400">Click to upload image</p>
                  <p class="text-xs text-gray-500 mt-1">PNG or JPG (max 2MB)</p>
                </div>
              }
              <input 
                #fileInput
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                (change)="onImageSelect($event)"
                class="hidden">
            </div>
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
              <li>• <strong class="text-white">Creation fee: 0.02 SOL</strong> (platform + network fees)</li>
              <li>• All transactions are final and on-chain</li>
              <li>• Token image uploaded (max 2MB PNG/JPG)</li>
              <li>• Trading fee: 1% on all transactions</li>
            </ul>
          </div>

          @if (!walletConnected) {
            <div class="text-center py-4 bg-yellow-900/20 rounded-lg">
              <i class="pi pi-exclamation-triangle text-yellow-500 mr-2"></i>
              <span class="text-yellow-500">Connect your wallet to create a token</span>
            </div>
          }

          <button 
            type="submit"
            [disabled]="!canCreate()"
            class="create-token-btn">
            @if (creating) {
              <i class="pi pi-spin pi-spinner mr-2"></i>
              <span>Creating Token...</span>
            } @else {
              <i class="pi pi-rocket mr-2"></i>
              <span>Create Token</span>
            }
          </button>
        </form>
      </p-card>
    </div>
  `,
  styles: [`
    .create-token-container {
      min-height: calc(100vh - 80px);
    }

    .image-upload-container {
      border: 2px dashed rgba(139, 92, 246, 0.3);
      border-radius: 12px;
      overflow: hidden;
    }

    .upload-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 2rem;
      cursor: pointer;
      transition: all 0.2s ease;
      background: rgba(139, 92, 246, 0.05);
    }

    .upload-zone:hover {
      background: rgba(139, 92, 246, 0.1);
      border-color: rgba(139, 92, 246, 0.5);
    }

    .image-preview {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      overflow: hidden;
    }

    .image-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .remove-image-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .remove-image-btn:hover {
      background: rgba(239, 68, 68, 0.9);
      transform: scale(1.1);
    }

    .hidden {
      display: none;
    }

    .create-token-btn {
      width: 100%;
      padding: 1rem 2rem;
      font-size: 1.125rem;
      font-weight: 600;
      color: white;
      background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    }

    .create-token-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(139, 92, 246, 0.6);
      background: linear-gradient(135deg, #9D6EFF 0%, #FF5FAA 100%);
    }

    .create-token-btn:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    }

    .create-token-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .create-token-btn i {
      font-size: 1.25rem;
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
  imagePreview: string | null = null;
  imageBase64: string | null = null;

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

  onImageSelect(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
      this.notificationService.error('Invalid File', 'Please upload a PNG or JPG image');
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      this.notificationService.error('File Too Large', 'Image must be less than 2MB');
      return;
    }

    // Read file and convert to base64
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
      this.imageBase64 = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.imagePreview = null;
    this.imageBase64 = null;
  }

  canCreate(): boolean {
    return this.walletConnected && 
           this.formData.name.length > 0 && 
           this.formData.symbol.length > 0 &&
           this.imageBase64 !== null &&
           !this.creating;
  }

  async createToken(): Promise<void> {
    if (!this.canCreate()) return;

    // Get creator wallet address
    const creatorAddress = this.walletService.getPublicKeyString();
    if (!creatorAddress) {
      this.notificationService.error('Wallet Error', 'Could not get wallet address');
      return;
    }

    this.creating = true;
    this.notificationService.info('Building transaction...', 'Please wait');
    
    try {
      // Step 1: Get unsigned transaction from backend
      const requestData = {
        name: this.formData.name,
        symbol: this.formData.symbol,
        description: this.formData.description || undefined,
        imageUrl: this.imageBase64 || undefined,  // Send base64 image
        creator: creatorAddress,
        creatorType: 'human',
        initialBuy: this.formData.initialBuySol > 0 ? this.formData.initialBuySol : undefined
      };

      const result = await this.apiService.createToken(requestData).toPromise();
      
      if (!result || !result.transaction) {
        throw new Error('No transaction returned from backend');
      }

      console.log('📦 Transaction received:', {
        poolAddress: result.poolAddress,
        tokenMint: result.tokenMint,
        txSize: result.transaction.length
      });

      // Step 2: Decode transaction from base64
      const txBuffer = Buffer.from(result.transaction, 'base64');
      const transaction = Transaction.from(txBuffer);
      
      console.log('✅ Transaction decoded successfully');

      // Step 3: Ask user to sign and send transaction
      this.notificationService.info('Sign Transaction', 'Please approve in your wallet');
      
      const signature = await this.walletService.signAndSendTransaction(transaction);
      
      console.log('✅ Transaction signed and sent:', signature);

      // Step 4: Show success and navigate
      this.notificationService.success('Token Created!', `${this.formData.name} is now on-chain!`);
      this.notificationService.tokenCreated(this.formData.name, result.tokenMint);
      
      // Navigate to token page
      setTimeout(() => {
        this.router.navigate(['/token', result.tokenMint]);
      }, 1500);

    } catch (error: any) {
      console.error('Failed to create token:', error);
      
      // Handle different error types
      let errorMsg = 'Failed to create token';
      if (error.message?.includes('User rejected')) {
        errorMsg = 'Transaction cancelled by user';
      } else if (error.error?.message) {
        errorMsg = Array.isArray(error.error.message) 
          ? error.error.message.join(', ') 
          : error.error.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      this.notificationService.transactionFailed(errorMsg);
    } finally {
      this.creating = false;
    }
  }
}
