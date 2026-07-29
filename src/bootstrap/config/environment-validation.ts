import * as Joi from 'joi';

const secret = Joi.string().min(32).required();

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  APP_NAME: Joi.string().trim().default('multi-vendor-delivery-platform'),
  PORT: Joi.number().port().default(4000),
  API_PREFIX: Joi.string()
    .trim()
    .pattern(/^[a-z0-9-]+$/)
    .default('api'),
  API_VERSION: Joi.string()
    .trim()
    .pattern(/^v[1-9]\d*$/)
    .default('v1'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required(),

  JWT_ACCESS_TOKEN_SECRET: secret,
  JWT_ACCESS_TOKEN_EXPIRATION_TIME: Joi.string().default('15m'),
  JWT_REFRESH_TOKEN_SECRET: secret,
  JWT_REFRESH_TOKEN_EXPIRATION_TIME: Joi.string().default('7d'),
  JWT_VERIFICATION_TOKEN_SECRET: secret,
  JWT_VERIFICATION_TOKEN_EXPIRATION_TIME: Joi.string().default('15m'),

  GUEST_EMAIL: Joi.string().email().default('guest@example.com'),
  SMTP_SERVICE: Joi.string().default('gmail'),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASSWORD: Joi.string().allow('').optional(),

  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
  LOG_DIR: Joi.string().trim().default('logs'),
});
