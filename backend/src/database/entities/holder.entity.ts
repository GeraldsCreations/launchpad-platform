import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Token } from './token.entity';

@Entity('holders')
@Index(['tokenAddress'])
@Index(['wallet'])
@Unique(['tokenAddress', 'wallet'])
export class Holder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 44 })
  tokenAddress: string;

  @Column({ length: 44 })
  wallet: string;

  @Column('bigint')
  balance: string;

  @CreateDateColumn()
  firstAcquiredAt: Date;

  @UpdateDateColumn()
  lastUpdatedAt: Date;

  @ManyToOne(() => Token, (token) => token.holders)
  @JoinColumn({ name: 'tokenAddress' })
  token: Token;
}
