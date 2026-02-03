import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('chat_bans')
@Index(['walletAddress', 'tokenAddress'])
export class ChatBan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 44 })
  @Index()
  walletAddress: string;

  @Column({ type: 'varchar', length: 44, nullable: true })
  @Index()
  tokenAddress: string | null; // null = global ban

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
