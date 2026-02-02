import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { IndexerModule } from '../indexer/indexer.module';
import { AdminController } from './controllers/admin.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { AdminService } from './services/admin.service';
import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [DatabaseModule, WebsocketModule, IndexerModule],
  controllers: [AdminController, AnalyticsController],
  providers: [AdminService, AnalyticsService],
  exports: [AdminService, AnalyticsService],
})
export class PrivateApiModule {}
