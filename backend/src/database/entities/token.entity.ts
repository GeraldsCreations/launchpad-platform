import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Trade } from './trade.entity';
import { Holder } from './holder.entity';

@Entity('tokens')
@Index(['creator'])
@Index(['createdAt'])
@Index(['marketCap'])
@Index(['graduated'])
export class Token {
  @PrimaryColumn({ length: 44 })
  address: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 10 })
  symbol: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  imageUrl: string;

  @Column({ length: 44 })
  creator: string;

  @Column({ length: 20, nullable: true })
  creatorType: string; // 'human', 'clawdbot', 'agent'

  @Column({ length: 44 })
  bondingCurve: string;

  @Column('decimal', { 
    precision: 18, 
    scale: 9, 
    nullable: true,
    transformer: {
      from: (value: string | null) => value ? parseFloat(value) : null,
      to: (value: number | null) => value,
    }
  })
  currentPrice: number;

  @Column('decimal', { 
    precision: 18, 
    scale: 9, 
    nullable: true,
    transformer: {
      from: (value: string | null) => value ? parseFloat(value) : null,
      to: (value: number | null) => value,
    }
  })
  marketCap: number;

  @Column('bigint', { nullable: true })
  totalSupply: string;

  @Column('int', { default: 0 })
  holderCount: number;

  @Column('decimal', { 
    precision: 18, 
    scale: 9, 
    default: 0,
    transformer: {
      from: (value: string) => parseFloat(value),
      to: (value: number) => value,
    }
  })
  volume24h: number;

  @Column('boolean', { default: false })
  graduated: boolean;

  @Column('timestamp', { nullable: true })
  graduatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Trade, (trade) => trade.token)
  trades: Trade[];

  @OneToMany(() => Holder, (holder) => holder.token)
  holders: Holder[];
}
