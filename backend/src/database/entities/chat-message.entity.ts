import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('chat_messages')
@Index(['tokenAddress', 'createdAt'])
@Index(['walletAddress', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 44 })
  @Index()
  walletAddress: string;

  @Column({ type: 'varchar', length: 44, nullable: true })
  @Index()
  tokenAddress: string | null; // null = global chat

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'boolean', default: false })
  isBot: boolean;

  @Column({ type: 'uuid', nullable: true })
  replyToId: string | null;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  editedAt: Date | null;
}
