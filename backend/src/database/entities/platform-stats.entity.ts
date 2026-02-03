import { Entity, Column, PrimaryGeneratedColumn, Index, Unique } from 'typeorm';

@Entity('platform_stats')
@Unique(['date'])
export class PlatformStats {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('date')
  @Index()
  date: Date;

  @Column('int', { default: 0 })
  totalTokens: number;

  @Column('int', { default: 0 })
  totalTrades: number;

  @Column('decimal', { 
    precision: 18, 
    scale: 9, 
    default: 0,
    transformer: {
      from: (value: string) => parseFloat(value),
      to: (value: number) => value,
    }
  })
  totalVolume: number;

  @Column('decimal', { 
    precision: 18, 
    scale: 9, 
    default: 0,
    transformer: {
      from: (value: string) => parseFloat(value),
      to: (value: number) => value,
    }
  })
  totalFees: number;

  @Column('int', { default: 0 })
  activeUsers: number;

  @Column('int', { default: 0 })
  newTokens: number;

  @Column('int', { default: 0 })
  graduatedTokens: number;
}
