import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MeteoraApiModule } from '../meteora-api/meteora-api.module';
import { TokensController } from './controllers/tokens.controller';
import { TradingController } from './controllers/trading.controller';
import { TokenService } from './services/token.service';
import { TradingService } from './services/trading.service';
import { BlockchainService } from './services/blockchain.service';

@Module({
  imports: [DatabaseModule, MeteoraApiModule],
  controllers: [TokensController, TradingController],
  providers: [TokenService, TradingService, BlockchainService],
  exports: [TokenService, TradingService, BlockchainService],
})
export class PublicApiModule {}
