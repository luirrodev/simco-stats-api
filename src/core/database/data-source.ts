import { DataSource } from 'typeorm';
import buildDatabaseUrlFromConfig from '@core/common/utils/database-url.util';
import { envOrDefault } from '@core/common/utils/environment.util';

const isComputed =
  process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'stage';

// Configuración de base de datos
export const createDatabaseConfig = () => ({
  url: envOrDefault(process.env.DATABASE_URL, ''),
  host: envOrDefault(process.env.DB_HOST, '127.0.0.1'),
  port: parseInt(envOrDefault(process.env.DB_PORT, '5432'), 10),
  username: envOrDefault(process.env.DB_USERNAME, 'postgres'),
  password: envOrDefault(process.env.DB_PASSWORD, 'my_secret_password'),
  database: envOrDefault(process.env.DB_DATABASE, 'my_database'),
});

const dbConfig = createDatabaseConfig();

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
