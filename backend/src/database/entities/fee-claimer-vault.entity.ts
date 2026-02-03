import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MeteoraPool } from '../../meteora-api/entities/meteora-pool.entity';

@Entity('fee_claimer_vaults')
@Index(['poolAddress'])
@Index(['tokenAddress'])
@Index(['lastClaimAt'])
export class FeeClaimerVault {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 44, unique: true })
  poolAddress: string;

  @Column({ length: 44 })
  tokenAddress: string;

  @Column({ length: 44 })
  feeClaimerPubkey: string; // On-chain vault address

  @Column('decimal', { 
    precision: 18, 
    scale: 9, 
    default: 0,
    transformer: {
      from: (value: string) => parseFloat(value),
      to: (value: number) => value,
    }
  })
  totalFeesCollected: number; // Lifetime fees in SOL

  @Column('decimal', { 
    precision: 18, 
    scale: 9, 
    default: 0,
    transformer: {
      from: (value: string) => parseFloat(value),
      to: (value: number) => value,
    }
  })
  claimedFees: number; // Already claimed

  @Column('decimal', { 
    precision: 18, 
    scale: 9, 
    default: 0,
    transformer: {
      from: (value: string) => parseFloat(value),
      to: (value: number) => value,
    }
  })
  unclaimedFees: number; // Available to claim

  @Column({ nullable: true })
  lastClaimAt: Date;

  @Column('int', { default: 0 })
  claimCount: number; // Number of times claimed

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => MeteoraPool, { nullable: true })
  @JoinColumn({ name: 'poolAddress', referencedColumnName: 'poolAddress' })
  pool: MeteoraPool;
}
