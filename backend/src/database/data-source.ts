import { DataSource } from 'typeorm';
import { Token } from './entities/token.entity';
import { Trade } from './entities/trade.entity';
import { Holder } from './entities/holder.entity';
import { User } from './entities/user.entity';
import { PlatformStats } from './entities/platform-stats.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'launchpad',
  password: process.env.DATABASE_PASSWORD || 'launchpad_dev_pass',
  database: process.env.DATABASE_NAME || 'launchpad',
  entities: [Token, Trade, Holder, User, PlatformStats],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
