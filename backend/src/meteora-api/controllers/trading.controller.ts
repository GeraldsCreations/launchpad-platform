import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TradingService } from '../services/trading.service';
import { BuyTokenDto, SellTokenDto, TradeResponseDto } from '../dto/trade.dto';

@ApiTags('Meteora Trading')
@Controller('api/v1/trade')
export class TradingController {
  constructor(private tradingService: TradingService) {}

  @Post('buy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buy tokens through Meteora pool' })
  @ApiResponse({
    status: 200,
    description: 'Tokens purchased successfully',
    type: TradeResponseDto,
  })
  async buyTokens(@Body() dto: BuyTokenDto): Promise<TradeResponseDto> {
    return await this.tradingService.buyTokens(dto);
  }

  @Post('sell')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sell tokens through Meteora pool' })
  @ApiResponse({
    status: 200,
    description: 'Tokens sold successfully',
    type: TradeResponseDto,
  })
  async sellTokens(@Body() dto: SellTokenDto): Promise<TradeResponseDto> {
    return await this.tradingService.sellTokens(dto);
  }
}
