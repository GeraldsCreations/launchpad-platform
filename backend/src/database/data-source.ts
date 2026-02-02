import { DataSource } from 'typeorm';
import { Token } from './entities/token.entity';
import { Trade } from './entities/trade.entity';
import { Holder } from './entities/holder.entity';
import { User } from './entities/user.entity';
import { PlatformStats } from './entities/platform-stats.entity';
import * as dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Parse DATABASE_URL if provided, otherwise use individual vars
let dbConfig: any = {
  type: 'postgres',
  entities: [Token, Trade, Holder, User, PlatformStats],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

if (process.env.DATABASE_URL) {
  dbConfig.url = process.env.DATABASE_URL;
} else {
  dbConfig.host = process.env.DATABASE_HOST || 'localhost';
  dbConfig.port = parseInt(process.env.DATABASE_PORT || '5432', 10);
  dbConfig.username = process.env.DATABASE_USER || 'launchpad';
  dbConfig.password = process.env.DATABASE_PASSWORD || 'launchpad_dev_pass';
  dbConfig.database = process.env.DATABASE_NAME || 'launchpad';
}

export const AppDataSource = new DataSource(dbConfig);
