import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BuildingEntity } from '../../building/entities/building.entity';
import { Exclude } from 'class-transformer';

@Entity('sale_orders')
export class SaleOrderEntity {
  @PrimaryColumn()
  id: number;

  @ManyToOne(() => BuildingEntity)
  @JoinColumn({ name: 'building_id' })
  building: BuildingEntity;

  @Column({ type: 'timestamp with time zone' })
  datetime: Date;

  @Column({ type: 'int' })
  searchCost: number;

  @Column({ type: 'jsonb', default: '[]' })
  resources: Resource[];

  // Campos que aparecen solo cuando la orden está resuelta
  @Column({ type: 'decimal', precision: 16, scale: 13, nullable: true })
  qualityBonus?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  speedBonus?: number;

  // Campo para indicar si la orden ya fue resuelta
  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @Exclude()
  @CreateDateColumn()
  createdAt: Date;

  @Exclude()
  @UpdateDateColumn()
  updatedAt: Date;
}

export interface Resource {
  amount: number;
  price: number;
  kind: number;
}
