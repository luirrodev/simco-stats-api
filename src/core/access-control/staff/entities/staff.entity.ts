import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import { User } from '../../users/entities/user.entity';

@Entity({
  name: 'staff',
})
export class Staff {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId!: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    name: 'employee_code',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  employeeCode!: string | null;

  @Column({
    name: 'department',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  department!: string | null;
}
