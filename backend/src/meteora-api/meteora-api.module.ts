import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { MeteoraPool } from './entities/meteora-pool.entity';
import { MeteoraTransaction } from './entities/meteora-transaction.entity';
import { FeeClaimerVault } from '../database/entities/fee-claimer-vault.entity';
import { BotCreatorReward } from '../database/entities/bot-creator-reward.entity';

// Services
import { MeteoraService } from './services/meteora.service';
import { PoolCreationService } from './services/pool-creation.service';
import { TradingService } from './services/trading.service';
import { PriceOracleService } from './services/price-oracle.service';
import { FeeCollectionService } from './services/fee-collection.service';
import { FeeCollectionScheduler } from './services/fee-collection.scheduler';

// Controllers
import { TokensController } from './controllers/tokens.controller';
import { TradingController } from './controllers/trading.controller';
import { PoolsController } from './controllers/pools.controller';
import { RewardsController } from './controllers/rewards.controller';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      MeteoraPool,
      MeteoraTransaction,
      FeeClaimerVault,
      BotCreatorReward,
    ]),
  ],
  controllers: [
    TokensController,
    TradingController,
    PoolsController,
    RewardsController,
  ],
  providers: [
    MeteoraService,
    PoolCreationService,
    TradingService,
    PriceOracleService,
    FeeCollectionService,
    FeeCollectionScheduler,
  ],
  exports: [
    MeteoraService,
    PoolCreationService,
    TradingService,
    PriceOracleService,
    FeeCollectionService,
  ],
})
export class MeteoraApiModule {}
