import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TradingService, TradeQuote, TradeResult } from '../services/trading.service';
import { BuyTokenDto } from '../dto/buy-token.dto';
import { SellTokenDto } from '../dto/sell-token.dto';
import { Trade } from '../../database/entities/trade.entity';

@ApiTags('trading')
@Controller('trade')
@UseGuards(ThrottlerGuard)
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  @Post('buy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buy tokens with SOL' })
  @ApiResponse({ status: 200, description: 'Trade executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or slippage exceeded' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async buyToken(@Body() buyTokenDto: BuyTokenDto): Promise<TradeResult> {
    return this.tradingService.buyToken(buyTokenDto);
  }

  @Post('sell')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sell tokens for SOL' })
  @ApiResponse({ status: 200, description: 'Trade executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or slippage exceeded' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sellToken(@Body() sellTokenDto: SellTokenDto): Promise<TradeResult> {
    return this.tradingService.sellToken(sellTokenDto);
  }

  @Get('quote/buy')
  @ApiOperation({ summary: 'Get buy quote' })
  @ApiQuery({ name: 'token', required: true, type: String })
  @ApiQuery({ name: 'amount', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Quote calculated' })
  async getBuyQuote(
    @Query('token') tokenAddress: string,
    @Query('amount') amount: number,
  ): Promise<TradeQuote> {
    return this.tradingService.getBuyQuote(tokenAddress, amount);
  }

  @Get('quote/sell')
  @ApiOperation({ summary: 'Get sell quote' })
  @ApiQuery({ name: 'token', required: true, type: String })
  @ApiQuery({ name: 'amount', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Quote calculated' })
  async getSellQuote(
    @Query('token') tokenAddress: string,
    @Query('amount') amount: number,
  ): Promise<TradeQuote> {
    return this.tradingService.getSellQuote(tokenAddress, amount);
  }

  @Get('history/:tokenAddress')
  @ApiOperation({ summary: 'Get trade history for a token' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, description: 'Trade history' })
  async getTokenHistory(
    @Param('tokenAddress') tokenAddress: string,
    @Query('limit') limit?: number,
  ): Promise<Trade[]> {
    return this.tradingService.getTokenTrades(tokenAddress, limit || 50);
  }

  @Get('user/:wallet')
  @ApiOperation({ summary: 'Get trade history for a user' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, description: 'User trade history' })
  async getUserHistory(
    @Param('wallet') wallet: string,
    @Query('limit') limit?: number,
  ): Promise<Trade[]> {
    return this.tradingService.getTraderHistory(wallet, limit || 50);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent trades across all tokens' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, description: 'Recent trades' })
  async getRecentTrades(@Query('limit') limit?: number): Promise<Trade[]> {
    return this.tradingService.getRecentTrades(limit || 50);
  }
}
