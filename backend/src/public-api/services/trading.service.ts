import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { TradeRepository } from '../../database/repositories/trade.repository';
import { TokenRepository } from '../../database/repositories/token.repository';
import { Trade } from '../../database/entities/trade.entity';
import { BuyTokenDto } from '../dto/buy-token.dto';
import { SellTokenDto } from '../dto/sell-token.dto';
import { BlockchainService } from './blockchain.service';
import { PublicKey } from '@solana/web3.js';

export interface TradeQuote {
  tokenAddress: string;
  side: 'buy' | 'sell';
  inputAmount: number;
  outputAmount: number;
  price: number;
  fee: number;
  priceImpact: number;
}

export interface TradeResult {
  success: boolean;
  signature: string;
  trade: Trade;
}

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);

  constructor(
    private readonly tradeRepository: TradeRepository,
    private readonly tokenRepository: TokenRepository,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Buy tokens with SOL
   */
  async buyToken(buyDto: BuyTokenDto): Promise<TradeResult> {
    this.logger.log(`Buy order: ${buyDto.amountSol} SOL for ${buyDto.tokenAddress}`);

    // Get token
    const token = await this.tokenRepository.findByAddress(buyDto.tokenAddress);
    if (!token) {
      throw new BadRequestException(`Token ${buyDto.tokenAddress} not found`);
    }

    if (token.graduated) {
      throw new BadRequestException('Token has graduated. Trade on DEX instead.');
    }

    // Calculate buy amount
    const tokensOut = this.blockchainService.calculateBuyAmount(
      buyDto.amountSol,
      token.currentPrice,
      token.totalSupply,
      '1000000000', // 1B max supply
    );

    // Check slippage
    if (buyDto.minTokensOut && tokensOut < buyDto.minTokensOut) {
      throw new BadRequestException('Slippage tolerance exceeded');
    }

    // In production: submit transaction to blockchain
    // For now, we'll simulate
    const signature = PublicKey.unique().toBase58();
    const fee = buyDto.amountSol * 0.01;

    // Record trade
    const trade = await this.tradeRepository.create({
      transactionSignature: signature,
      tokenAddress: buyDto.tokenAddress,
      trader: buyDto.buyer,
      side: 'buy',
      amountSol: buyDto.amountSol,
      amountTokens: Math.floor(tokensOut).toString(),
      price: token.currentPrice,
      fee,
    });

    // Update token stats
    const newSupply = (BigInt(token.totalSupply) + BigInt(Math.floor(tokensOut))).toString();
    const newPrice = this.blockchainService.calculatePrice(0.0001, newSupply, '1000000000');
    const newMarketCap = parseFloat(newSupply) * newPrice;

    await this.tokenRepository.updatePrice(token.address, newPrice, newMarketCap);

    // Update 24h volume
    const volume = await this.tradeRepository.get24hVolume(token.address);
    await this.tokenRepository.updateVolume(token.address, volume);

    this.logger.log(`Buy completed: ${signature}`);

    return {
      success: true,
      signature,
      trade,
    };
  }

  /**
   * Sell tokens for SOL
   */
  async sellToken(sellDto: SellTokenDto): Promise<TradeResult> {
    this.logger.log(`Sell order: ${sellDto.amountTokens} tokens for ${sellDto.tokenAddress}`);

    // Get token
    const token = await this.tokenRepository.findByAddress(sellDto.tokenAddress);
    if (!token) {
      throw new BadRequestException(`Token ${sellDto.tokenAddress} not found`);
    }

    if (token.graduated) {
      throw new BadRequestException('Token has graduated. Trade on DEX instead.');
    }

    // Calculate sell amount
    const solOut = this.blockchainService.calculateSellAmount(
      sellDto.amountTokens,
      token.currentPrice,
      token.totalSupply,
      '1000000000',
    );

    // Check slippage
    if (sellDto.minSolOut && solOut < sellDto.minSolOut) {
      throw new BadRequestException('Slippage tolerance exceeded');
    }

    // In production: submit transaction to blockchain
    const signature = PublicKey.unique().toBase58();
    const fee = solOut * 0.01;

    // Record trade
    const trade = await this.tradeRepository.create({
      transactionSignature: signature,
      tokenAddress: sellDto.tokenAddress,
      trader: sellDto.seller,
      side: 'sell',
      amountSol: solOut,
      amountTokens: sellDto.amountTokens.toString(),
      price: token.currentPrice,
      fee,
    });

    // Update token stats
    const newSupply = (BigInt(token.totalSupply) - BigInt(sellDto.amountTokens)).toString();
    const newPrice = this.blockchainService.calculatePrice(0.0001, newSupply, '1000000000');
    const newMarketCap = parseFloat(newSupply) * newPrice;

    await this.tokenRepository.updatePrice(token.address, newPrice, newMarketCap);

    // Update 24h volume
    const volume = await this.tradeRepository.get24hVolume(token.address);
    await this.tokenRepository.updateVolume(token.address, volume);

    this.logger.log(`Sell completed: ${signature}`);

    return {
      success: true,
      signature,
      trade,
    };
  }

  /**
   * Get buy quote
   */
  async getBuyQuote(tokenAddress: string, amountSol: number): Promise<TradeQuote> {
    const token = await this.tokenRepository.findByAddress(tokenAddress);
    if (!token) {
      throw new BadRequestException(`Token ${tokenAddress} not found`);
    }

    const tokensOut = this.blockchainService.calculateBuyAmount(
      amountSol,
      token.currentPrice,
      token.totalSupply,
      '1000000000',
    );

    const fee = amountSol * 0.01;

    return {
      tokenAddress,
      side: 'buy',
      inputAmount: amountSol,
      outputAmount: tokensOut,
      price: token.currentPrice,
      fee,
      priceImpact: 0.5, // Simplified
    };
  }

  /**
   * Get sell quote
   */
  async getSellQuote(tokenAddress: string, amountTokens: number): Promise<TradeQuote> {
    const token = await this.tokenRepository.findByAddress(tokenAddress);
    if (!token) {
      throw new BadRequestException(`Token ${tokenAddress} not found`);
    }

    const solOut = this.blockchainService.calculateSellAmount(
      amountTokens,
      token.currentPrice,
      token.totalSupply,
      '1000000000',
    );

    const fee = solOut * 0.01;

    return {
      tokenAddress,
      side: 'sell',
      inputAmount: amountTokens,
      outputAmount: solOut,
      price: token.currentPrice,
      fee,
      priceImpact: 0.5,
    };
  }

  /**
   * Get trade history for a token
   */
  async getTokenTrades(tokenAddress: string, limit: number = 50): Promise<Trade[]> {
    return this.tradeRepository.findByToken(tokenAddress, limit);
  }

  /**
   * Get trade history for a trader
   */
  async getTraderHistory(trader: string, limit: number = 50): Promise<Trade[]> {
    return this.tradeRepository.findByTrader(trader, limit);
  }

  /**
   * Get recent trades across all tokens
   */
  async getRecentTrades(limit: number = 50): Promise<Trade[]> {
    return this.tradeRepository.findRecent(limit);
  }
}
