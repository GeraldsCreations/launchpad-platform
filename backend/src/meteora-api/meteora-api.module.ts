import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { MeteoraPool } from './entities/meteora-pool.entity';
import { MeteoraTransaction } from './entities/meteora-transaction.entity';
import { FeeClaimerVault } from '../database/entities/fee-claimer-vault.entity';
import { BotCreatorReward } from '../database/entities/bot-creator-reward.entity';
import { LpPosition } from './entities/lp-position.entity';
import { LpWithdrawal } from './entities/lp-withdrawal.entity';

// Services
import { MeteoraService } from './services/meteora.service';
import { PoolCreationService } from './services/pool-creation.service';
import { TradingService } from './services/trading.service';
import { PriceOracleService } from './services/price-oracle.service';
import { FeeCollectionService } from './services/fee-collection.service';
import { FeeCollectionScheduler } from './services/fee-collection.scheduler';
import { TransactionBuilderService } from './services/transaction-builder.service';
import { LpManagementService } from './services/lp-management.service';
import { AutoPoolCreationService } from './services/auto-pool-creation.service';
import { DbcService } from './services/dbc.service';

// Controllers
import { TokensController } from './controllers/tokens.controller';
import { TradingController } from './controllers/trading.controller';
import { PoolsController } from './controllers/pools.controller';
import { RewardsController } from './controllers/rewards.controller';
import { TransactionBuilderController } from './controllers/transaction-builder.controller';
import { LpManagementController } from './controllers/lp-management.controller';
import { DbcController } from './controllers/dbc.controller';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      MeteoraPool,
      MeteoraTransaction,
      FeeClaimerVault,
      BotCreatorReward,
      LpPosition,
      LpWithdrawal,
    ]),
  ],
  controllers: [
    TokensController,
    TradingController,
    PoolsController,
    RewardsController,
    TransactionBuilderController,
    LpManagementController,
    DbcController,
  ],
  providers: [
    MeteoraService,
    PoolCreationService,
    TradingService,
    PriceOracleService,
    FeeCollectionService,
    FeeCollectionScheduler,
    TransactionBuilderService,
    LpManagementService,
    AutoPoolCreationService,
    DbcService,
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
