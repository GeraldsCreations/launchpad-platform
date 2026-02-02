import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private messageService: MessageService) {}

  success(summary: string, detail?: string, life: number = 5000): void {
    this.messageService.add({
      severity: 'success',
      summary,
      detail,
      life
    });
  }

  error(summary: string, detail?: string, life: number = 7000): void {
    this.messageService.add({
      severity: 'error',
      summary,
      detail,
      life
    });
  }

  warning(summary: string, detail?: string, life: number = 6000): void {
    this.messageService.add({
      severity: 'warn',
      summary,
      detail,
      life
    });
  }

  info(summary: string, detail?: string, life: number = 5000): void {
    this.messageService.add({
      severity: 'info',
      summary,
      detail,
      life
    });
  }

  // Transaction notifications
  transactionPending(txSignature: string): void {
    this.info(
      'Transaction Pending',
      `Transaction ${txSignature.slice(0, 8)}... is being processed`,
      8000
    );
  }

  transactionSuccess(txSignature: string, message?: string): void {
    this.success(
      'Transaction Successful',
      message || `Transaction ${txSignature.slice(0, 8)}... confirmed`,
      6000
    );
  }

  transactionFailed(error: string): void {
    this.error(
      'Transaction Failed',
      error,
      8000
    );
  }

  // Trade notifications
  buySuccess(tokenSymbol: string, amount: number): void {
    this.success(
      'Purchase Successful',
      `Bought ${amount.toLocaleString()} ${tokenSymbol}`,
      5000
    );
  }

  sellSuccess(tokenSymbol: string, amount: number): void {
    this.success(
      'Sale Successful',
      `Sold ${amount.toLocaleString()} ${tokenSymbol}`,
      5000
    );
  }

  // Token creation notifications
  tokenCreated(tokenName: string, tokenAddress: string): void {
    this.success(
      'Token Created',
      `${tokenName} has been successfully launched!`,
      7000
    );
  }

  // Wallet notifications
  walletConnected(address: string): void {
    const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
    this.success(
      'Wallet Connected',
      `Connected to ${shortAddress}`,
      4000
    );
  }

  walletDisconnected(): void {
    this.info(
      'Wallet Disconnected',
      'Your wallet has been disconnected',
      3000
    );
  }

  copyToClipboard(label: string = 'Text'): void {
    this.info(
      'Copied to Clipboard',
      `${label} copied successfully`,
      2000
    );
  }
}
