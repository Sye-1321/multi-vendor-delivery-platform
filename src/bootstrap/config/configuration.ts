const splitCommaSeparated = (value: string | undefined): string[] =>
  value
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];

export default () => ({
  app: {
    name: process.env.APP_NAME ?? 'multi-vendor-delivery-platform',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 4000),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    apiVersion: process.env.API_VERSION ?? 'v1',
    corsOrigins: splitCommaSeparated(
      process.env.CORS_ORIGINS ?? 'http://localhost:3000',
    ),
  },
  database: {
    uri: process.env.DATABASE_URL,
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
    directory: process.env.LOG_DIR ?? 'logs',
  },
});
