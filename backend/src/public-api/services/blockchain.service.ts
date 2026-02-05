import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as bs58 from 'bs58';
import Decimal from 'decimal.js';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly connection: Connection;
  private readonly bondingCurveProgramId: PublicKey;
  private readonly tokenFactoryProgramId: PublicKey;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL') || 'https://api.devnet.solana.com';
    const commitment = this.configService.get<string>('SOLANA_COMMITMENT') || 'confirmed';
    
    this.connection = new Connection(rpcUrl, commitment as any);
    
    const bondingCurveProgramIdStr = this.configService.get<string>('BONDING_CURVE_PROGRAM_ID') || 'BondCurve11111111111111111111111111111111';
    console.log('[PublicKey] blockchain.service.ts:20 - Before creating PublicKey from BONDING_CURVE_PROGRAM_ID:', bondingCurveProgramIdStr);
    this.bondingCurveProgramId = new PublicKey(bondingCurveProgramIdStr);
    console.log('[PublicKey] blockchain.service.ts:20 - After creating PublicKey:', this.bondingCurveProgramId.toBase58());
    
    const tokenFactoryProgramIdStr = this.configService.get<string>('TOKEN_FACTORY_PROGRAM_ID') || 'TokenFact11111111111111111111111111111111';
    console.log('[PublicKey] blockchain.service.ts:24 - Before creating PublicKey from TOKEN_FACTORY_PROGRAM_ID:', tokenFactoryProgramIdStr);
    this.tokenFactoryProgramId = new PublicKey(tokenFactoryProgramIdStr);
    console.log('[PublicKey] blockchain.service.ts:24 - After creating PublicKey:', this.tokenFactoryProgramId.toBase58());

    this.logger.log(`Connected to Solana RPC: ${rpcUrl}`);
  }

  /**
   * Get current SOL balance for a wallet
   */
  async getBalance(wallet: string): Promise<number> {
    try {
      console.log('[PublicKey] blockchain.service.ts:38 - Before creating PublicKey from wallet:', wallet);
      const publicKey = new PublicKey(wallet);
      console.log('[PublicKey] blockchain.service.ts:38 - After creating PublicKey:', publicKey.toBase58());
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      this.logger.error(`Failed to get balance for ${wallet}:`, error);
      throw error;
    }
  }

  /**
   * Calculate token price based on bonding curve formula
   * price = base_price × (1 + supply / max_supply)²
   */
  calculatePrice(basePrice: number, currentSupply: string, maxSupply: string): number {
    const supply = new Decimal(currentSupply);
    const max = new Decimal(maxSupply);
    const base = new Decimal(basePrice);
    
    const ratio = supply.div(max);
    const multiplier = new Decimal(1).plus(ratio).pow(2);
    
    return base.mul(multiplier).toNumber();
  }

  /**
   * Calculate how many tokens user will receive for given SOL amount
   */
  calculateBuyAmount(
    amountSol: number,
    basePrice: number,
    currentSupply: string,
    maxSupply: string,
  ): number {
    // Simplified calculation - in production, this would integrate with on-chain program
    const currentPrice = this.calculatePrice(basePrice, currentSupply, maxSupply);
    const tokensOut = amountSol / currentPrice;
    
    // Apply 1% fee
    return tokensOut * 0.99;
  }

  /**
   * Calculate how much SOL user will receive for given token amount
   */
  calculateSellAmount(
    amountTokens: number,
    basePrice: number,
    currentSupply: string,
    maxSupply: string,
  ): number {
    const currentPrice = this.calculatePrice(basePrice, currentSupply, maxSupply);
    const solOut = amountTokens * currentPrice;
    
    // Apply 1% fee
    return solOut * 0.99;
  }

  /**
   * Get transaction details
   */
  async getTransaction(signature: string): Promise<any> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      return tx;
    } catch (error) {
      this.logger.error(`Failed to get transaction ${signature}:`, error);
      throw error;
    }
  }

  /**
   * Submit transaction to blockchain
   */
  async submitTransaction(serializedTx: string): Promise<string> {
    try {
      const txBuffer = Buffer.from(serializedTx, 'base64');
      const signature = await this.connection.sendRawTransaction(txBuffer, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      
      this.logger.log(`Transaction submitted: ${signature}`);
      return signature;
    } catch (error) {
      this.logger.error('Failed to submit transaction:', error);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async confirmTransaction(signature: string, timeout: number = 30000): Promise<boolean> {
    try {
      const result = await this.connection.confirmTransaction(signature, 'confirmed');
      return !result.value.err;
    } catch (error) {
      this.logger.error(`Failed to confirm transaction ${signature}:`, error);
      return false;
    }
  }

  /**
   * Get token account balance
   */
  async getTokenBalance(tokenAccount: string): Promise<string> {
    try {
      console.log('[PublicKey] blockchain.service.ts:149 - Before creating PublicKey from tokenAccount:', tokenAccount);
      const publicKey = new PublicKey(tokenAccount);
      console.log('[PublicKey] blockchain.service.ts:149 - After creating PublicKey:', publicKey.toBase58());
      const balance = await this.connection.getTokenAccountBalance(publicKey);
      return balance.value.amount;
    } catch (error) {
      this.logger.error(`Failed to get token balance for ${tokenAccount}:`, error);
      throw error;
    }
  }

  getConnection(): Connection {
    return this.connection;
  }
}
