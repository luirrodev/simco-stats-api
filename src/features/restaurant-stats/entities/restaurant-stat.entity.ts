import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { BuildingEntity } from '../../building/entities/building.entity';

const numericTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | null): number | null =>
    value === null ? null : Number(value),
};

@Entity({ name: 'restaurant_stats' })
@Index(['restaurantId', 'datetime'])
export class RestaurantStatEntity {
  @PrimaryColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'restaurant_id', type: 'int' })
  @Index()
  restaurantId!: number;

  @Column({ name: 'restaurant_name', type: 'varchar', length: 100 })
  restaurantName!: string;

  @ManyToOne(() => BuildingEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'building_id' })
  building!: BuildingEntity | null;

  @Column({ type: 'timestamptz' })
  datetime!: Date;

  @Column({
    type: 'numeric',
    precision: 16,
    scale: 12,
    transformer: numericTransformer,
  })
  rating!: number;

  @Column({ type: 'int' })
  cogs!: number;

  @Column({ type: 'int' })
  wages!: number;

  @Column({ type: 'boolean', default: false })
  resolved!: boolean;

  @Column({
    name: 'menu_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  menuPrice!: number;

  @Column({ name: 'building_size', type: 'int' })
  buildingSize!: number;

  @Column({ name: 'building_is_luxury', type: 'boolean' })
  buildingIsLuxury!: boolean;

  @Column({
    type: 'numeric',
    precision: 16,
    scale: 12,
    nullable: true,
    transformer: numericTransformer,
  })
  occupancy!: number | null;

  @Column({ type: 'int', nullable: true })
  revenue!: number | null;

  @Column({
    name: 'new_rating',
    type: 'numeric',
    precision: 16,
    scale: 12,
    nullable: true,
    transformer: numericTransformer,
  })
  newRating!: number | null;

  @Column({ type: 'text', nullable: true })
  review!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
