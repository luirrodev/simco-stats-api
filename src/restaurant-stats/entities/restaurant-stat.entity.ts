import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('restaurant_stats')
export class RestaurantStatEntity {
  @PrimaryColumn()
  id: number;

  @Column({ type: 'timestamp with time zone' })
  datetime: Date;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  rating: number;

  @Column({ type: 'int' })
  cogs: number;

  @Column({ type: 'int' })
  wages: number;

  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  menuPrice: number;

  // Campos opcionales que aparecen cuando resolved = true
  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  occupancy?: number;

  @Column({ type: 'int', nullable: true })
  revenue?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  newRating?: number;

  @Column({ type: 'text', nullable: true })
  review?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
