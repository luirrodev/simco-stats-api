import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'simcompanies_sessions' })
export class SimCompaniesSession {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ name: 'encrypted_cookie', type: 'text' })
  encryptedCookie!: string;

  @Column({ name: 'encryption_iv', type: 'varchar', length: 24 })
  encryptionIv!: string;

  @Column({ name: 'encryption_tag', type: 'varchar', length: 24 })
  encryptionTag!: string;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
