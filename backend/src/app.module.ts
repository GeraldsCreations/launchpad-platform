import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { PublicApiModule } from './public-api/public-api.module';
import { PrivateApiModule } from './private-api/private-api.module';
import { WebsocketModule } from './websocket/websocket.module';
import { IndexerModule } from './indexer/indexer.module';
import { MeteoraApiModule } from './meteora-api/meteora-api.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      },
    ]),

    // Scheduling for periodic tasks
    ScheduleModule.forRoot(),

    // Database
    DatabaseModule,

    // Application modules
    PublicApiModule,
    PrivateApiModule,
    WebsocketModule,
    IndexerModule,
    MeteoraApiModule,
  ],
})
export class AppModule {}
