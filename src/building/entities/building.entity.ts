import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

import { RestaurantStatEntity } from '../../restaurant-stats/entities/restaurant-stat.entity';
import { SaleOrderEntity } from '../../sales-orders-stats/entities/sale-order.entity';
import { Exclude } from 'class-transformer';

@Entity('buildings')
export class BuildingEntity {
  @PrimaryColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ type: 'char', nullable: true })
  kind?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category?: string;

  @Column({ type: 'int', nullable: true })
  cost?: number;

  @Exclude()
  @UpdateDateColumn()
  updatedAt?: Date;

  @OneToMany(
    () => RestaurantStatEntity,
    (restaurantStat) => restaurantStat.building,
  )
  restaurantStats?: RestaurantStatEntity[];

  @OneToMany(() => SaleOrderEntity, (saleOrder) => saleOrder.building)
  saleOrdersStats?: SaleOrderEntity[];
}
