import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tokens')
export class TokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  cookie: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
