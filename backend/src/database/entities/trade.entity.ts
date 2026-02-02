import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Token } from './token.entity';

@Entity('trades')
@Index(['tokenAddress'])
@Index(['trader'])
@Index(['timestamp'])
export class Trade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 88, unique: true })
  transactionSignature: string;

  @Column({ length: 44 })
  tokenAddress: string;

  @Column({ length: 44 })
  trader: string;

  @Column({ length: 4 })
  side: string; // 'buy' or 'sell'

  @Column('decimal', { precision: 18, scale: 9 })
  amountSol: number;

  @Column('bigint')
  amountTokens: string;

  @Column('decimal', { precision: 18, scale: 9 })
  price: number;

  @Column('decimal', { precision: 18, scale: 9 })
  fee: number;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => Token, (token) => token.trades)
  @JoinColumn({ name: 'tokenAddress' })
  token: Token;
}
