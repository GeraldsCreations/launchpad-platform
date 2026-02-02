import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Token } from './entities/token.entity';
import { Trade } from './entities/trade.entity';
import { Holder } from './entities/holder.entity';
import { User } from './entities/user.entity';
import { PlatformStats } from './entities/platform-stats.entity';
import { TokenRepository } from './repositories/token.repository';
import { TradeRepository } from './repositories/trade.repository';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [Token, Trade, Holder, User, PlatformStats],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([Token, Trade, Holder, User, PlatformStats]),
  ],
  providers: [TokenRepository, TradeRepository],
  exports: [TypeOrmModule, TokenRepository, TradeRepository],
})
export class DatabaseModule {}
