import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('bot_creator_rewards')
@Index(['botId'])
@Index(['botWallet'])
@Index(['poolAddress'])
@Index(['claimed'])
export class BotCreatorReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  botId: string; // OpenClaw agent ID

  @Column({ length: 44 })
  botWallet: string; // Bot's Solana wallet

  @Column({ length: 44 })
  poolAddress: string;

  @Column({ length: 44 })
  tokenAddress: string;

  @Column('decimal', { precision: 18, scale: 9, default: 0 })
  totalFeesEarned: number; // Cumulative SOL earned

  @Column('decimal', { precision: 18, scale: 9, default: 0 })
  claimedAmount: number; // Already paid out

  @Column('decimal', { precision: 18, scale: 9, default: 0 })
  unclaimedAmount: number; // Pending payout

  @Column('decimal', { precision: 5, scale: 2, default: 50 })
  revenueSharePercent: number; // Default 50%

  @Column('boolean', { default: false })
  claimed: boolean;

  @Column({ nullable: true })
  lastClaimAt: Date;

  @Column({ nullable: true, length: 88 })
  lastClaimSignature: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
