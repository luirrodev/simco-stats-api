import { DataSource } from 'typeorm';
import buildDatabaseUrlFromConfig from '@core/common/utils/database-url.util';

const isComputed =
  process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'stage';

// Configuración de base de datos
const dbConfig = {
  url: process.env.DATABASE_URL || '',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'my_secret_password',
  database: process.env.DB_DATABASE || 'my_database',
};

const databaseUrl = buildDatabaseUrlFromConfig(dbConfig);

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  synchronize: false,
  logging: !isComputed,
  entities: [isComputed ? 'dist/**/*.entity.js' : 'src/**/*.entity.ts'],
  migrations: [
    isComputed
      ? 'dist/core/database/migrations/*.js'
      : 'src/core/database/migrations/*.ts',
  ],
  migrationsTableName: 'migrations',
  ssl: process.env.DB_SSL === 'true',
});
