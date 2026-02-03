import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../database/database.module';
import { MeteoraApiModule } from '../meteora-api/meteora-api.module';
import { TokensController } from './controllers/tokens.controller';
import { TradingController } from './controllers/trading.controller';
import { RewardsController } from './controllers/rewards.controller';
import { TokenService } from './services/token.service';
import { TradingService } from './services/trading.service';
import { RewardsService } from './services/rewards.service';
import { BlockchainService } from './services/blockchain.service';
import { BotCreatorReward } from '../database/entities/bot-creator-reward.entity';

@Module({
  imports: [
    DatabaseModule, 
    MeteoraApiModule,
    TypeOrmModule.forFeature([BotCreatorReward]),
  ],
  controllers: [TokensController, TradingController, RewardsController],
  providers: [TokenService, TradingService, RewardsService, BlockchainService],
  exports: [TokenService, TradingService, RewardsService, BlockchainService],
})
export class PublicApiModule {}
