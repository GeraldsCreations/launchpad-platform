import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SolanaWalletService, WalletState } from './solana-wallet.service';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

/**
 * Wallet Service - Facade for Solana wallet operations
 * Uses SolanaWalletService (Reown AppKit) under the hood
 */
@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private connectingSubject = new BehaviorSubject<boolean>(false);
  private walletSubject = new BehaviorSubject<PublicKey | null>(null);

  public connected$ = this.connectedSubject.asObservable();
  public connecting$ = this.connectingSubject.asObservable();
  public wallet$ = this.walletSubject.asObservable();

  constructor(private solanaWallet: SolanaWalletService) {
    // Subscribe to wallet state changes
    this.solanaWallet.getWalletState().subscribe((state: WalletState) => {
      this.connectedSubject.next(state.connected);
      
      if (state.address) {
        try {
          this.walletSubject.next(new PublicKey(state.address));
        } catch (error) {
          console.error('Invalid public key:', error);
          this.walletSubject.next(null);
        }
      } else {
        this.walletSubject.next(null);
      }
    });
  }

  /**
   * Connect wallet (opens modal)
   */
  async connect(): Promise<void> {
    this.connectingSubject.next(true);
    
    try {
      await this.solanaWallet.connect();
    } finally {
      this.connectingSubject.next(false);
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    await this.solanaWallet.disconnect();
  }

  /**
   * Get wallet public key
   */
  getPublicKey(): PublicKey | null {
    return this.solanaWallet.getPublicKey();
  }

  /**
   * Get wallet address as string
   */
  getPublicKeyString(): string | null {
    return this.solanaWallet.getAddress();
  }

  /**
   * Get SOL balance
   */
  async getBalance(): Promise<number> {
    const state = this.solanaWallet.getCurrentState();
    
    if (state.balance !== null) {
      return state.balance;
    }

    // Fetch if not available
    await this.solanaWallet.updateBalance();
    const updatedState = this.solanaWallet.getCurrentState();
    
    return updatedState.balance || 0;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.solanaWallet.isConnected();
  }

  /**
   * Sign and send transaction
   */
  async signAndSendTransaction(transaction: Transaction | VersionedTransaction): Promise<string> {
    return this.solanaWallet.signAndSendTransaction(transaction);
  }

  /**
   * Sign message
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    return this.solanaWallet.signMessage(message);
  }

  /**
   * Request airdrop (devnet/testnet only)
   */
  async requestAirdrop(amount: number = 1): Promise<string> {
    return this.solanaWallet.requestAirdrop(amount);
  }

  /**
   * Get current network
   */
  getCurrentNetwork(): 'mainnet' | 'testnet' | 'devnet' {
    return this.solanaWallet.getCurrentState().network;
  }

  /**
   * Get wallet state
   */
  getWalletState(): Observable<WalletState> {
    return this.solanaWallet.getWalletState();
  }
}
