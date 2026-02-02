import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('lp_positions')
export class LpPosition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'pool_address', length: 44 })
  poolAddress: string;

  @Column({ name: 'token_address', length: 44 })
  tokenAddress: string;

  @Column({ name: 'bot_creator_id', nullable: true })
  botCreatorId?: string;

  @Column({ name: 'bot_wallet', length: 44 })
  botWallet: string;

  @Column({ name: 'position_pubkey', length: 44 })
  positionPubkey: string;

  @Column({ name: 'initial_liquidity_sol', type: 'decimal', precision: 18, scale: 9 })
  initialLiquiditySol: number;

  @Column({ name: 'current_liquidity_sol', type: 'decimal', precision: 18, scale: 9 })
  currentLiquiditySol: number;

  @Column({ name: 'fees_collected_sol', type: 'decimal', precision: 18, scale: 9, default: 0 })
  feesCollectedSol: number;

  @Column({ name: 'withdrawn_sol', type: 'decimal', precision: 18, scale: 9, default: 0 })
  withdrawnSol: number;

  @Column({ name: 'platform_fee_collected', type: 'decimal', precision: 18, scale: 9, default: 0 })
  platformFeeCollected: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
