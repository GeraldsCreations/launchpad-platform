import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MeteoraPool } from './meteora-pool.entity';

export enum TransactionType {
  CREATE = 'CREATE',
  BUY = 'BUY',
  SELL = 'SELL',
  ADD_LIQUIDITY = 'ADD_LIQUIDITY',
  REMOVE_LIQUIDITY = 'REMOVE_LIQUIDITY',
}

@Entity('meteora_transactions')
@Index(['poolAddress'])
@Index(['wallet'])
@Index(['txType'])
@Index(['createdAt'])
export class MeteoraTransaction {
  @PrimaryColumn({ length: 88 })
  signature: string;

  @Column({ length: 44 })
  poolAddress: string;

  @Column({ length: 44 })
  wallet: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  txType: TransactionType;

  @Column('decimal', { precision: 18, scale: 9 })
  tokenAmount: number;

  @Column('decimal', { precision: 18, scale: 9 })
  solAmount: number;

  @Column('decimal', { precision: 18, scale: 9, nullable: true })
  price: number;

  @Column('decimal', { precision: 18, scale: 9, default: 0 })
  platformFee: number;

  @Column('boolean', { default: true })
  success: boolean;

  @Column('text', { nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => MeteoraPool, (pool) => pool.transactions)
  @JoinColumn({ name: 'poolAddress' })
  pool: MeteoraPool;
}
