import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { createAppKit } from '@reown/appkit';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';
import { PublicKey, Transaction, VersionedTransaction, Connection } from '@solana/web3.js';
import { REOWN_PROJECT_ID, REOWN_DEMO_PROJECT_ID, APP_METADATA } from '../../../environments/wallet-config';

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number | null;
  network: 'mainnet' | 'testnet' | 'devnet';
}

@Injectable({
  providedIn: 'root'
})
export class SolanaWalletService {
  private walletState = new BehaviorSubject<WalletState>({
    connected: false,
    address: null,
    balance: null,
    network: 'devnet'
  });

  public walletState$ = this.walletState.asObservable();
  private appKit: any;
  private solanaAdapter: SolanaAdapter | null = null;

  constructor() {
    this.initializeAppKit();
  }

  private initializeAppKit() {
    // Solana Adapter
    this.solanaAdapter = new SolanaAdapter();

    // Create AppKit instance
    const projectId = REOWN_PROJECT_ID !== 'ff9fa0efdc94bc398850632c21195957' 
      ? REOWN_PROJECT_ID 
      : REOWN_DEMO_PROJECT_ID;
    console.log('Using Reown Project ID:', projectId);
    this.appKit = createAppKit({
      adapters: [this.solanaAdapter as any],
      networks: [solana, solanaTestnet, solanaDevnet],
      projectId,
      metadata: APP_METADATA,
      features: {
        analytics: true,
        email: false,
        socials: false
      },
      defaultNetwork: solanaDevnet
    });

    // Subscribe to connection events
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for account changes
    this.appKit?.subscribeAccount((account: any) => {
      console.log('Account changed:', account);
      
      if (account?.address) {
        this.walletState.next({
          connected: true,
          address: account.address,
          balance: null, // Will be fetched separately
          network: this.getCurrentNetwork()
        });
        
        // Fetch balance
        this.updateBalance();
      } else {
        this.walletState.next({
          connected: false,
          address: null,
          balance: null,
          network: this.getCurrentNetwork()
        });
      }
    });

    // Listen for network changes
    this.appKit?.subscribeNetwork((network: any) => {
      console.log('Network changed:', network);
      
      const currentState = this.walletState.value;
      this.walletState.next({
        ...currentState,
        network: this.networkIdToName(network?.id)
      });
    });
  }

  private networkIdToName(networkId: string): 'mainnet' | 'testnet' | 'devnet' {
    if (networkId?.includes('mainnet')) return 'mainnet';
    if (networkId?.includes('testnet')) return 'testnet';
    return 'devnet';
  }

  private getCurrentNetwork(): 'mainnet' | 'testnet' | 'devnet' {
    // Get from AppKit state
    return this.walletState.value.network || 'devnet';
  }

  /**
   * Open wallet connection modal
   */
  async connect(): Promise<void> {
    try {
      await this.appKit?.open();
    } catch (error) {
      console.error('Failed to open wallet modal:', error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    try {
      await this.appKit?.disconnect();
      
      this.walletState.next({
        connected: false,
        address: null,
        balance: null,
        network: this.getCurrentNetwork()
      });
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  }

  /**
   * Get current wallet address
   */
  getAddress(): string | null {
    return this.walletState.value.address;
  }

  /**
   * Get PublicKey object
   */
  getPublicKey(): PublicKey | null {
    const address = this.getAddress();
    if (!address) return null;
    
    try {
      return new PublicKey(address);
    } catch (error) {
      console.error('Invalid public key:', error);
      return null;
    }
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.walletState.value.connected;
  }

  /**
   * Get SOL balance
   */
  async updateBalance(): Promise<void> {
    const address = this.getAddress();
    if (!address) return;

    try {
      // Get balance from Solana RPC
      const connection = this.getConnection();
      const publicKey = new PublicKey(address);
      const balance = await connection.getBalance(publicKey);
      
      const currentState = this.walletState.value;
      this.walletState.next({
        ...currentState,
        balance: balance / 1_000_000_000 // Convert lamports to SOL
      });
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }

  /**
   * Get Solana connection based on current network
   */
  private getConnection(): Connection {
    const network = this.getCurrentNetwork();
    
    const endpoints: Record<string, string> = {
      'mainnet': 'https://api.mainnet-beta.solana.com',
      'testnet': 'https://api.testnet.solana.com',
      'devnet': 'https://api.devnet.solana.com'
    };
    
    return new Connection(endpoints[network] || endpoints['devnet'], 'confirmed');
  }

  /**
   * Sign and send a transaction
   */
  async signAndSendTransaction(transaction: Transaction | VersionedTransaction): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected');
    }

    try {
      // Use AppKit's connection provider
      const connection = this.getConnection();
      
      // Get the connected wallet's provider through the adapter
      const provider = (this.solanaAdapter as any)?.provider || (window as any).solana;
      
      if (!provider) {
        throw new Error('Wallet provider not available');
      }

      // Sign and send transaction
      const { signature } = await provider.sendTransaction(transaction, connection);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature);
      
      return signature;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Sign a message
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get the connected wallet's provider
      const provider = (this.solanaAdapter as any)?.provider || (window as any).solana;
      
      if (!provider?.signMessage) {
        throw new Error('Wallet does not support message signing');
      }

      const signature = await provider.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Message signing failed:', error);
      throw error;
    }
  }

  /**
   * Request airdrop (devnet/testnet only)
   */
  async requestAirdrop(amount: number = 1): Promise<string> {
    const network = this.getCurrentNetwork();
    if (network === 'mainnet') {
      throw new Error('Airdrop not available on mainnet');
    }

    const publicKey = this.getPublicKey();
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const connection = this.getConnection();
      const signature = await connection.requestAirdrop(
        publicKey,
        amount * 1_000_000_000 // Convert SOL to lamports
      );
      
      await connection.confirmTransaction(signature);
      
      // Update balance after airdrop
      await this.updateBalance();
      
      return signature;
    } catch (error) {
      console.error('Airdrop failed:', error);
      throw error;
    }
  }

  /**
   * Get wallet state as observable
   */
  getWalletState(): Observable<WalletState> {
    return this.walletState$;
  }

  /**
   * Get current wallet state (snapshot)
   */
  getCurrentState(): WalletState {
    return this.walletState.value;
  }
}
