import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { environment } from '../../../environments/environment';

export interface WalletAdapter {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private walletSubject = new BehaviorSubject<PublicKey | null>(null);
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private connectingSubject = new BehaviorSubject<boolean>(false);
  private walletAdapter: any = null;
  private connection: Connection;

  public wallet$ = this.walletSubject.asObservable();
  public connected$ = this.connectedSubject.asObservable();
  public connecting$ = this.connectingSubject.asObservable();

  constructor() {
    this.connection = new Connection(environment.solanaRpcUrl, 'confirmed');
    this.detectWallet();
  }

  private detectWallet(): void {
    // Check if Phantom wallet is installed
    if ((window as any).solana && (window as any).solana.isPhantom) {
      this.walletAdapter = (window as any).solana;
      
      // Listen for account changes
      this.walletAdapter.on('connect', () => {
        this.handleConnect();
      });

      this.walletAdapter.on('disconnect', () => {
        this.handleDisconnect();
      });

      this.walletAdapter.on('accountChanged', (publicKey: PublicKey | null) => {
        if (publicKey) {
          this.walletSubject.next(publicKey);
        } else {
          this.handleDisconnect();
        }
      });

      // Check if already connected
      if (this.walletAdapter.isConnected) {
        this.handleConnect();
      }
    }
  }

  async connect(): Promise<void> {
    if (!this.walletAdapter) {
      throw new Error('Wallet not detected. Please install Phantom, Solflare, or Coinbase Wallet.');
    }

    if (this.connectedSubject.value) {
      return;
    }

    try {
      this.connectingSubject.next(true);
      await this.walletAdapter.connect();
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      this.connectingSubject.next(false);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.walletAdapter) {
      return;
    }

    try {
      await this.walletAdapter.disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  }

  private handleConnect(): void {
    if (this.walletAdapter && this.walletAdapter.publicKey) {
      this.walletSubject.next(this.walletAdapter.publicKey);
      this.connectedSubject.next(true);
      this.connectingSubject.next(false);
    }
  }

  private handleDisconnect(): void {
    this.walletSubject.next(null);
    this.connectedSubject.next(false);
    this.connectingSubject.next(false);
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.walletAdapter || !this.connectedSubject.value) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this.walletAdapter.signTransaction(transaction);
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw error;
    }
  }

  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    if (!this.walletAdapter || !this.connectedSubject.value) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this.walletAdapter.signAllTransactions(transactions);
    } catch (error) {
      console.error('Failed to sign transactions:', error);
      throw error;
    }
  }

  async getBalance(): Promise<number> {
    const publicKey = this.walletSubject.value;
    if (!publicKey) {
      return 0;
    }

    try {
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }

  getPublicKey(): PublicKey | null {
    return this.walletSubject.value;
  }

  getPublicKeyString(): string | null {
    const publicKey = this.walletSubject.value;
    return publicKey ? publicKey.toBase58() : null;
  }

  isConnected(): boolean {
    return this.connectedSubject.value;
  }

  getConnection(): Connection {
    return this.connection;
  }
}
