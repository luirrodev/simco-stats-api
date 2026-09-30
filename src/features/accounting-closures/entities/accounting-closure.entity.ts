import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RestaurantStatEntity } from '@features/restaurant-stats/entities/restaurant-stat.entity';

const numericTransformer = {
  to: (value: number): number => value,
  from: (value: string): number => Number(value),
};

@Entity({ name: 'cierres_contables' })
export class AccountingClosureEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart!: Date;

  @Index({ unique: true })
  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd!: Date;

  @CreateDateColumn({ name: 'executed_at', type: 'timestamptz' })
  executedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => RestaurantStatEntity, (stat) => stat.accountingClosure)
  restaurantStats!: RestaurantStatEntity[];

  @Column({ name: 'operating_restaurant_count', type: 'int' })
  operatingRestaurantCount!: number;

  @Column({ name: 'operating_level_count', type: 'int' })
  operatingLevelCount!: number;

  @Column({
    name: 'total_profit',
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
  })
  totalProfit!: number;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
  })
  pphl!: number;

  @Column({ name: 'excluded_restaurant_count', type: 'int' })
  excludedRestaurantCount!: number;
}
