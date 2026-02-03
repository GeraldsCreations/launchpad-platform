import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WebsocketModule } from '../websocket/websocket.module';

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
import { SolPriceService } from './services/sol-price.service';
import { FeeCollectionService } from './services/fee-collection.service';
import { FeeCollectionScheduler } from './services/fee-collection.scheduler';
import { TransactionBuilderService } from './services/transaction-builder.service';
import { LpManagementService } from './services/lp-management.service';
import { AutoPoolCreationService } from './services/auto-pool-creation.service';
import { DbcService } from './services/dbc.service';

// Controllers (removed duplicates and unused endpoints)
// Removed: TokensController (duplicate - use /v1/tokens in public-api)
// Removed: TradingController (duplicate - use /v1/trade in public-api)
// Removed: TransactionBuilderController (unused)
// Removed: LpManagementController (automated via services)
// Removed: RewardsController (managed via services)
import { PoolsController } from './controllers/pools.controller';
import { SolPriceController } from './controllers/sol-price.controller';
import { DbcController } from './controllers/dbc.controller';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    WebsocketModule, // Import WebSocket for SOL price broadcasting
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
    // Keep only non-duplicate, actively used endpoints
    PoolsController,      // Pool stats and info
    SolPriceController,   // SOL price oracle
    DbcController,        // DBC configuration for token launches
  ],
  providers: [
    MeteoraService,
    PoolCreationService,
    TradingService,
    PriceOracleService,
    SolPriceService,
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
    SolPriceService,
    FeeCollectionService,
  ],
})
export class MeteoraApiModule {}
