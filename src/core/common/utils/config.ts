import { registerAs } from '@nestjs/config';
import { envOrDefault } from './environment.util';

export default registerAs('config', () => {
  return {
    app: {
      nodeEnv: envOrDefault(process.env.NODE_ENV, 'dev'),
      name: 'QVAWIN API',
      version: '1.0',
    },
    database: {
      url: envOrDefault(process.env.DATABASE_URL, ''),
      host: envOrDefault(process.env.DB_HOST, '127.0.0.1'),
      port: parseInt(envOrDefault(process.env.DB_PORT, '5432'), 10),
      username: envOrDefault(process.env.DB_USERNAME, 'postgres'),
      password: envOrDefault(process.env.DB_PASSWORD, 'my_secret_password'),
      database: envOrDefault(process.env.DB_DATABASE, 'my_database'),
      ssl: process.env.DB_SSL === 'true',
    },
    redis: {
      host: envOrDefault(process.env.REDIS_HOST, 'localhost'),
      port: parseInt(envOrDefault(process.env.REDIS_PORT, '6379'), 10),
      password: envOrDefault(process.env.REDIS_PASSWORD, null),
      username: envOrDefault(process.env.REDIS_USERNAME, null),
      tls: process.env.REDIS_TLS === 'true',
      db: parseInt(envOrDefault(process.env.REDIS_DB, '0'), 10),
    },
    jwt: {
      accessTokenSecret: envOrDefault(process.env.JWT_ACCESS_SECRET, ''),
      accessTokenExpiresIn: envOrDefault(process.env.JWT_ACCESS_EXPIRES_IN, '15m'),
      issuer: envOrDefault(process.env.JWT_ISSUER, ''),
      audience: envOrDefault(process.env.JWT_AUDIENCE, ''),
    },
    auth: {
      frontendOrigin: envOrDefault(process.env.FRONTEND_ORIGIN, ''),
      refreshTokenTtlDays: parseInt(
        envOrDefault(process.env.AUTH_REFRESH_TOKEN_TTL_DAYS, '7'),
        10,
      ),
      cookieName: envOrDefault(process.env.AUTH_COOKIE_NAME, 'refresh_token'),
      cookieSameSite: envOrDefault(process.env.AUTH_COOKIE_SAME_SITE, 'lax') as
        'lax' | 'none',
      loginRateLimit: parseInt(
        envOrDefault(process.env.AUTH_LOGIN_RATE_LIMIT, '5'),
        10,
      ),
      loginRateLimitWindowSeconds: parseInt(
        envOrDefault(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS, '60'),
        10,
      ),
      refreshRateLimit: parseInt(
        envOrDefault(process.env.AUTH_REFRESH_RATE_LIMIT, '10'),
        10,
      ),
      refreshRateLimitWindowSeconds: parseInt(
        envOrDefault(process.env.AUTH_REFRESH_RATE_LIMIT_WINDOW_SECONDS, '60'),
        10,
      ),
    },
    simcompanies: {
      email: envOrDefault(process.env.SIMCOMPANIES_EMAIL, ''),
      password: envOrDefault(process.env.SIMCOMPANIES_PASSWORD, ''),
      timezoneOffset: parseInt(
        envOrDefault(process.env.SIMCOMPANIES_TIMEZONE_OFFSET, '0'),
        10,
      ),
      sessionEncryptionKey: envOrDefault(
        process.env.SIMCOMPANIES_SESSION_ENCRYPTION_KEY,
        '',
      ),
    },
    logs: {
      level: envOrDefault(process.env.LOG_LEVEL, 'log'),
      retentionDays: parseInt(envOrDefault(process.env.LOG_RETENTION_DAYS, '90'), 10),
      batchSize: parseInt(envOrDefault(process.env.LOG_BATCH_SIZE, '100'), 10),
      auditBatchSize: parseInt(
        envOrDefault(process.env.AUDIT_BATCH_SIZE, '50'),
        10,
      ),
      batchTimeoutMs: parseInt(
        envOrDefault(process.env.LOG_BATCH_TIMEOUT_MS, '5000'),
        10,
      ),
      bullQueueName: envOrDefault(process.env.BULL_QUEUE_NAME, 'logs'),
      bullMaxWorkers: parseInt(envOrDefault(process.env.BULL_MAX_WORKERS, '4'), 10),
    },
    mail: {
      host: envOrDefault(process.env.MAIL_HOST, 'localhost'),
      port: parseInt(envOrDefault(process.env.MAIL_PORT, '587'), 10),
      user: envOrDefault(process.env.MAIL_USER, 'default_user'),
      pass: envOrDefault(process.env.MAIL_PASS, 'default_pass'),
    },
    odds: {
      apiKey: process.env.ODDS_API_KEY,
      bookmakers: envOrDefault(process.env.ODDS_BOOKMAKERS, ''),
    },
  };
});
