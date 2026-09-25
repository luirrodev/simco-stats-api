import { createDatabaseConfig } from './data-source';

describe('database data source configuration', () => {
  const environmentKeys = [
    'DATABASE_URL',
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
  ] as const;
  const originalEnvironment = new Map(
    environmentKeys.map((key) => [key, process.env[key]]),
  );

  afterEach(() => {
    for (const key of environmentKeys) {
      const value = originalEnvironment.get(key);
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
    }
  });

  it('uses defaults for missing and empty database environment variables', () => {
    Reflect.deleteProperty(process.env, 'DATABASE_URL');
    process.env.DB_HOST = '';
    Reflect.deleteProperty(process.env, 'DB_PORT');

    const options = createDatabaseConfig();

    expect(options.host).toBe('127.0.0.1');
    expect(options.port).toBe(5432);
  });

  it('keeps explicit database environment values', () => {
    process.env.DB_HOST = 'database.internal';
    process.env.DB_PORT = '6543';

    const options = createDatabaseConfig();

    expect(options.host).toBe('database.internal');
    expect(options.port).toBe(6543);
  });
});
