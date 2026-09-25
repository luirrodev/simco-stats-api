import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  return {
    app: {
      nodeEnv: process.env.NODE_ENV || 'dev',
      name: 'QVAWIN API',
      version: '1.0',
    },
    database: {
      url: process.env.DATABASE_URL || '',
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'my_secret_password',
      database: process.env.DB_DATABASE || 'my_database',
      ssl: process.env.DB_SSL === 'true',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || null,
      username: process.env.REDIS_USERNAME || null,
      tls: process.env.REDIS_TLS === 'true',
      db: parseInt(process.env.REDIS_DB || '0', 10),
    },
    jwt: {
      accessTokenSecret: process.env.JWT_ACCESS_SECRET || '',
      accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      issuer: process.env.JWT_ISSUER || '',
      audience: process.env.JWT_AUDIENCE || '',
    },
    auth: {
      frontendOrigin: process.env.FRONTEND_ORIGIN || '',
      refreshTokenTtlDays: parseInt(
        process.env.AUTH_REFRESH_TOKEN_TTL_DAYS || '7',
        10,
      ),
      cookieName: process.env.AUTH_COOKIE_NAME || 'refresh_token',
      cookieSameSite: (process.env.AUTH_COOKIE_SAME_SITE || 'lax') as
        'lax' | 'none',
      loginRateLimit: parseInt(process.env.AUTH_LOGIN_RATE_LIMIT || '5', 10),
      loginRateLimitWindowSeconds: parseInt(
        process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS || '60',
        10,
      ),
      refreshRateLimit: parseInt(
        process.env.AUTH_REFRESH_RATE_LIMIT || '10',
        10,
      ),
      refreshRateLimitWindowSeconds: parseInt(
        process.env.AUTH_REFRESH_RATE_LIMIT_WINDOW_SECONDS || '60',
        10,
      ),
    },
    logs: {
      level: process.env.LOG_LEVEL || 'log',
      retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '90', 10),
      batchSize: parseInt(process.env.LOG_BATCH_SIZE || '100', 10),
      auditBatchSize: parseInt(process.env.AUDIT_BATCH_SIZE || '50', 10),
      batchTimeoutMs: parseInt(process.env.LOG_BATCH_TIMEOUT_MS || '5000', 10),
      bullQueueName: process.env.BULL_QUEUE_NAME || 'logs',
      bullMaxWorkers: parseInt(process.env.BULL_MAX_WORKERS || '4', 10),
    },
    mail: {
      host: process.env.MAIL_HOST || 'localhost',
      port: parseInt(process.env.MAIL_PORT || '587', 10),
      user: process.env.MAIL_USER || 'default_user',
      pass: process.env.MAIL_PASS || 'default_pass',
    },
    odds: {
      apiKey: process.env.ODDS_API_KEY,
      bookmakers: process.env.ODDS_BOOKMAKERS || '',
    },
  };
});
