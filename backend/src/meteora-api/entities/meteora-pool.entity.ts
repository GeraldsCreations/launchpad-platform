import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { MeteoraTransaction } from './meteora-transaction.entity';

@Entity('meteora_pools')
@Index(['tokenAddress'])
@Index(['creator'])
@Index(['createdAt'])
export class MeteoraPool {
  @PrimaryColumn({ length: 44 })
  poolAddress: string;

  @Column({ length: 44 })
  tokenAddress: string;

  @Column({ length: 44 })
  baseTokenAddress: string; // Usually SOL/USDC

  @Column({ length: 255 })
  tokenName: string;

  @Column({ length: 10 })
  tokenSymbol: string;

  @Column({ length: 44 })
  creator: string;

  @Column('int')
  binStep: number;

  @Column('int')
  activeId: number;

  @Column('decimal', { precision: 18, scale: 9, nullable: true })
  currentPrice: number;

  @Column('decimal', { precision: 18, scale: 9, default: 0 })
  volume24h: number;

  @Column('decimal', { precision: 18, scale: 9, default: 0 })
  liquidity: number;

  @Column('decimal', { precision: 18, scale: 9, default: 0 })
  tvl: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  feeRate: number; // in basis points

  @Column('decimal', { precision: 18, scale: 9, default: 0 })
  platformFeesCollected: number;

  @Column('decimal', { precision: 18, scale: 9, default: 1 })
  launchFeeCollected: number; // 1 SOL launch fee

  @Column('boolean', { default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => MeteoraTransaction, (tx) => tx.pool)
  transactions: MeteoraTransaction[];
}
