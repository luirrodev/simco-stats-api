import config from './config';

describe('config', () => {
  const originalDbHost = process.env.DB_HOST;
  const originalRedisPassword = process.env.REDIS_PASSWORD;

  afterEach(() => {
    if (originalDbHost === undefined) delete process.env.DB_HOST;
    else process.env.DB_HOST = originalDbHost;

    if (originalRedisPassword === undefined) delete process.env.REDIS_PASSWORD;
    else process.env.REDIS_PASSWORD = originalRedisPassword;
  });

  it('uses defaults for missing and empty environment variables', () => {
    delete process.env.DB_HOST;
    process.env.REDIS_PASSWORD = '';

    const settings = config();

    expect(settings.database.host).toBe('127.0.0.1');
    expect(settings.redis.password).toBeNull();
  });

  it('keeps explicit environment values', () => {
    process.env.DB_HOST = 'database.internal';

    expect(config().database.host).toBe('database.internal');
  });
});
