import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import { MeteoraPool } from './entities/meteora-pool.entity';
import { MeteoraTransaction } from './entities/meteora-transaction.entity';

// Services
import { MeteoraService } from './services/meteora.service';
import { PoolCreationService } from './services/pool-creation.service';
import { TradingService } from './services/trading.service';
import { PriceOracleService } from './services/price-oracle.service';

// Controllers
import { TokensController } from './controllers/tokens.controller';
import { TradingController } from './controllers/trading.controller';
import { PoolsController } from './controllers/pools.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([MeteoraPool, MeteoraTransaction]),
  ],
  controllers: [TokensController, TradingController, PoolsController],
  providers: [
    MeteoraService,
    PoolCreationService,
    TradingService,
    PriceOracleService,
  ],
  exports: [
    MeteoraService,
    PoolCreationService,
    TradingService,
    PriceOracleService,
  ],
})
export class MeteoraApiModule {}
