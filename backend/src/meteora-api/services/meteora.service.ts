import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import DLMM, { getPriceOfBinByBinId } from '@meteora-ag/dlmm';
import BN from 'bn.js';

@Injectable()
export class MeteoraService {
  private readonly logger = new Logger(MeteoraService.name);
  private connection: Connection;

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL') || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Get Solana connection
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get DLMM instance for a pool
   */
  async getDLMM(poolAddress: string): Promise<DLMM> {
    try {
      const poolPubkey = new PublicKey(poolAddress);
      const dlmm = await DLMM.create(this.connection, poolPubkey);
      return dlmm;
    } catch (error) {
      this.logger.error(`Failed to get DLMM for pool ${poolAddress}:`, error);
      throw new Error(`Failed to get pool: ${error.message}`);
    }
  }

  /**
   * Get pool information
   */
  async getPoolInfo(poolAddress: string) {
    try {
      const dlmm = await this.getDLMM(poolAddress);
      
      const activeBin = await dlmm.getActiveBin();
      const price = parseFloat(getPriceOfBinByBinId(dlmm.lbPair.binStep, Number(activeBin.binId)).toString());

      return {
        poolAddress,
        tokenX: dlmm.tokenX.publicKey.toBase58(),
        tokenY: dlmm.tokenY.publicKey.toBase58(),
        activeId: Number(activeBin.binId),
        currentPrice: price,
        binStep: dlmm.lbPair.binStep,
        liquidity: {
          tokenX: Number(dlmm.tokenX.amount) / 10 ** dlmm.tokenX.mint.decimals,
          tokenY: Number(dlmm.tokenY.amount) / 10 ** dlmm.tokenY.mint.decimals,
        },
        fees: {
          baseFactor: dlmm.lbPair.parameters.baseFactor,
          protocolShare: dlmm.lbPair.parameters.protocolShare,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get pool info for ${poolAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get quote for buying tokens
   */
  async getSwapQuote(
    poolAddress: string,
    amountIn: number,
    swapForY: boolean = true, // true = buy token, false = sell token
  ) {
    try {
      const dlmm = await this.getDLMM(poolAddress);
      
      const decimals = swapForY 
        ? dlmm.tokenX.mint.decimals 
        : dlmm.tokenY.mint.decimals;
      
      const amountInLamports = new BN(amountIn * 10 ** decimals);

      // Fetch bin arrays for the swap
      const binArrays = await dlmm.getBinArrayForSwap(swapForY);

      const swapQuote = await dlmm.swapQuote(
        amountInLamports,
        swapForY,
        new BN(1000), // 10% slippage (in BPS)
        binArrays,
      );

      return {
        inAmount: Number(swapQuote.consumedInAmount) / 10 ** decimals,
        outAmount: Number(swapQuote.outAmount) / 10 ** (swapForY ? dlmm.tokenY.mint.decimals : dlmm.tokenX.mint.decimals),
        fee: Number(swapQuote.fee) / 10 ** decimals,
        priceImpact: Number(swapQuote.priceImpact) / 10000, // Convert from BPS
      };
    } catch (error) {
      this.logger.error(`Failed to get swap quote:`, error);
      throw error;
    }
  }

  /**
   * Check if pool exists
   */
  async poolExists(poolAddress: string): Promise<boolean> {
    try {
      await this.getDLMM(poolAddress);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current price from pool
   */
  async getCurrentPrice(poolAddress: string): Promise<number> {
    try {
      const dlmm = await this.getDLMM(poolAddress);
      const activeBin = await dlmm.getActiveBin();
      const price = getPriceOfBinByBinId(dlmm.lbPair.binStep, Number(activeBin.binId));
      return parseFloat(price.toString());
    } catch (error) {
      this.logger.error(`Failed to get price for ${poolAddress}:`, error);
      throw error;
    }
  }

  /**
   * Calculate platform fee (0.4% of transaction)
   */
  calculatePlatformFee(amount: number): number {
    return amount * 0.004; // 0.4%
  }

  /**
   * Get launch fee (1 SOL)
   */
  getLaunchFee(): number {
    return 1.0; // 1 SOL
  }
}
