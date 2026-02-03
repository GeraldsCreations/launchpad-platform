import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WebsocketModule } from '../websocket/websocket.module';

// Entities
import { MeteoraPool } from './entities/meteora-pool.entity';
import { MeteoraTransaction } from './entities/meteora-transaction.entity';
import { LpPosition } from './entities/lp-position.entity';
import { LpWithdrawal } from './entities/lp-withdrawal.entity';
import { PlatformConfig } from '../database/entities/platform-config.entity';

// Services
import { MeteoraService } from './services/meteora.service';
import { PoolCreationService } from './services/pool-creation.service';
import { TradingService } from './services/trading.service';
import { PriceOracleService } from './services/price-oracle.service';
import { SolPriceService } from './services/sol-price.service';
import { TransactionBuilderService } from './services/transaction-builder.service';
import { LpManagementService } from './services/lp-management.service';
import { AutoPoolCreationService } from './services/auto-pool-creation.service';
import { DbcService } from './services/dbc.service';
import { MetadataUploadService } from './services/metadata-upload.service';

// Controllers
// Only SolPriceController remains - provides SOL/USD price to frontend
import { SolPriceController } from './controllers/sol-price.controller';
import { AdminDbcController } from './controllers/admin-dbc.controller';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    WebsocketModule, // Import WebSocket for SOL price broadcasting
    TypeOrmModule.forFeature([
      MeteoraPool,
      MeteoraTransaction,
      LpPosition,
      LpWithdrawal,
      PlatformConfig,
    ]),
  ],
  controllers: [
    SolPriceController,   // SOL/USD price oracle (used by frontend)
    AdminDbcController,   // Admin endpoint for config creation
  ],
  providers: [
    MeteoraService,
    PoolCreationService,
    TradingService,
    PriceOracleService,
    SolPriceService,
    TransactionBuilderService,
    LpManagementService,
    AutoPoolCreationService,
    DbcService,
    MetadataUploadService,
  ],
  exports: [
    MeteoraService,
    PoolCreationService,
    TradingService,
    PriceOracleService,
    SolPriceService,
    DbcService, // Export for use in PublicApiModule
  ],
})
export class MeteoraApiModule {}
