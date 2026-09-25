/**
 * Construye el URL de conexión a PostgreSQL desde la configuración
 * Prioriza DATABASE_URL si está presente, de lo contrario construye desde parámetros individuales
 * @param dbConfig - Objeto de configuración de base de datos (tipicamente desde config.ts)
 * @returns URL de conexión completo para PostgreSQL
 */
export default function buildDatabaseUrlFromConfig(dbConfig: {
  url: string;
  host: string;
  port: number | string;
  username: string;
  password: string;
  database: string;
}): string {
  if (dbConfig.url && dbConfig.url.trim() !== '') {
    return dbConfig.url;
  }

  if (
    !dbConfig.host ||
    !dbConfig.username ||
    !dbConfig.password ||
    !dbConfig.database
  ) {
    throw new Error(
      'Database URL configuration is incomplete. Required: host, username, password, database',
    );
  }

  const portStr = String(dbConfig.port || 5432);
  return `postgresql://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${portStr}/${dbConfig.database}`;
}
