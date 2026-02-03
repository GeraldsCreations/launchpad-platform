import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../database/database.module';
import { MeteoraApiModule } from '../meteora-api/meteora-api.module';
import { TokensController } from './controllers/tokens.controller';
import { TradingController } from './controllers/trading.controller';
import { RewardsController } from './controllers/rewards.controller';
import { TokenService } from './services/token.service';
import { TradingService } from './services/trading.service';
import { RewardsService } from './services/rewards.service';
import { FeeCollectionScheduler } from './services/fee-collection.scheduler';
import { BlockchainService } from './services/blockchain.service';
import { MeteoraPool } from '../meteora-api/entities/meteora-pool.entity';

@Module({
  imports: [
    DatabaseModule, 
    MeteoraApiModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([MeteoraPool]),
  ],
  controllers: [TokensController, TradingController, RewardsController],
  providers: [
    TokenService, 
    TradingService, 
    RewardsService, 
    FeeCollectionScheduler,
    BlockchainService,
  ],
  exports: [TokenService, TradingService, RewardsService, BlockchainService],
})
export class PublicApiModule {}
