import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * One row per logged-in device. The refresh token is `<id>.<secret>`; only a SHA-256 of the
 * secret is stored, and it is rotated on every refresh.
 */
@Entity('sessions')
@Index('IDX_sessions_user_active', ['userId', 'revokedAt'])
export class Session {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  // Same service, so a real FK: deleting a user removes their sessions.
  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash: string;

  // "Trust this device": 7-day cookie. Otherwise a browser-session cookie with a shorter server cap.
  @Column({ default: false })
  persistent: boolean;

  // Absolute: rotation never extends it, so a trusted device must log in again after 7 days.
  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'datetime', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'last_used_at', type: 'datetime', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
