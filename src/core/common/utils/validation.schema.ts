import * as Joi from 'joi';

const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('dev', 'prod', 'stage').default('dev'),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SSL: Joi.string().valid('true', 'false').default('false'),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_PASSWORD: Joi.string().allow(null, ''),
  REDIS_USERNAME: Joi.string().allow(null, ''),
  REDIS_TLS: Joi.string().valid('true', 'false').default('false'),
  REDIS_DB: Joi.number().default(0),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
  JWT_ISSUER: Joi.string().required(),
  JWT_AUDIENCE: Joi.string().required(),
  FRONTEND_ORIGIN: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  AUTH_REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).max(30).default(7),
  AUTH_COOKIE_NAME: Joi.string()
    .pattern(/^[A-Za-z0-9_-]+$/)
    .default('refresh_token'),
  AUTH_COOKIE_SAME_SITE: Joi.string().valid('lax', 'none').default('lax'),
  AUTH_LOGIN_RATE_LIMIT: Joi.number().integer().min(1).default(5),
  AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS: Joi.number()
    .integer()
    .min(1)
    .default(60),
  AUTH_REFRESH_RATE_LIMIT: Joi.number().integer().min(1).default(10),
  AUTH_REFRESH_RATE_LIMIT_WINDOW_SECONDS: Joi.number()
    .integer()
    .min(1)
    .default(60),
  SIMCOMPANIES_EMAIL: Joi.string().email().required(),
  SIMCOMPANIES_PASSWORD: Joi.string().min(1).required(),
  SIMCOMPANIES_TIMEZONE_OFFSET: Joi.number().integer().default(0),
  SIMCOMPANIES_SESSION_ENCRYPTION_KEY: Joi.string()
    .base64()
    .required()
    .custom((value: unknown, helpers: Joi.CustomHelpers<string>) => {
      if (
        typeof value === 'string' &&
        Buffer.from(value, 'base64').length === 32
      ) {
        return value;
      }
      return helpers.error('any.invalid');
    })
    .messages({
      'any.invalid':
        'SIMCOMPANIES_SESSION_ENCRYPTION_KEY must be a base64-encoded 32-byte key',
    }),
});

export default validationSchema;
