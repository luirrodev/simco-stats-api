import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();
const isProd = process.env.NODE_ENV === 'prod';

export default new DataSource({
  type: 'postgres',
  url: configService.get('DATABASE_URL'),
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: isProd,
});
