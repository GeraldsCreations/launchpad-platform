import { Injectable } from '@angular/core';
import { Connection, PublicKey, TransactionSignature } from '@solana/web3.js';
import { environment } from '../../../environments/environment';
import { WalletService } from './wallet.service';

@Injectable({
  providedIn: 'root'
})
export class BlockchainService {
  private connection: Connection;

  constructor(private walletService: WalletService) {
    this.connection = new Connection(environment.solanaRpcUrl, 'confirmed');
  }

  async getTokenBalance(tokenMint: string, walletAddress: string): Promise<number> {
    try {
      const mintPubkey = new PublicKey(tokenMint);
      const walletPubkey = new PublicKey(walletAddress);

      // Get associated token account
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        walletPubkey,
        { mint: mintPubkey }
      );

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      return balance || 0;
    } catch (error) {
      console.error('Failed to get token balance:', error);
      return 0;
    }
  }

  async getSOLBalance(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Failed to get SOL balance:', error);
      return 0;
    }
  }

  async confirmTransaction(signature: TransactionSignature, commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'): Promise<boolean> {
    try {
      const result = await this.connection.confirmTransaction(signature, commitment);
      return !result.value.err;
    } catch (error) {
      console.error('Failed to confirm transaction:', error);
      return false;
    }
  }

  async getTransaction(signature: TransactionSignature): Promise<any> {
    try {
      return await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });
    } catch (error) {
      console.error('Failed to get transaction:', error);
      return null;
    }
  }

  async getTokenMetadata(tokenMint: string): Promise<any> {
    try {
      const mintPubkey = new PublicKey(tokenMint);
      const accountInfo = await this.connection.getParsedAccountInfo(mintPubkey);
      return accountInfo.value?.data;
    } catch (error) {
      console.error('Failed to get token metadata:', error);
      return null;
    }
  }

  getExplorerUrl(signature: string): string {
    const cluster = environment.solanaNetwork === 'mainnet-beta' ? '' : `?cluster=${environment.solanaNetwork}`;
    return `https://solscan.io/tx/${signature}${cluster}`;
  }

  getAddressExplorerUrl(address: string): string {
    const cluster = environment.solanaNetwork === 'mainnet-beta' ? '' : `?cluster=${environment.solanaNetwork}`;
    return `https://solscan.io/address/${address}${cluster}`;
  }

  getConnection(): Connection {
    return this.connection;
  }
}
