import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

// interface SaladBarItem {
//   kind: number;
//   serving: string;
// }

// interface MainItem {
//   kind: number;
//   serving: string;
// }

// interface DrinkItem {
//   kind: number;
//   serving: string;
// }

// interface RestaurantProperties {
//   id: number;
//   isLuxury: boolean;
//   rating: number;
//   occupancy: number;
//   goodService: boolean;
//   menuPrice: number;
//   saladBar: SaladBarItem[];
//   mains: MainItem[];
//   drinks: DrinkItem[];
//   keepOpen: boolean;
// }

@Entity('buildings')
export class BuildingEntity {
  @PrimaryColumn()
  id: number;

  @Column({ type: 'char' })
  kind: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int' })
  cost: number;

  @Column({ type: 'int' })
  size: number;

  @UpdateDateColumn()
  updatedAt: Date;

  // @Column({ type: 'jsonb' })
  // restaurantProperties: RestaurantProperties;
}
