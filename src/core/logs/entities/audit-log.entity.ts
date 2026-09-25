import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { AuditOperation } from '../types/log.types';

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'uuid', name: 'request_id', nullable: true })
  @Index()
  requestId!: string | null;

  @Column({ type: 'varchar', length: 100, name: 'entity_name' })
  @Index()
  entityName!: string;

  @Column({ type: 'varchar', length: 100, name: 'entity_id' })
  entityId!: string;

  @Column({ type: 'enum', enum: AuditOperation })
  @Index()
  operation!: AuditOperation;

  @Column({ type: 'int', nullable: true, name: 'user_id' })
  @Index()
  userId!: number | null;

  @Column({ type: 'jsonb' })
  changes!: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'logged_at' })
  @Index()
  loggedAt!: Date;
}
