import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Token } from './entities/token.entity';
import { Trade } from './entities/trade.entity';
import { Holder } from './entities/holder.entity';
import { User } from './entities/user.entity';
import { PlatformStats } from './entities/platform-stats.entity';
import { MeteoraPool } from '../meteora-api/entities/meteora-pool.entity';
import { MeteoraTransaction } from '../meteora-api/entities/meteora-transaction.entity';
import { TokenRepository } from './repositories/token.repository';
import { TradeRepository } from './repositories/trade.repository';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = {
          type: 'postgres' as const,
          host: configService.get('DATABASE_HOST'),
          port: configService.get('DATABASE_PORT'),
          username: configService.get('DATABASE_USER'),
          password: configService.get('DATABASE_PASSWORD'),
          database: configService.get('DATABASE_NAME'),
          entities: [Token, Trade, Holder, User, PlatformStats, MeteoraPool, MeteoraTransaction],
          synchronize: configService.get('NODE_ENV') === 'development',
          logging: configService.get('NODE_ENV') === 'development',
          ssl: configService.get('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        };

        // Log connection details in development
        if (configService.get('NODE_ENV') === 'development') {
          console.log('🔍 [DatabaseModule] Connection config:', {
            host: dbConfig.host,
            port: dbConfig.port,
            username: dbConfig.username,
            database: dbConfig.database,
            password: dbConfig.password ? '***' + dbConfig.password.slice(-4) : 'NOT SET',
            ssl: dbConfig.ssl,
          });
        }

        return dbConfig;
      },
    }),
    TypeOrmModule.forFeature([Token, Trade, Holder, User, PlatformStats, MeteoraPool, MeteoraTransaction]),
  ],
  providers: [TokenRepository, TradeRepository],
  exports: [TypeOrmModule, TokenRepository, TradeRepository],
})
export class DatabaseModule {}
