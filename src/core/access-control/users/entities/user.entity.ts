import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

import { Role } from '../../roles/entities/role.entity';

export enum UserType {
  STAFF = 'staff',
  CUSTOMER = 'customer',
}

@Entity({
  name: 'users',
})
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  password!: string | null;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Column({ name: 'role_id', type: 'int' })
  roleId!: number;

  @Column({
    name: 'first_name',
    type: 'varchar',
    length: 255,
  })
  firstName!: string;

  @Column({
    name: 'second_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  secondName!: string | null;

  @Column({
    name: 'last_name',
    type: 'varchar',
    length: 255,
  })
  lastName!: string;

  @Column({
    name: 'second_last_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  secondLastName!: string | null;

  @Column({
    name: 'auth_provider',
    type: 'varchar',
    length: 50,
    default: 'local',
  })
  authProvider!: string;

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: UserType,
    default: UserType.CUSTOMER,
  })
  userType!: UserType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy!: User | null;

  @Exclude()
  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Exclude()
  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  @Exclude()
  @DeleteDateColumn({
    type: 'timestamptz',
    name: 'deleted_at',
    nullable: true,
  })
  deletedAt!: Date;
}
