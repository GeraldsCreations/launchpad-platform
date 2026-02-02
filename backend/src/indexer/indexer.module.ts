import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { PublicApiModule } from '../public-api/public-api.module';
import { IndexerService } from './indexer.service';

@Module({
  imports: [DatabaseModule, WebsocketModule, PublicApiModule],
  providers: [IndexerService],
  exports: [IndexerService],
})
export class IndexerModule {}
