import { ConfigType } from '@nestjs/config';
import config from '@core/common/utils/config';

/**
 * Construye la URL de conexión a Redis a partir de la configuración
 */
export default function buildRedisUrl(
  redisConfig: ConfigType<typeof config>['redis'],
): string {
  const { host, port, db, password, username, tls } = redisConfig;

  // Determinar el protocolo según TLS
  const protocol = tls ? 'rediss' : 'redis';

  // Construir la parte de autenticación
  let auth = '';
  if (username || password) {
    const encodedUsername = username ? encodeURIComponent(username) : '';
    const encodedPassword = password ? encodeURIComponent(password) : '';
    auth = `${encodedUsername}:${encodedPassword}@`;
  }

  // Construir la URL completa
  return `${protocol}://${auth}${host}:${port}/${db}`;
}
