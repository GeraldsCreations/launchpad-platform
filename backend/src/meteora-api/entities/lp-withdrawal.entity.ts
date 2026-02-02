import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { LpPosition } from './lp-position.entity';

@Entity('lp_withdrawals')
export class LpWithdrawal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'position_id' })
  positionId: number;

  @ManyToOne(() => LpPosition)
  @JoinColumn({ name: 'position_id' })
  position: LpPosition;

  @Column({ name: 'bot_wallet', length: 44 })
  botWallet: string;

  @Column({ name: 'requested_percent', type: 'decimal', precision: 5, scale: 2 })
  requestedPercent: number;

  @Column({ name: 'withdrawn_amount_sol', type: 'decimal', precision: 18, scale: 9 })
  withdrawnAmountSol: number;

  @Column({ name: 'platform_fee_sol', type: 'decimal', precision: 18, scale: 9 })
  platformFeeSol: number;

  @Column({ name: 'net_amount_sol', type: 'decimal', precision: 18, scale: 9 })
  netAmountSol: number;

  @Column({ name: 'signature', length: 88 })
  signature: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
