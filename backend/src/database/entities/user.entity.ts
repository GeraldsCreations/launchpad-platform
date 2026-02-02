import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn({ length: 44 })
  wallet: string;

  @Column('varchar', { length: 64, unique: true, nullable: true })
  apiKey: string | null;

  @Column({ length: 20, default: 'free' })
  apiTier: string; // 'free', 'starter', 'pro'

  @Column('int', { default: 100 })
  rateLimit: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastActiveAt: Date;
}
