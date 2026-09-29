import validationSchema from './validation.schema';

const baseEnvironment = {
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'password',
  DB_DATABASE: 'simco',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_ISSUER: 'simco',
  JWT_AUDIENCE: 'simco-users',
  FRONTEND_ORIGIN: 'http://localhost:3000',
  SIMCOMPANIES_EMAIL: 'player@example.com',
  SIMCOMPANIES_PASSWORD: 'password',
  SIMCOMPANIES_SESSION_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
};

describe('validationSchema', () => {
  it('allows Telegram to remain disabled without credentials', () => {
    const result = validationSchema.validate(baseEnvironment);

    expect(result.error).toBeUndefined();
    expect(result.value.TELEGRAM_BOT_ENABLED).toBe(false);
  });

  it('requires a token and authorized IDs when Telegram is enabled', () => {
    const result = validationSchema.validate({
      ...baseEnvironment,
      TELEGRAM_BOT_ENABLED: 'true',
    });

    expect(result.error?.message).toContain('TELEGRAM_BOT_TOKEN');
  });

  it('accepts a comma-separated list of numeric Telegram IDs', () => {
    const result = validationSchema.validate({
      ...baseEnvironment,
      TELEGRAM_BOT_ENABLED: 'true',
      TELEGRAM_BOT_TOKEN: 'bot-token',
      TELEGRAM_ALLOWED_USER_IDS: '123,456',
    });

    expect(result.error).toBeUndefined();
  });
});
